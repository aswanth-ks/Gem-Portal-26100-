// Phase 9 — request validation tests for POST /api/language/translate.
// Pure schema tests, no server, no network.

import test from 'node:test';
import assert from 'node:assert/strict';
import { translateSchema } from './language.routes.js';

test('translate validation: empty text is rejected', () => {
  const result = translateSchema.safeParse({ text: '', sourceLanguage: 'en', targetLanguage: 'hi' });
  assert.equal(result.success, false);
});

test('translate validation: text over the max length is rejected', () => {
  const result = translateSchema.safeParse({ text: 'a'.repeat(1001), sourceLanguage: 'en', targetLanguage: 'hi' });
  assert.equal(result.success, false);
});

test('translate validation: an unsupported language is rejected', () => {
  const result = translateSchema.safeParse({ text: 'hello', sourceLanguage: 'en', targetLanguage: 'fr' });
  assert.equal(result.success, false);
});

test('translate validation: a valid request passes', () => {
  const result = translateSchema.safeParse({ text: 'Average annual turnover must be at least ₹50 lakh.', sourceLanguage: 'en', targetLanguage: 'ta' });
  assert.equal(result.success, true);
});
