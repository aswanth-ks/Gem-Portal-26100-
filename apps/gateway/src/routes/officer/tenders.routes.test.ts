// Phase 10B — regression tests for the tender status state machine
// (draft -> published -> closed, one-way only). Real HTTP-level tests
// against the actual Express app (createApp()) and the real configured
// MongoDB — same convention as the project's other integration tests
// (OfficerAssessment.test.ts, FinalBidDecision.test.ts): no mocking
// framework, no supertest dependency, just a real server on an ephemeral
// port and real fetch calls, cleaned up afterward.

import { signToken } from '../../middleware/auth.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import type { Server } from 'node:http';
import { env } from '../../config/env.js';
import { createApp } from '../../app.js';
import { Tender } from '../../models/Tender.js';
import { BidSubmission } from '../../models/BidSubmission.js';
import { ComplianceEvaluation } from '../../models/ComplianceEvaluation.js';
import { OfficerAssessment } from '../../models/OfficerAssessment.js';
import { FinalBidDecision } from '../../models/FinalBidDecision.js';

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
  baseUrl = `http://127.0.0.1:${port}/api/officer`;
});

test.after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
});

async function patchTender(id: string, body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/tenders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...OFFICER_AUTH }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function createTender(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  const deadline = new Date(Date.now() + 3600_000);
  const res = await fetch(`${baseUrl}/tenders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...OFFICER_AUTH },
    body: JSON.stringify({ tenderNumber: `P10B-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: 'Phase 10B regression tender', department: 'QA', value: '1', submissionStart: now.toISOString(), submissionDeadline: deadline.toISOString(), ...overrides }),
  });
  return res.json();
}
async function makePublishable(tenderId: string) {
  // validateForPublish requires >=1 document and >=1 requirement.
  const form = new FormData();
  form.append('file', new Blob([Buffer.from('%PDF-1.4 test')], { type: 'application/pdf' }), 'doc.pdf');
  await fetch(`${baseUrl}/tenders/${tenderId}/documents`, { method: 'POST', headers: OFFICER_AUTH, body: form });
  await fetch(`${baseUrl}/tenders/${tenderId}/requirements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...OFFICER_AUTH },
    body: JSON.stringify({ code: 'REQ-001', title: 'Test requirement', category: 'other', mandatory: true, evidenceTypes: ['X'] }),
  });
}

async function cleanupTender(tenderId: string) {
  const oid = new mongoose.Types.ObjectId(tenderId);
  const bids = await BidSubmission.find({ tenderId: oid });
  const bidIds = bids.map((b) => b._id);
  await ComplianceEvaluation.deleteMany({ tenderId: oid });
  await OfficerAssessment.deleteMany({ tenderId: oid });
  await FinalBidDecision.deleteMany({ tenderId: oid });
  await BidSubmission.deleteMany({ tenderId: oid });
  await mongoose.connection.db!.collection('tenderdocuments').deleteMany({ tenderId: oid });
  await mongoose.connection.db!.collection('tenderrequirements').deleteMany({ tenderId: oid });
  await mongoose.connection.db!.collection('compliancerules').deleteMany({ tenderId: oid });
  await Tender.deleteOne({ _id: oid });
  return bidIds;
}

// ------------------------------------------------------------ 1. draft -> published (still works)

test('draft -> published still succeeds (existing valid behavior preserved)', async () => {
  const tender = await createTender();
  await makePublishable(tender._id);
  const res = await patchTender(tender._id, { status: 'published' });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'published');
  await cleanupTender(tender._id);
});

// ------------------------------------------------------------ 2. published -> draft (blocked)

test('published -> draft is rejected with 409', async () => {
  const tender = await createTender();
  await makePublishable(tender._id);
  await patchTender(tender._id, { status: 'published' });

  const res = await patchTender(tender._id, { status: 'draft' });
  assert.equal(res.status, 409);
  assert.match(res.body.error, /cannot be reverted to draft/i);

  const fresh = await Tender.findById(tender._id);
  assert.equal(fresh?.status, 'published'); // unchanged
  await cleanupTender(tender._id);
});

// ------------------------------------------------------------ 3. closed -> draft (blocked)

test('closed -> draft is rejected with 409', async () => {
  const tender = await createTender();
  await makePublishable(tender._id);
  await patchTender(tender._id, { status: 'published' });
  await Tender.updateOne({ _id: tender._id }, { status: 'closed' }); // simulate a closed tender directly, matching real lifecycle end-state

  const res = await patchTender(tender._id, { status: 'draft' });
  assert.equal(res.status, 409);

  const fresh = await Tender.findById(tender._id);
  assert.equal(fresh?.status, 'closed');
  await cleanupTender(tender._id);
});

// ------------------------------------------------------------ 4-7. downgrade with real downstream records (the exact acceptance-test scenario)

test('published tender with a real submitted bid + evaluation + assessment + final decision -> draft is rejected, and no downstream record is touched', async () => {
  const tender = await createTender();
  await makePublishable(tender._id);
  await patchTender(tender._id, { status: 'published' });

  // Real downstream records, inserted the same way the real workflow would
  // produce them (this test only needs their presence, not a full document
  // pipeline run — that full flow is already covered by the Phase 10A
  // acceptance test).
  const bidderId = new mongoose.Types.ObjectId();
  const bid = await BidSubmission.create({ tenderId: tender._id, bidderId, status: 'submitted', formData: { note: 'x' }, submittedAt: new Date(), bidReference: 'BID/TEST/0001' });
  const requirementId = new mongoose.Types.ObjectId();
  const ruleId = new mongoose.Types.ObjectId();
  const evaluation = await ComplianceEvaluation.create({ bidId: bid._id, tenderId: tender._id, requirementId, ruleId, result: 'PASS', reason: 'r', evaluatedAt: new Date(), evaluatorVersion: '1.0' });
  const assessment = await OfficerAssessment.create({ bidId: bid._id, tenderId: tender._id, requirementId, assessment: 'ACCEPTED', comment: 'c' });
  const decision = await FinalBidDecision.create({ bidId: bid._id, tenderId: tender._id, decision: 'ACCEPTED', comment: 'ok' });

  const res = await patchTender(tender._id, { status: 'draft' });
  assert.equal(res.status, 409);

  const freshTender = await Tender.findById(tender._id);
  assert.equal(freshTender?.status, 'published');

  const freshBid = await BidSubmission.findById(bid._id);
  assert.equal(freshBid?.status, 'submitted');
  const freshEval = await ComplianceEvaluation.findById(evaluation._id);
  assert.equal(freshEval?.result, 'PASS');
  const freshAssessment = await OfficerAssessment.findById(assessment._id);
  assert.equal(freshAssessment?.assessment, 'ACCEPTED');
  const freshDecision = await FinalBidDecision.findById(decision._id);
  assert.equal(freshDecision?.decision, 'ACCEPTED');

  await cleanupTender(tender._id);
});

// ------------------------------------------------------------ 10. legitimate operations still work

test('legitimate tender operations (metadata update while draft, publish) still work', async () => {
  const tender = await createTender();
  const patchRes = await patchTender(tender._id, { title: 'Updated title' });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.title, 'Updated title');

  await makePublishable(tender._id);
  const pubRes = await patchTender(tender._id, { status: 'published' });
  assert.equal(pubRes.status, 200);
  assert.equal(pubRes.body.status, 'published');

  // published -> published (no-op status re-send) must not be blocked by the new guard
  const republish = await patchTender(tender._id, { status: 'published' });
  assert.equal(republish.status, 200);

  await cleanupTender(tender._id);
});
