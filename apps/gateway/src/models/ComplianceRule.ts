import { Schema, model } from 'mongoose';

// Structured procurement rules attached to a requirement — NOT arbitrary
// code. Manually configured in Phase 2; AI-proposed rules are a later phase.
// `type` constrains the shape enough for Phase 3's assessment engine to
// consume deterministically without needing a rule-authoring language.
const complianceRuleSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true },
    requirementId: { type: Schema.Types.ObjectId, ref: 'TenderRequirement', required: true },
    type: { type: String, enum: ['numeric_threshold', 'date_validity', 'required_document', 'boolean_condition', 'experience_threshold'], required: true },
    field: { type: String, required: true }, // e.g. "average_annual_turnover"
    operator: { type: String, enum: ['>=', '<=', '>', '<', '==', '!='], required: true },
    value: { type: Schema.Types.Mixed }, // numeric/string/boolean threshold, depending on `type`
    parameters: { type: Schema.Types.Mixed, default: {} }, // e.g. { compareAgainst: "bidDate" } for date_validity
    temporalCondition: { type: String, default: '' },
  },
  { timestamps: true },
);

complianceRuleSchema.index({ tenderId: 1 });
// One rule per requirement for this MVP (Phase 4) — keeps "accept an AI
// proposal" unambiguous and duplicate-safe via the same unique-index pattern
// used for TenderRequirement.code. Multiple rules per requirement may be a
// legitimate need later; relaxing this to a non-unique index is the only
// change required to support it, so the possibility isn't designed away.
complianceRuleSchema.index({ requirementId: 1 }, { unique: true });

export const ComplianceRule = model('ComplianceRule', complianceRuleSchema);
