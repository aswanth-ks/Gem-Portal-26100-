import { Schema, model } from 'mongoose';

const tenderSchema = new Schema(
  {
    tenderNumber: { type: String, required: true, unique: true, trim: true }, // e.g. CPCL/PROC/2026/041
    title: { type: String, required: true },
    description: { type: String, required: true },
    department: { type: String, required: true },
    scopeOfWork: { type: [String], default: [] },
    eligibilityCriteria: { type: [String], default: [] },
    technicalRequirements: { type: [String], default: [] },
    requiredDocuments: { type: [String], default: [] },
    value: { type: String, required: true }, // display string, e.g. "₹ 42,50,000 (excl. GST)"
    submissionStart: { type: Date, required: true },
    submissionDeadline: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft', required: true },
    publishedAt: { type: Date },
    createdBy: { type: String, default: 'seed' }, // officer identity — officer auth is out of scope this phase
    // Phase 10C — controls WHEN an officer may see a submitted bid's already-
    // computed compliance assessment, never WHETHER/WHEN it's computed.
    // Document processing + the deterministic evaluator always run
    // automatically right after submission regardless of this value — see
    // routes/documents.routes.ts's runAutomaticEvaluationIfReady(). SEALED
    // (the default) preserves the original sealed-bid procurement model
    // exactly: computation happens early, visibility stays gated on
    // isSealed(tender) until the real deadline passes. IMMEDIATE lets an
    // officer see the computed result as soon as it exists, for demos where
    // waiting for a real multi-day deadline isn't practical.
    evaluationMode: { type: String, enum: ['SEALED', 'IMMEDIATE'], default: 'SEALED', required: true },
  },
  { timestamps: true },
);

export const Tender = model('Tender', tenderSchema);
