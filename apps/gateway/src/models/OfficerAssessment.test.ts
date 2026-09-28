// Phase 7 — integration tests for OfficerAssessment persistence semantics.
// This project has no mocking/in-memory-DB infrastructure yet (the AI
// service's pytest suite mocks the LLM call, but nothing here mocks Mongoose)
// — these tests connect to the real configured MongoDB, exactly like every
// other real-data verification done throughout this project, and clean up
// everything they create in an `after` hook.

import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { OfficerAssessment } from './OfficerAssessment.js';
import { ComplianceEvaluation } from './ComplianceEvaluation.js';

const bidId = new mongoose.Types.ObjectId();
const tenderId = new mongoose.Types.ObjectId();
const requirementId = new mongoose.Types.ObjectId();
const ruleId = new mongoose.Types.ObjectId();

test.before(async () => {
  await mongoose.connect(env.mongoUri, { dbName: env.mongoDbName });
});

test.after(async () => {
  await OfficerAssessment.deleteMany({ bidId });
  await ComplianceEvaluation.deleteMany({ bidId });
  await mongoose.disconnect();
});

test('OfficerAssessment: create persists all required fields', async () => {
  const saved = await OfficerAssessment.create({ bidId, tenderId, requirementId, assessment: 'NEEDS_REVIEW', comment: 'Awaiting clarification.', officerId: 'officer' });
  assert.equal(saved.assessment, 'NEEDS_REVIEW');
  assert.equal(saved.comment, 'Awaiting clarification.');
  assert.ok(saved.createdAt);
  await OfficerAssessment.deleteMany({ bidId });
});

test('OfficerAssessment: upsert on (bidId, requirementId) updates in place, never duplicates', async () => {
  await OfficerAssessment.findOneAndUpdate({ bidId, requirementId }, { bidId, tenderId, requirementId, assessment: 'NEEDS_REVIEW', comment: 'first pass' }, { upsert: true });
  await OfficerAssessment.findOneAndUpdate({ bidId, requirementId }, { bidId, tenderId, requirementId, assessment: 'ACCEPTED', comment: 'resolved after clarification' }, { upsert: true });

  const rows = await OfficerAssessment.find({ bidId, requirementId });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].assessment, 'ACCEPTED');
  assert.equal(rows[0].comment, 'resolved after clarification');
  await OfficerAssessment.deleteMany({ bidId });
});

test('OfficerAssessment: unique index rejects a duplicate (bidId, requirementId) direct insert', async () => {
  await OfficerAssessment.create({ bidId, tenderId, requirementId, assessment: 'ACCEPTED' });
  await assert.rejects(() => OfficerAssessment.create({ bidId, tenderId, requirementId, assessment: 'NOT_ACCEPTED' }));
  await OfficerAssessment.deleteMany({ bidId });
});

test('OfficerAssessment: rejects an unsupported assessment value', async () => {
  await assert.rejects(() => OfficerAssessment.create({ bidId, tenderId, requirementId, assessment: 'MAYBE' as never }));
});

test('OfficerAssessment save never touches ComplianceEvaluation', async () => {
  await ComplianceEvaluation.create({
    bidId,
    tenderId,
    requirementId,
    ruleId,
    result: 'FAIL',
    reason: 'Authorization expired.',
    finding: 'expiry_date = 10-Jun-2026',
    evaluatedAt: new Date(),
    evaluatorVersion: '1.0',
  });

  await OfficerAssessment.findOneAndUpdate({ bidId, requirementId }, { bidId, tenderId, requirementId, assessment: 'NEEDS_REVIEW', comment: 'Officer disagrees, pending clarification.' }, { upsert: true });

  const evaluation = await ComplianceEvaluation.findOne({ bidId, requirementId });
  assert.equal(evaluation?.result, 'FAIL'); // untouched by the officer assessment write
  assert.equal(evaluation?.reason, 'Authorization expired.');

  await OfficerAssessment.deleteMany({ bidId });
  await ComplianceEvaluation.deleteMany({ bidId });
});

test('re-evaluation upsert of ComplianceEvaluation does not delete an existing OfficerAssessment', async () => {
  await OfficerAssessment.create({ bidId, tenderId, requirementId, assessment: 'NEEDS_REVIEW', comment: 'first review' });
  await ComplianceEvaluation.findOneAndUpdate({ bidId, requirementId }, { bidId, tenderId, requirementId, ruleId, result: 'FAIL', reason: 'r1', evaluatedAt: new Date(), evaluatorVersion: '1.0' }, { upsert: true });
  // Simulate a re-run producing a different deterministic result.
  await ComplianceEvaluation.findOneAndUpdate({ bidId, requirementId }, { bidId, tenderId, requirementId, ruleId, result: 'PASS', reason: 'r2', evaluatedAt: new Date(), evaluatorVersion: '1.0' }, { upsert: true });

  const assessment = await OfficerAssessment.findOne({ bidId, requirementId });
  assert.ok(assessment, 'officer assessment must survive a re-evaluation');
  assert.equal(assessment?.assessment, 'NEEDS_REVIEW');
  assert.equal(assessment?.comment, 'first review');

  await OfficerAssessment.deleteMany({ bidId });
  await ComplianceEvaluation.deleteMany({ bidId });
});
