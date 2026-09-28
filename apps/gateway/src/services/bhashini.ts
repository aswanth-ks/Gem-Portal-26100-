// Phase 9 — real BHASHINI Setu/ULCA translation client. This calls the
// actual documented two-step BHASHINI API (Pipeline Config, then Pipeline
// Compute) — see apps/gateway/docs/bhashini.md for the full contract and
// https://bhashini.gitbook.io/bhashini-apis for the official source. There
// is no mock/fallback translation anywhere in this module: if BHASHINI is
// unreachable or misconfigured, this throws a typed error and the caller
// (routes/language.routes.ts) turns that into an honest failure response —
// it never fabricates translated text.
//
// This module never imports the Gemini/Ollama AI-provider code and BHASHINI
// never sees compliance rules, evidence, or bid data — it only ever
// translates whatever short display text a route explicitly passes in.

import { env } from '../config/env.js';

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'ta'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const MAX_TRANSLATE_TEXT_LENGTH = 1000;

export class BhashiniConfigError extends Error {}
export class BhashiniUpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export class BhashiniTimeoutError extends Error {}

export interface TranslateInput {
  text: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
}

export interface TranslateResult {
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  sourceText: string;
  translatedText: string;
  provider: 'BHASHINI';
  success: true;
}

interface PipelineConfig {
  serviceId: string;
  callbackUrl: string;
  authHeaderName: string;
  authHeaderValue: string;
}

// Config responses are keyed only by language pair and don't change between
// calls for a fixed pipeline — a short in-memory cache avoids hitting the
// config endpoint on every single translation request. Not persisted, not
// shared across processes; just a small performance/politeness measure.
const configCache = new Map<string, { config: PipelineConfig; expiresAt: number }>();
const CONFIG_CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new BhashiniTimeoutError('BHASHINI request timed out.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function getPipelineConfig(sourceLanguage: SupportedLanguage, targetLanguage: SupportedLanguage): Promise<PipelineConfig> {
  if (!env.bhashini.udyatKey) {
    throw new BhashiniConfigError('BHASHINI is not configured: BHASHINI_UDYAT_KEY must be set.');
  }

  const cacheKey = `${sourceLanguage}:${targetLanguage}`;
  const cached = configCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.config;

  const headers: Record<string, string> = { 'Content-Type': 'application/json', ulcaApiKey: env.bhashini.udyatKey };
  if (env.bhashini.userId) headers.userID = env.bhashini.userId;

  const res = await fetchWithTimeout(
    env.bhashini.configUrl,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        pipelineTasks: [{ taskType: 'translation', config: { language: { sourceLanguage, targetLanguage } } }],
        pipelineRequestConfig: { pipelineId: env.bhashini.pipelineId },
      }),
    },
    10_000,
  );

  if (!res.ok) {
    // The upstream body here is BHASHINI's own error message, not our
    // secret — safe to log server-side for diagnosis (still never returned
    // to the client, see language.routes.ts).
    const bodyText = await res.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.error(`[bhashini] pipeline config ${res.status}:`, bodyText.slice(0, 500));
    throw new BhashiniUpstreamError(`BHASHINI pipeline config request failed (${res.status}).`, res.status);
  }

  const body = (await res.json().catch(() => null)) as
    | { pipelineResponseConfig?: Array<{ taskType: string; config?: Array<{ serviceId: string }> }>; pipelineInferenceAPIEndPoint?: { callbackUrl: string; inferenceApiKey?: { name: string; value: string } } }
    | null;

  const serviceId = body?.pipelineResponseConfig?.find((c) => c.taskType === 'translation')?.config?.[0]?.serviceId;
  if (!serviceId) {
    // eslint-disable-next-line no-console
    console.error('[bhashini] pipeline config response had no translation serviceId:', JSON.stringify(body).slice(0, 800));
    throw new BhashiniUpstreamError('BHASHINI pipeline config response did not include a translation service for this language pair.', 502);
  }

  // Some account/pipeline configurations omit pipelineInferenceAPIEndPoint
  // from the config response entirely (observed live) — when that happens,
  // fall back to the publicly documented Dhruva inference endpoint, which is
  // the same fixed URL the endpoint block would otherwise have supplied.
  // A statically issued inference key (from the dashboard) takes precedence
  // when configured; otherwise use the dynamic one the config call returned.
  const callbackUrl = body?.pipelineInferenceAPIEndPoint?.callbackUrl || 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
  const authHeaderName = body?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.name || 'Authorization';
  const authHeaderValue = env.bhashini.inferenceKey || body?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value || '';
  if (!authHeaderValue) {
    throw new BhashiniConfigError('BHASHINI is not configured: no inference key available (set BHASHINI_INFERENCE_KEY).');
  }

  const config: PipelineConfig = { serviceId, callbackUrl, authHeaderName, authHeaderValue };
  configCache.set(cacheKey, { config, expiresAt: Date.now() + CONFIG_CACHE_TTL_MS });
  return config;
}

export async function translateText(input: TranslateInput): Promise<TranslateResult> {
  const config = await getPipelineConfig(input.sourceLanguage, input.targetLanguage);

  const res = await fetchWithTimeout(
    config.callbackUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [config.authHeaderName]: config.authHeaderValue },
      body: JSON.stringify({
        pipelineTasks: [{ taskType: 'translation', config: { language: { sourceLanguage: input.sourceLanguage, targetLanguage: input.targetLanguage }, serviceId: config.serviceId } }],
        inputData: { input: [{ source: input.text }] },
      }),
    },
    15_000,
  );

  if (res.status === 429) throw new BhashiniUpstreamError('BHASHINI rate limit exceeded.', 429);
  if (res.status === 401 || res.status === 403) throw new BhashiniUpstreamError('BHASHINI rejected the configured credentials.', res.status);
  if (!res.ok) throw new BhashiniUpstreamError(`BHASHINI translation request failed (${res.status}).`, res.status);

  const body = (await res.json().catch(() => null)) as { pipelineResponse?: Array<{ taskType: string; output?: Array<{ source: string; target: string }> }> } | null;
  const translated = body?.pipelineResponse?.find((r) => r.taskType === 'translation')?.output?.[0]?.target;
  if (!translated) throw new BhashiniUpstreamError('BHASHINI returned an empty translation.', 502);

  return { sourceLanguage: input.sourceLanguage, targetLanguage: input.targetLanguage, sourceText: input.text, translatedText: translated, provider: 'BHASHINI', success: true };
}
