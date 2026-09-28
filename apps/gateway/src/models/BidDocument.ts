import { Schema, model } from 'mongoose';

const bidDocumentSchema = new Schema(
  {
    bidId: { type: Schema.Types.ObjectId, ref: 'BidSubmission', required: true },
    bidderId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // denormalized for a fast ownership check on download
    documentType: { type: String, required: true },
    originalFilename: { type: String, required: true },
    storagePath: { type: String, required: true }, // path on local disk, apps/gateway/uploads/** — never served directly/publicly
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },

    // Phase 5 — async classification/evidence-extraction job state. Same
    // in-process-background pattern as TenderDocument's analysisStatus
    // (Phase 3A reliability fix): upload responds immediately, this tracks
    // the real state of the background job so a page refresh mid-processing
    // resumes polling instead of restarting it.
    processingStatus: { type: String, enum: ['idle', 'processing', 'completed', 'failed'], default: 'idle' },
    processingError: { type: String },
    processingStartedAt: { type: Date },
    processingCompletedAt: { type: Date },
    // Set once classification completes — distinct from `documentType`
    // above, which is the bidder/officer-entered label at upload time.
    classifiedType: { type: String },
    classificationConfidence: { type: Number },
    // Best-effort requirement link, computed from the tender's real
    // TenderRequirement.evidenceTypes — never hardcoded per document type.
    requirementId: { type: Schema.Types.ObjectId, ref: 'TenderRequirement', default: null },
    linkStatus: { type: String, enum: ['linked', 'review_required', 'unmatched'], default: 'unmatched' },
  },
  { timestamps: true },
);

export const BidDocument = model('BidDocument', bidDocumentSchema);
