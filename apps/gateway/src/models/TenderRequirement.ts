import { Schema, model } from 'mongoose';

// Manually authored (Phase 2) bidder-eligibility/requirement records for a
// tender. AI extraction of these from tender documents is explicitly a later
// phase — nothing here is AI-generated; every record is officer-entered.
const tenderRequirementSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true },
    code: { type: String, required: true, trim: true }, // e.g. "REQ-001", unique per tender
    title: { type: String, required: true },
    description: { type: String, default: '' },
    // Union of the Phase 2 manual-entry categories and Phase 3A's AI
    // extraction categories (commercial/contractual/other) — one enum for
    // both entry paths rather than mapping between two different sets.
    category: { type: String, enum: ['statutory', 'financial', 'technical', 'eligibility', 'experience', 'commercial', 'contractual', 'tender_specific', 'other'], required: true },
    mandatory: { type: Boolean, default: true },
    conditional: { type: Boolean, default: false },
    evidenceTypes: { type: [String], default: [] },
    sourceDocument: { type: String, default: '' },
    sourcePage: { type: Number },
    sourceClause: { type: String, default: '' },
    status: { type: String, enum: ['proposed', 'approved', 'rejected'], default: 'proposed' },
  },
  { timestamps: true },
);

tenderRequirementSchema.index({ tenderId: 1 });
tenderRequirementSchema.index({ tenderId: 1, code: 1 }, { unique: true });

export const TenderRequirement = model('TenderRequirement', tenderRequirementSchema);
