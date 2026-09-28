import { Schema, model } from 'mongoose';

// Phase 8 — append-only audit log. Deliberately no update/delete route
// exists anywhere in the API for this collection, and nothing in the officer
// UI can edit a past entry — the only write path is AuditEvent.create()
// (see services/audit.ts), called from the real action it records.
const AUDIT_ACTIONS = [
  'DOCUMENT_VIEW',
  'DOCUMENT_DOWNLOAD',
  'EVIDENCE_VIEW',
  'TENDER_CLAUSE_VIEW',
  'COMPLIANCE_EVALUATION_RUN',
  'COMPLIANCE_EVALUATION_RERUN',
  'OFFICER_ASSESSMENT_CREATED',
  'OFFICER_ASSESSMENT_UPDATED',
  'FINAL_DECISION_CREATED',
  'FINAL_DECISION_UPDATED',
] as const;

const auditEventSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true },
    bidId: { type: Schema.Types.ObjectId, ref: 'BidSubmission', required: true },
    officerId: { type: String, required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    result: { type: String, default: '' }, // short human-readable outcome, e.g. "ACCEPTED", "PASS:1 FAIL:1 REVIEW:1"
    context: { type: Schema.Types.Mixed, default: {} }, // e.g. { comment }, { requirementTitle } — never raw document contents/secrets
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }, // `timestamp` is the single authoritative time field for an append-only log
);

auditEventSchema.index({ bidId: 1, timestamp: -1 });
auditEventSchema.index({ tenderId: 1, timestamp: -1 });
auditEventSchema.index({ action: 1, timestamp: -1 });

export const AuditEvent = model('AuditEvent', auditEventSchema);
export { AUDIT_ACTIONS };
