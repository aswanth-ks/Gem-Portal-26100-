import { Schema, model } from 'mongoose';

// Phase 8 — the human procurement officer's final decision on a bid. This is
// never derived from PASS/FAIL/REVIEW counts, AI confidence, or any other
// automated signal — it is only ever written by an explicit officer action
// through the API below. One current decision per bid (unique on bidId);
// updating it overwrites the previous decision record in place rather than
// keeping history — history of the change is what AuditEvent is for.
const FINAL_DECISIONS = ['ACCEPTED', 'REVIEW', 'REJECTED'] as const;

const finalBidDecisionSchema = new Schema(
  {
    bidId: { type: Schema.Types.ObjectId, ref: 'BidSubmission', required: true, unique: true },
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true },
    decision: { type: String, enum: FINAL_DECISIONS, required: true },
    comment: { type: String, default: '' },
    reason: { type: String, default: '' },
    officerId: { type: String, default: 'officer' },
  },
  { timestamps: true },
);

export const FinalBidDecision = model('FinalBidDecision', finalBidDecisionSchema);
export { FINAL_DECISIONS };
