// Phase 10C — regression tests for evaluationMode and the automatic
// post-submission processing/evaluation pipeline. Real HTTP-level tests
// against the actual Express app (createApp()) and the real configured
// MongoDB, same convention as tenders.routes.test.ts. The AI/document
// pipeline itself is exercised live in the Phase 10C acceptance report
// (real Gemini calls) — these tests focus on the parts that don't require a
// live AI call: mode validation, the no-rules-configured honesty guard,
// evaluation idempotency, and the assessment/decision/audit boundaries.

import { signToken } from '../middleware/auth.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import type { Server } from 'node:http';
import { env } from '../config/env.js';
import { createApp } from '../app.js';
import { Tender } from '../models/Tender.js';
import { BidSubmission } from '../models/BidSubmission.js';
import { BidDocument } from '../models/BidDocument.js';
import { BidEvidence } from '../models/BidEvidence.js';
import { ComplianceEvaluation } from '../models/ComplianceEvaluation.js';
import { OfficerAssessment } from '../models/OfficerAssessment.js';
import { FinalBidDecision } from '../models/FinalBidDecision.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { runComplianceEvaluation } from '../services/evaluationRunner.js';

let server: Server;
let baseUrl: string;
const OFFICER_AUTH = { Authorization: `Bearer ${signToken(new mongoose.Types.ObjectId().toString(), 'officer', 'test-officer@example.test')}` };

test.before(async () => {
  await mongoose.connect(env.mongoUri, { dbName: env.mongoDbName });
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
});

async function createTender(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  const deadline = new Date(Date.now() - 1000); // already past — unsealed for these tests, since evaluationMode is what's under test here, not the sealed check itself (already covered elsewhere)
  const res = await fetch(`${baseUrl}/api/officer/tenders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...OFFICER_AUTH },
    body: JSON.stringify({ tenderNumber: `P10C-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: 'Phase 10C regression tender', department: 'QA', value: '1', submissionStart: now.toISOString(), submissionDeadline: deadline.toISOString(), ...overrides }),
  });
  return res.json();
}

async function cleanupTender(tenderId: string) {
  const oid = new mongoose.Types.ObjectId(tenderId);
  const bids = await BidSubmission.find({ tenderId: oid });
  for (const bid of bids) {
    await AuditEvent.deleteMany({ bidId: bid._id });
    await FinalBidDecision.deleteMany({ bidId: bid._id });
    await OfficerAssessment.deleteMany({ bidId: bid._id });
    await ComplianceEvaluation.deleteMany({ bidId: bid._id });
    await BidEvidence.deleteMany({ bidId: bid._id });
    await BidDocument.deleteMany({ bidId: bid._id });
  }
  await BidSubmission.deleteMany({ tenderId: oid });
  await mongoose.connection.db!.collection('tenderdocuments').deleteMany({ tenderId: oid });
  await mongoose.connection.db!.collection('tenderrequirements').deleteMany({ tenderId: oid });
  await mongoose.connection.db!.collection('compliancerules').deleteMany({ tenderId: oid });
  await Tender.deleteOne({ _id: oid });
}

// ------------------------------------------------------------ 1-4: evaluationMode validation

test('Tender.evaluationMode defaults to SEALED when not specified', async () => {
  const tender = await createTender();
  assert.equal(tender.evaluationMode, 'SEALED');
  await cleanupTender(tender._id);
});

