import { Schema, model } from 'mongoose';

const bidSubmissionSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true },
    bidderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Only states that actually exist in this backend — no decorative ones.
    status: { type: String, enum: ['draft', 'submitted', 'closed'], default: 'draft', required: true },
    // Loose sub-document: Step 1's field set can evolve without a schema migration.
    formData: { type: Schema.Types.Mixed, default: {} },
    documents: [{ type: Schema.Types.ObjectId, ref: 'BidDocument' }],
    bidReference: { type: String, unique: true, sparse: true }, // set only on submit
    submittedAt: { type: Date },
    // Phase 10C — honest, real backend state for the automatic post-
    // submission pipeline. Both are always derived from real events
    // (document processing completing, the evaluator actually running) —
    // never a frontend timer, never fabricated.
    documentProcessingStatus: { type: String, enum: ['NOT_STARTED', 'PROCESSING', 'COMPLETED', 'PARTIAL_FAILURE', 'FAILED'], default: 'NOT_STARTED' },
    complianceEvaluationStatus: { type: String, enum: ['NOT_STARTED', 'WAITING_FOR_DOCUMENTS', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'NOT_STARTED' },
  },
  { timestamps: true },
);

// One bid per bidder per tender — enforced at the database level, not just in a controller.
bidSubmissionSchema.index({ tenderId: 1, bidderId: 1 }, { unique: true });

export const BidSubmission = model('BidSubmission', bidSubmissionSchema);
