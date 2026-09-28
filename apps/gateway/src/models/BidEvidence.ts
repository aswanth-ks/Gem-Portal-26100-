import { Schema, model } from 'mongoose';

// Phase 5 — one record per AI-extracted field from a bidder document. Kept
// as its own collection (not embedded on BidDocument) so Phase 6's
// deterministic evaluator can query evidence by requirement without loading
// whole documents, and so provenance (bidId/documentId/requirementId/page)
// is queryable per field, not just per document.
//
// This is extracted evidence, not a compliance verdict — there is no
// PASS/FAIL/score field anywhere on this model, by design.
const bidEvidenceSchema = new Schema(
  {
    bidId: { type: Schema.Types.ObjectId, ref: 'BidSubmission', required: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'BidDocument', required: true },
    // Best-effort link to the tender requirement this evidence appears to
    // support — null when linking was ambiguous (see documents.routes.ts's
    // linkRequirement()). Phase 6 is what actually evaluates this evidence
    // against the requirement's ComplianceRule; this is provenance only.
    requirementId: { type: Schema.Types.ObjectId, ref: 'TenderRequirement', default: null },
    documentType: { type: String, required: true },
    field: { type: String, required: true },
    // Not `required: true` — Mongoose's built-in required validator rejects
    // an empty string, but a genuinely ambiguous/unreadable field (status
    // "review_required") legitimately has no value to report. `field` is
    // always non-empty; `value` may be "".
    value: { type: String, default: '' },
    normalizedValue: { type: Schema.Types.Mixed },
    sourcePage: { type: Number },
    sourceText: { type: String, default: '' },
    extractionConfidence: { type: Number, required: true },
    status: { type: String, enum: ['extracted', 'review_required'], required: true },
  },
  { timestamps: true },
);

bidEvidenceSchema.index({ bidId: 1 });
bidEvidenceSchema.index({ documentId: 1 });
bidEvidenceSchema.index({ requirementId: 1 });

export const BidEvidence = model('BidEvidence', bidEvidenceSchema);
