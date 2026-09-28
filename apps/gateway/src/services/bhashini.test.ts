// Phase 9 — BHASHINI service tests.
//
// Unit tests below mock the HTTP boundary (globalThis.fetch) — they never
// call the real BHASHINI API and never require real credentials. The
// separate, clearly-labelled integration test at the bottom calls the REAL
// BHASHINI API and is automatically skipped unless real credentials are
// present in the environment (see docs/bhashini.md for how to run it for
// real).

import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../config/env.js';

const originalFetch = globalThis.fetch;
const originalEnv = { ...env.bhashini };

function restoreEnv() {
  Object.assign(env.bhashini, originalEnv);
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv();
});

test('translateText: missing credentials throws a clear configuration error, no network call', async () => {
  restoreEnv();
  env.bhashini.userId = '';
  env.bhashini.udyatKey = '';
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error('should not be called');
  }) as never;

  const { translateText, BhashiniConfigError } = await import('./bhashini.js');
  await assert.rejects(() => translateText({ text: 'hello', sourceLanguage: 'en', targetLanguage: 'hi' }), BhashiniConfigError);
  assert.equal(called, false);
});

test('translateText: successful response is normalized correctly', async () => {
  env.bhashini.userId = 'test-user';
  env.bhashini.udyatKey = 'test-udyat';
  env.bhashini.inferenceKey = 'test-inference';

  let call = 0;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    call++;
    if (call === 1) {
      // Pipeline config call
      return new Response(
        JSON.stringify({
          pipelineResponseConfig: [{ taskType: 'translation', config: [{ serviceId: 'svc-en-hi' }] }],
          pipelineInferenceAPIEndPoint: { callbackUrl: 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline', inferenceApiKey: { name: 'Authorization', value: 'dynamic-key' } },
        }),
        { status: 200 },
      );
    }
    // Pipeline compute call
    const body = JSON.parse(init.body as string);
    assert.equal(body.pipelineTasks[0].config.serviceId, 'svc-en-hi');
    return new Response(JSON.stringify({ pipelineResponse: [{ taskType: 'translation', output: [{ source: 'hello', target: 'नमस्ते' }] }] }), { status: 200 });
  }) as never;

  const { translateText } = await import('./bhashini.js');
  const result = await translateText({ text: 'hello', sourceLanguage: 'en', targetLanguage: 'hi' });
  assert.equal(result.translatedText, 'नमस्ते');
  assert.equal(result.provider, 'BHASHINI');
  assert.equal(result.success, true);
});

test('translateText: BHASHINI 401 becomes a clean upstream error', async () => {
  env.bhashini.userId = 'u';
  env.bhashini.udyatKey = 'k';
  env.bhashini.inferenceKey = 'ik';
  let call = 0;
  globalThis.fetch = (async () => {
    call++;
    if (call === 1) {
      return new Response(JSON.stringify({ pipelineResponseConfig: [{ taskType: 'translation', config: [{ serviceId: 's' }] }], pipelineInferenceAPIEndPoint: { callbackUrl: 'https://x', inferenceApiKey: { name: 'Authorization', value: 'v' } } }), { status: 200 });
    }
    return new Response('unauthorized', { status: 401 });
  }) as never;

  const { translateText, BhashiniUpstreamError } = await import('./bhashini.js');
  await assert.rejects(() => translateText({ text: 'hi', sourceLanguage: 'hi', targetLanguage: 'en' }), (err: unknown) => err instanceof BhashiniUpstreamError && err.status === 401);
});

test('translateText: BHASHINI 429 becomes a clean rate-limit error', async () => {
  env.bhashini.userId = 'u';
  env.bhashini.udyatKey = 'k';
  env.bhashini.inferenceKey = 'ik';
  let call = 0;
  globalThis.fetch = (async () => {
    call++;
    if (call === 1) {
      return new Response(JSON.stringify({ pipelineResponseConfig: [{ taskType: 'translation', config: [{ serviceId: 's' }] }], pipelineInferenceAPIEndPoint: { callbackUrl: 'https://x', inferenceApiKey: { name: 'Authorization', value: 'v' } } }), { status: 200 });
    }
    return new Response('too many requests', { status: 429 });
  }) as never;

  const { translateText, BhashiniUpstreamError } = await import('./bhashini.js');
  await assert.rejects(() => translateText({ text: 'hi', sourceLanguage: 'en', targetLanguage: 'ta' }), (err: unknown) => err instanceof BhashiniUpstreamError && err.status === 429);
});

test('translateText: a fetch abort becomes a timeout error', async () => {
  env.bhashini.userId = 'u';
  env.bhashini.udyatKey = 'k';
  env.bhashini.inferenceKey = 'ik';
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    return new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
  }) as never;

  const { translateText, BhashiniTimeoutError } = await import('./bhashini.js');
  await assert.rejects(() => translateText({ text: 'hi', sourceLanguage: 'en', targetLanguage: 'ta' }), BhashiniTimeoutError);
});

test('no credential ever appears in a thrown error message', async () => {
  env.bhashini.userId = 'real-user-id';
  env.bhashini.udyatKey = 'super-secret-udyat-key';
  env.bhashini.inferenceKey = 'super-secret-inference-key';
  globalThis.fetch = (async () => new Response('server error', { status: 500 })) as never;

  const { translateText } = await import('./bhashini.js');
  try {
    await translateText({ text: 'hi', sourceLanguage: 'en', targetLanguage: 'ta' });
    assert.fail('expected translateText to throw');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    assert.doesNotMatch(message, /super-secret-udyat-key|super-secret-inference-key/);
  }
});

// ---------------------------------------------------------------- procurement-logic isolation

test('bhashini service never imports Mongoose models — translation cannot touch ComplianceRule/ComplianceEvaluation/FinalBidDecision', async () => {
  const fs = await import('node:fs/promises');
  const src = await fs.readFile(new URL('./bhashini.ts', import.meta.url), 'utf8');
  const importLines = src.split('\n').filter((l) => /^\s*import /.test(l));
  for (const line of importLines) {
    assert.doesNotMatch(line, /models\//, `bhashini.ts must never import a Mongoose model: ${line}`);
  }
});

// ---------------------------------------------------------------- real integration test

test('REAL BHASHINI integration (skipped unless credentials are configured)', { skip: !process.env.BHASHINI_UDYAT_KEY || !process.env.BHASHINI_INFERENCE_KEY }, async () => {
  globalThis.fetch = originalFetch;
  const { translateText } = await import('./bhashini.js');
  const result = await translateText({ text: 'Average annual turnover must be at least ₹50 lakh.', sourceLanguage: 'en', targetLanguage: 'ta' });
  assert.equal(result.provider, 'BHASHINI');
  assert.ok(result.translatedText.length > 0);
  assert.equal(result.sourceLanguage, 'en');
  assert.equal(result.targetLanguage, 'ta');
});
