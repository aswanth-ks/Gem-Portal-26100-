// Phase 6 — unit tests for the deterministic compliance evaluator.
// Run with: npx tsx --test src/services/complianceEvaluator.test.ts
//
// These tests use plain in-memory fixtures — no MongoDB, no HTTP, no AI
// service. Critically, this file (and the module it tests) must never import
// anything from apps/ai's provider/Gemini/Ollama code, proving the evaluator
// is pure rule logic that works with the AI service completely offline.

import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRule, type DocumentInput, type EvidenceInput, type RuleInput } from './complianceEvaluator.js';

function ev(overrides: Partial<EvidenceInput>): EvidenceInput {
  return { _id: 'e1', documentId: 'd1', field: 'x', value: '1', normalizedValue: 1, status: 'extracted', ...overrides };
}
function doc(overrides: Partial<DocumentInput>): DocumentInput {
  return { _id: 'd1', requirementId: 'r1', processingStatus: 'completed', ...overrides };
}
function rule(overrides: Partial<RuleInput>): RuleInput {
  return { _id: 'rule1', type: 'numeric_threshold', field: 'x', operator: '>=', value: 10, parameters: {}, ...overrides };
}

// ---------------------------------------------------------------- numeric_threshold

test('numeric_threshold: PASS when value meets threshold', () => {
  const r = evaluateRule(rule({ field: 'average_annual_turnover', value: 5000000, operator: '>=' }), [ev({ field: 'average_annual_turnover', normalizedValue: 6000000 })], [], null);
  assert.equal(r.result, 'PASS');
});

test('numeric_threshold: FAIL when value misses threshold', () => {
  const r = evaluateRule(rule({ field: 'average_annual_turnover', value: 5000000, operator: '>=' }), [ev({ field: 'average_annual_turnover', normalizedValue: 4000000 })], [], null);
  assert.equal(r.result, 'FAIL');
});

test('numeric_threshold: REVIEW when no evidence exists', () => {
  const r = evaluateRule(rule({ field: 'average_annual_turnover' }), [], [], null);
  assert.equal(r.result, 'REVIEW');
});

test('numeric_threshold: REVIEW on conflicting evidence for the same field', () => {
  const r = evaluateRule(rule({ field: 'average_annual_turnover', value: 5000000 }), [ev({ _id: 'e1', field: 'average_annual_turnover', normalizedValue: 5500000 }), ev({ _id: 'e2', field: 'average_annual_turnover', normalizedValue: 3500000 })], [], null);
  assert.equal(r.result, 'REVIEW');
  assert.ok(r.evidenceIds.includes('e1') && r.evidenceIds.includes('e2'));
});

test('numeric_threshold: REVIEW when matched evidence is ambiguous (review_required)', () => {
  const r = evaluateRule(rule({ field: 'average_annual_turnover', value: 5000000 }), [ev({ field: 'average_annual_turnover', normalizedValue: 6000000, status: 'review_required' })], [], null);
  assert.equal(r.result, 'REVIEW');
});

// CPCL real-shape acceptance case — average across FY-suffixed fields via
// fieldMatch/aggregate parameters (no hardcoded CPCL values in the engine).
test('numeric_threshold: CPCL turnover — average of 42L/55L/61L against >=50L is PASS', () => {
  const r = evaluateRule(
    rule({ field: 'average_annual_turnover', operator: '>=', value: 5000000, parameters: { aggregate: 'average', fieldMatch: 'turnover' } }),
    [
      ev({ _id: 'e1', field: 'FY2023-24_turnover', normalizedValue: 4200000 }),
      ev({ _id: 'e2', field: 'FY2024-25_turnover', normalizedValue: 5500000 }),
      ev({ _id: 'e3', field: 'FY2025-26_turnover', normalizedValue: 6100000 }),
    ],
    [],
    null,
  );
  assert.equal(r.result, 'PASS');
  assert.match(r.reason, /52.*66/); // average = 5266666.67
});

// ---------------------------------------------------------------- date_validity

test('date_validity: PASS when expiry is on/after the bid date', () => {
  const r = evaluateRule(rule({ type: 'date_validity', field: 'expiry_date', operator: '>=' }), [ev({ field: 'expiry_date', value: '10-Jun-2027', normalizedValue: null })], [], new Date('2026-10-01'));
  assert.equal(r.result, 'PASS');
});

test('date_validity: FAIL when expiry is before the bid date (CPCL OEM case)', () => {
  const r = evaluateRule(rule({ type: 'date_validity', field: 'expiry_date' }), [ev({ field: 'expiry_date', value: '10-Jun-2026', normalizedValue: null })], [], new Date('2026-10-01'));
  assert.equal(r.result, 'FAIL');
  assert.match(r.reason, /expired/);
});

