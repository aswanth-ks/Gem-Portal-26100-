import { Schema, model } from 'mongoose';

// Officer-side tender source documents (NIT, technical spec, BOQ, etc).
// Same private-storage principle as bidder BidDocument: files live on local
// disk under apps/gateway/uploads (gitignored, never served statically); the
// only route that reads bytes back is the ownership/auth-checked download
// route in officerTenders.routes.ts. No public URL exists for these either.
const tenderDocumentSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true },
    documentType: { type: String, required: true },
    originalFilename: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },

    // Async AI analysis job state (Phase 3A reliability fix). The real
    // analysis (gateway -> apps/ai -> Ollama) can take several minutes on
    // CPU, so it runs as an in-process background task rather than blocking
    // the HTTP request — this is where its status/result/error persist so a
    // page refresh mid-analysis can resume polling instead of restarting it.
    analysisStatus: { type: String, enum: ['idle', 'processing', 'completed', 'failed'], default: 'idle' },
    analysisResult: { type: Schema.Types.Mixed }, // { requirements, pageCount, droppedCount } once completed
    analysisError: { type: String },
    analysisStartedAt: { type: Date },
    analysisCompletedAt: { type: Date },
  },
  { timestamps: true },
);

tenderDocumentSchema.index({ tenderId: 1 });

export const TenderDocument = model('TenderDocument', tenderDocumentSchema);