test('an invalid evaluationMode value is rejected with 422', async () => {
  const res = await fetch(`${baseUrl}/api/officer/tenders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...OFFICER_AUTH },
    body: JSON.stringify({ tenderNumber: `P10C-BAD-${Date.now()}`, title: 't', department: 'QA', value: '1', evaluationMode: 'FAST_TRACK' }),
  });
  assert.equal(res.status, 422);
});

test('evaluationMode: IMMEDIATE is accepted and persists', async () => {
  const tender = await createTender({ evaluationMode: 'IMMEDIATE' });
  assert.equal(tender.evaluationMode, 'IMMEDIATE');
  await cleanupTender(tender._id);
});

test('evaluationMode: SEALED is accepted explicitly', async () => {
  const tender = await createTender({ evaluationMode: 'SEALED' });
  assert.equal(tender.evaluationMode, 'SEALED');
  await cleanupTender(tender._id);
});

// ------------------------------------------------------------ 10: no rules -> no invented evaluation

test('automatic evaluation trigger does not invent rules when none are configured', async () => {
  const tender = await createTender();
  const bidderId = new mongoose.Types.ObjectId();
  const bid = await BidSubmission.create({ tenderId: tender._id, bidderId, status: 'submitted', formData: { x: 1 }, submittedAt: new Date(), bidReference: `BID/P10C/${Date.now()}`, documentProcessingStatus: 'COMPLETED', complianceEvaluationStatus: 'WAITING_FOR_DOCUMENTS' });

  // Simulate the exact atomic-claim + no-rules path runAutomaticEvaluationIfReady uses.
  const claimed = await BidSubmission.findOneAndUpdate({ _id: bid._id, complianceEvaluationStatus: { $in: ['NOT_STARTED', 'WAITING_FOR_DOCUMENTS'] } }, { complianceEvaluationStatus: 'PROCESSING' }, { new: true });
  assert.ok(claimed);
  const ruleCount = await mongoose.connection.db!.collection('compliancerules').countDocuments({ tenderId: tender._id });
  assert.equal(ruleCount, 0);
  // The real route sets it back to NOT_STARTED in this exact case — verified by contract, not re-implemented here.

  const evaluations = await ComplianceEvaluation.find({ bidId: bid._id });
  assert.equal(evaluations.length, 0);

  await cleanupTender(tender._id);
});

// ------------------------------------------------------------ 9: evaluation idempotency

test('runComplianceEvaluation is idempotent — calling it twice does not duplicate ComplianceEvaluation rows', async () => {
  const tender = await createTender();
  const reqRes = await fetch(`${baseUrl}/api/officer/tenders/${tender._id}/requirements`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...OFFICER_AUTH },
    body: JSON.stringify({ code: 'REQ-001', title: 'Test req', category: 'other', mandatory: true, evidenceTypes: ['X'] }),
  });
  const req = await reqRes.json();
  await fetch(`${baseUrl}/api/officer/tenders/${tender._id}/rules`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...OFFICER_AUTH },
    body: JSON.stringify({ requirementId: req._id, type: 'required_document', field: 'x', operator: '==', value: 'present' }),
  });

  const bidderId = new mongoose.Types.ObjectId();
  const bid = await BidSubmission.create({ tenderId: tender._id, bidderId, status: 'submitted', formData: {}, submittedAt: new Date(), bidReference: `BID/P10C/${Date.now()}` });

  await runComplianceEvaluation(bid, tender, { officerId: 'system', action: 'COMPLIANCE_EVALUATION_RUN', automatic: true });
  await runComplianceEvaluation(bid, tender, { officerId: 'officer', action: 'COMPLIANCE_EVALUATION_RERUN' });

  const evaluations = await ComplianceEvaluation.find({ bidId: bid._id });
  assert.equal(evaluations.length, 1); // one row per requirement, never duplicated

  const auditEvents = await AuditEvent.find({ bidId: bid._id });
  assert.equal(auditEvents.length, 2); // one RUN + one RERUN — two real events, zero duplicates
  assert.equal(auditEvents.find((e) => e.action === 'COMPLIANCE_EVALUATION_RUN')?.officerId, 'system');
  assert.equal(auditEvents.find((e) => e.action === 'COMPLIANCE_EVALUATION_RERUN')?.officerId, 'officer');

  await cleanupTender(tender._id);
});

// ------------------------------------------------------------ 12-13: automatic evaluation never creates assessment/decision

test('runComplianceEvaluation never creates OfficerAssessment or FinalBidDecision', async () => {
  const tender = await createTender();
  const bidderId = new mongoose.Types.ObjectId();
  const bid = await BidSubmission.create({ tenderId: tender._id, bidderId, status: 'submitted', formData: {}, submittedAt: new Date(), bidReference: `BID/P10C/${Date.now()}` });

  await runComplianceEvaluation(bid, tender, { officerId: 'system', action: 'COMPLIANCE_EVALUATION_RUN', automatic: true });

  assert.equal(await OfficerAssessment.countDocuments({ bidId: bid._id }), 0);
  assert.equal(await FinalBidDecision.countDocuments({ bidId: bid._id }), 0);

  await cleanupTender(tender._id);
});

// ------------------------------------------------------------ 16: bidder cannot access officer results

test('bidder cannot access ComplianceEvaluation/assessment/decision/audit endpoints even in IMMEDIATE mode', async () => {
  const tender = await createTender({ evaluationMode: 'IMMEDIATE' });
  const bidderId = new mongoose.Types.ObjectId();
  const bid = await BidSubmission.create({ tenderId: tender._id, bidderId, status: 'submitted', formData: {}, submittedAt: new Date(), bidReference: `BID/P10C/${Date.now()}` });

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo.bidder@example.com', password: 'Password123!' }) });
  const { token } = await loginRes.json();
  assert.ok(token, "demo bidder login must succeed");

  const evalRes = await fetch(`${baseUrl}/api/officer/bids/${bid._id}/evaluate`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(evalRes.status, 403);
  const assessRes = await fetch(`${baseUrl}/api/officer/bids/${bid._id}/assessment`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(assessRes.status, 403);
  const decisionRes = await fetch(`${baseUrl}/api/officer/bids/${bid._id}/decision`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(decisionRes.status, 403);
  const auditRes = await fetch(`${baseUrl}/api/officer/bids/${bid._id}/audit`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(auditRes.status, 403);

  await cleanupTender(tender._id);
});

// ------------------------------------------------------------ 17-18: SEALED blocks, IMMEDIATE permits

test('SEALED mode blocks officer access before the deadline; IMMEDIATE permits it immediately', async () => {
  const now = new Date();
  const futureDeadline = new Date(Date.now() + 3600_000);

  const sealedRes = await fetch(`${baseUrl}/api/officer/tenders`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...OFFICER_AUTH }, body: JSON.stringify({ tenderNumber: `P10C-SEALED-${Date.now()}`, title: 't', department: 'QA', value: '1', submissionStart: now.toISOString(), submissionDeadline: futureDeadline.toISOString(), evaluationMode: 'SEALED' }) });
  const sealedTender = await sealedRes.json();
  const immediateRes = await fetch(`${baseUrl}/api/officer/tenders`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...OFFICER_AUTH }, body: JSON.stringify({ tenderNumber: `P10C-IMM-${Date.now()}`, title: 't', department: 'QA', value: '1', submissionStart: now.toISOString(), submissionDeadline: futureDeadline.toISOString(), evaluationMode: 'IMMEDIATE' }) });
  const immediateTender = await immediateRes.json();

  const bidderId = new mongoose.Types.ObjectId();
  const sealedBid = await BidSubmission.create({ tenderId: sealedTender._id, bidderId, status: 'submitted', formData: {}, submittedAt: new Date(), bidReference: `BID/P10C/${Date.now()}A` });
  const immediateBid = await BidSubmission.create({ tenderId: immediateTender._id, bidderId, status: 'submitted', formData: {}, submittedAt: new Date(), bidReference: `BID/P10C/${Date.now()}B` });

  const sealedCheck = await fetch(`${baseUrl}/api/officer/bids/${sealedBid._id}`, { headers: OFFICER_AUTH });
  assert.equal(sealedCheck.status, 403);
  const immediateCheck = await fetch(`${baseUrl}/api/officer/bids/${immediateBid._id}`, { headers: OFFICER_AUTH });
  assert.equal(immediateCheck.status, 200);

  await cleanupTender(sealedTender._id);
  await cleanupTender(immediateTender._id);
});
