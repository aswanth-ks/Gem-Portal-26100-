import { Schema, model } from 'mongoose';

// Phase 7 — the officer's human review of one requirement's compliance
// result. Deliberately a separate model from ComplianceEvaluation:
// ComplianceEvaluation is the machine-generated deterministic PASS/FAIL/
// REVIEW (Phase 6, immutable per evaluation run); OfficerAssessment is the
// officer's own judgment about that result, recorded independently so a
// re-run of the deterministic evaluator (which upserts ComplianceEvaluation)
// can never overwrite or lose it.
//
// Officer identity: `officerId` is the authenticated officer's email, taken
// from the verified officer JWT (req.officer) — never from the request body.
const ASSESSMENT_VALUES = ['ACCEPTED', 'NEEDS_REVIEW', 'NOT_ACCEPTED'] as const;

const officerAssessmentSchema = new Schema(
  {
    bidId: { type: Schema.Types.ObjectId, ref: 'BidSubmission', required: true },
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true },
    requirementId: { type: Schema.Types.ObjectId, ref: 'TenderRequirement', required: true },
    assessment: { type: String, enum: ASSESSMENT_VALUES, required: true },
    comment: { type: String, default: '' },
    officerId: { type: String, default: 'officer' },
  },
  { timestamps: true },
);

officerAssessmentSchema.index({ bidId: 1 });
officerAssessmentSchema.index({ bidId: 1, requirementId: 1 }, { unique: true });

export const OfficerAssessment = model('OfficerAssessment', officerAssessmentSchema);
export { ASSESSMENT_VALUES };
