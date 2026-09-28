// Phase 8 — integration tests for the append-only AuditEvent log.

import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AuditEvent } from './AuditEvent.js';
import { recordAuditEvent } from '../services/audit.js';

const bidId = new mongoose.Types.ObjectId();
const tenderId = new mongoose.Types.ObjectId();

test.before(async () => {
  await mongoose.connect(env.mongoUri, { dbName: env.mongoDbName });
});

test.after(async () => {
  await AuditEvent.deleteMany({ bidId });
  await mongoose.disconnect();
});

test('recordAuditEvent: persists a real event with all key fields', async () => {
  await recordAuditEvent({ tenderId, bidId, officerId: 'officer', action: 'FINAL_DECISION_CREATED', entityType: 'FinalBidDecision', result: 'ACCEPTED', context: { comment: 'ok' } });
  const rows = await AuditEvent.find({ bidId });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, 'FINAL_DECISION_CREATED');
  assert.equal(rows[0].result, 'ACCEPTED');
  assert.ok(rows[0].timestamp);
  await AuditEvent.deleteMany({ bidId });
});

test('AuditEvent: rejects an action outside the controlled vocabulary', async () => {
  await assert.rejects(() => AuditEvent.create({ tenderId, bidId, officerId: 'officer', action: 'DELETE_EVERYTHING' as never, entityType: 'X' }));
});

test('AuditEvent: events for a bid are queryable newest-first', async () => {
  await recordAuditEvent({ tenderId, bidId, officerId: 'officer', action: 'COMPLIANCE_EVALUATION_RUN', entityType: 'ComplianceEvaluation', result: 'PASS:1 FAIL:0 REVIEW:0' });
  await new Promise((r) => setTimeout(r, 5));
  await recordAuditEvent({ tenderId, bidId, officerId: 'officer', action: 'COMPLIANCE_EVALUATION_RERUN', entityType: 'ComplianceEvaluation', result: 'PASS:1 FAIL:0 REVIEW:0' });

  const rows = await AuditEvent.find({ bidId }).sort({ timestamp: -1 });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].action, 'COMPLIANCE_EVALUATION_RERUN'); // most recent first
  assert.equal(rows[1].action, 'COMPLIANCE_EVALUATION_RUN');
  await AuditEvent.deleteMany({ bidId });
});

test('AuditEvent: no update/delete route exists in the gateway source', async () => {
  const fs = await import('node:fs/promises');
  const src = await fs.readFile(new URL('../routes/officer/bids.routes.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /officerBidsRouter\.(patch|put|delete)\(\s*['"`]\/bids\/:bidId\/audit/, 'no mutating route may exist for the audit log');
  assert.doesNotMatch(src, /AuditEvent\.(updateOne|updateMany|findOneAndUpdate|deleteOne|deleteMany|findOneAndDelete)/, 'route code must never update/delete AuditEvent records');
});
