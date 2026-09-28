import { Schema, model } from 'mongoose';

// Phase 6 — persisted result of the deterministic compliance evaluator.
// One row per (bidId, requirementId): re-running evaluation upserts this row
// rather than creating a history, matching the Phase 6 MVP idempotency
// requirement (no versioned result history yet). `evaluatorVersion` records
// which deterministic evaluator logic produced this result, since the logic
// itself is expected to change over time.
//
// There is no score field here, by design — every result must be traceable
// back to the rule and the evidence that produced it via `ruleSnapshot` and
// `evidenceIds`, not reduced to a number.
const complianceEvaluationSchema = new Schema(
  {
    bidId: { type: Schema.Types.ObjectId, ref: 'BidSubmission', required: true },
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true },
    requirementId: { type: Schema.Types.ObjectId, ref: 'TenderRequirement', required: true },
    ruleId: { type: Schema.Types.ObjectId, ref: 'ComplianceRule', required: true },
    result: { type: String, enum: ['PASS', 'FAIL', 'REVIEW'], required: true },
    reason: { type: String, required: true },
    finding: { type: String, default: '' },
    evidenceIds: { type: [Schema.Types.ObjectId], ref: 'BidEvidence', default: [] },
    ruleSnapshot: { type: Schema.Types.Mixed },
    evaluatedAt: { type: Date, required: true },
    evaluatorVersion: { type: String, required: true },
  },
  { timestamps: true },
);

complianceEvaluationSchema.index({ bidId: 1 });
complianceEvaluationSchema.index({ bidId: 1, requirementId: 1 }, { unique: true });

export const ComplianceEvaluation = model('ComplianceEvaluation', complianceEvaluationSchema);