test('date_validity: REVIEW when expiry evidence is missing', () => {
  const r = evaluateRule(rule({ type: 'date_validity', field: 'expiry_date' }), [], [], new Date('2026-10-01'));
  assert.equal(r.result, 'REVIEW');
});

test('date_validity: REVIEW when the date text cannot be parsed', () => {
  const r = evaluateRule(rule({ type: 'date_validity', field: 'expiry_date' }), [ev({ field: 'expiry_date', value: 'sometime next year', normalizedValue: null })], [], new Date('2026-10-01'));
  assert.equal(r.result, 'REVIEW');
});

// ---------------------------------------------------------------- required_document

test('required_document: PASS when a document was processed with evidence', () => {
  const r = evaluateRule(rule({ type: 'required_document', field: 'pan' }), [ev({ field: 'pan_number' })], [doc({ processingStatus: 'completed' })], null);
  assert.equal(r.result, 'PASS');
});

test('required_document: FAIL when no document exists at all', () => {
  const r = evaluateRule(rule({ type: 'required_document', field: 'pan' }), [], [], null);
  assert.equal(r.result, 'FAIL');
});

test('required_document: REVIEW when processing failed', () => {
  const r = evaluateRule(rule({ type: 'required_document', field: 'pan' }), [], [doc({ processingStatus: 'failed' })], null);
  assert.equal(r.result, 'REVIEW');
});

test('required_document: REVIEW when still processing', () => {
  const r = evaluateRule(rule({ type: 'required_document', field: 'pan' }), [], [doc({ processingStatus: 'processing' })], null);
  assert.equal(r.result, 'REVIEW');
});

// ---------------------------------------------------------------- experience_threshold

const BID_DATE = new Date('2026-10-01');
function project(n: number, client: string, value: number, completionDate: string, status: EvidenceInput['status'] = 'extracted'): EvidenceInput[] {
  return [
    ev({ _id: `${n}-client`, field: `project${n}_client`, value: client, normalizedValue: null, status }),
    ev({ _id: `${n}-value`, field: `project${n}_contractValue`, value: String(value), normalizedValue: value, status }),
    ev({ _id: `${n}-date`, field: `project${n}_completionDate`, value: completionDate, normalizedValue: null, status }),
  ];
}

test('experience_threshold: PASS with 3 clean qualifying projects', () => {
  const evidence = [...project(1, 'Client A', 5820000, '30-Jun-2022'), ...project(2, 'Client B', 3150000, '20-Aug-2023'), ...project(3, 'Client C', 3000000, '01-Jan-2024')];
  const r = evaluateRule(rule({ type: 'experience_threshold', field: 'experience', parameters: { minProjects: 3, minProjectValue: 2500000, withinYears: 5 } }), evidence, [], BID_DATE);
  assert.equal(r.result, 'PASS');
});

test('experience_threshold: FAIL when clearly fewer projects than required and no ambiguity', () => {
  const evidence = [...project(1, 'Client A', 5820000, '30-Jun-2022')];
  const r = evaluateRule(rule({ type: 'experience_threshold', field: 'experience', parameters: { minProjects: 3, minProjectValue: 2500000, withinYears: 5 } }), evidence, [], BID_DATE);
  assert.equal(r.result, 'FAIL');
});

test('experience_threshold: REVIEW on the real CPCL case — 2 confirmed + 1 ambiguous project', () => {
  const evidence = [
    ...project(1, 'Chennai Metro Rail Limited', 5820000, '30-Jun-2022'),
    ...project(2, 'Ennore Port Trust', 3150000, '20-Aug-2023'),
    ev({ _id: '3-client', field: 'project3_client', value: '', normalizedValue: null, status: 'review_required' }),
    ev({ _id: '3-value', field: 'project3_contractValue', value: 'approx. Rs 20 lakh (exact figure not stated)', normalizedValue: null, status: 'review_required' }),
    ev({ _id: '3-date', field: 'project3_completionDate', value: '', normalizedValue: null, status: 'review_required' }),
  ];
  const r = evaluateRule(rule({ type: 'experience_threshold', field: 'experience', parameters: { minProjects: 3, minProjectValue: 2500000, withinYears: 5 } }), evidence, [], BID_DATE);
  assert.equal(r.result, 'REVIEW');
});

// ---------------------------------------------------------------- no-LLM property

test('evaluator module has no AI/Gemini/Ollama import or network call', async () => {
  const fs = await import('node:fs/promises');
  const src = await fs.readFile(new URL('./complianceEvaluator.ts', import.meta.url), 'utf8');
  const importLines = src.split('\n').filter((l) => /^\s*import /.test(l));
  for (const line of importLines) {
    assert.doesNotMatch(line, /gemini|ollama|ai-provider|apps\/ai/i, `unexpected AI-related import: ${line}`);
  }
  assert.doesNotMatch(src, /\bfetch\(/, 'evaluator must never make a network call');
});
