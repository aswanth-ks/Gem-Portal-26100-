// Phase 8 — integration tests for FinalBidDecision persistence semantics.
// Same convention as OfficerAssessment.test.ts: connects to the real
// configured MongoDB, cleans up everything it creates.

import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { FinalBidDecision } from './FinalBidDecision.js';
import { ComplianceEvaluation } from './ComplianceEvaluation.js';
import { OfficerAssessment } from './OfficerAssessment.js';

const bidId = new mongoose.Types.ObjectId();
const tenderId = new mongoose.Types.ObjectId();
const requirementId = new mongoose.Types.ObjectId();
const ruleId = new mongoose.Types.ObjectId();

test.before(async () => {
  await mongoose.connect(env.mongoUri, { dbName: env.mongoDbName });
});

test.after(async () => {
  await FinalBidDecision.deleteMany({ bidId });
  await ComplianceEvaluation.deleteMany({ bidId });
  await OfficerAssessment.deleteMany({ bidId });
  await mongoose.disconnect();
});

test('FinalBidDecision: create persists decision/comment/reason', async () => {
  const saved = await FinalBidDecision.create({ bidId, tenderId, decision: 'REVIEW', comment: 'Pending clarification.' });
  assert.equal(saved.decision, 'REVIEW');
  assert.equal(saved.comment, 'Pending clarification.');
  await FinalBidDecision.deleteMany({ bidId });
});

test('FinalBidDecision: unique on bidId — a second create for the same bid is rejected', async () => {
  await FinalBidDecision.create({ bidId, tenderId, decision: 'REVIEW' });
  await assert.rejects(() => FinalBidDecision.create({ bidId, tenderId, decision: 'ACCEPTED' }));
  await FinalBidDecision.deleteMany({ bidId });
});

test('FinalBidDecision: upsert updates the single current decision in place', async () => {
  await FinalBidDecision.findOneAndUpdate({ bidId }, { bidId, tenderId, decision: 'REVIEW', comment: 'first pass' }, { upsert: true });
  await FinalBidDecision.findOneAndUpdate({ bidId }, { bidId, tenderId, decision: 'REJECTED', reason: 'Turnover below threshold.' }, { upsert: true });

  const rows = await FinalBidDecision.find({ bidId });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].decision, 'REJECTED');
  assert.equal(rows[0].reason, 'Turnover below threshold.');
  await FinalBidDecision.deleteMany({ bidId });
});

test('FinalBidDecision: rejects an unsupported decision value', async () => {
  await assert.rejects(() => FinalBidDecision.create({ bidId, tenderId, decision: 'MAYBE' as never }));
});

test('FinalBidDecision save never touches ComplianceEvaluation or OfficerAssessment', async () => {
  await ComplianceEvaluation.create({ bidId, tenderId, requirementId, ruleId, result: 'FAIL', reason: 'r', evaluatedAt: new Date(), evaluatorVersion: '1.0' });
  await OfficerAssessment.create({ bidId, tenderId, requirementId, assessment: 'NEEDS_REVIEW', comment: 'c' });

  await FinalBidDecision.findOneAndUpdate({ bidId }, { bidId, tenderId, decision: 'ACCEPTED', comment: 'Overriding officer judgment call.' }, { upsert: true });

  const evaluation = await ComplianceEvaluation.findOne({ bidId, requirementId });
  const assessment = await OfficerAssessment.findOne({ bidId, requirementId });
  assert.equal(evaluation?.result, 'FAIL');
  assert.equal(assessment?.assessment, 'NEEDS_REVIEW');

  await FinalBidDecision.deleteMany({ bidId });
  await ComplianceEvaluation.deleteMany({ bidId });
  await OfficerAssessment.deleteMany({ bidId });
});
