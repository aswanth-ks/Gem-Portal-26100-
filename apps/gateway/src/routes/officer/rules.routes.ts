// Officer compliance-rule CRUD. Structured procurement rules only — not
// arbitrary code. Rules are either manually configured (Phase 2) or
// AI-proposed and then officer-accepted (Phase 4, via propose-rule below) —
// both paths end at the exact same POST /tenders/:id/rules; there is no
// separate "AI rule" model. Every rule is verified to reference a
// requirement that actually belongs to the same tender before it is created.

import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { Tender } from '../../models/Tender.js';
import { TenderRequirement } from '../../models/TenderRequirement.js';
import { ComplianceRule } from '../../models/ComplianceRule.js';
import { asyncRoute, ApiError } from '../../middleware/errorHandler.js';

export const officerRulesRouter = Router();

const RULE_TYPES = ['numeric_threshold', 'date_validity', 'required_document', 'boolean_condition', 'experience_threshold'] as const;
const OPERATORS = ['>=', '<=', '>', '<', '==', '!='] as const;

const createSchema = z.object({
  requirementId: z.string().min(1),
  type: z.enum(RULE_TYPES),
  field: z.string().min(1),
  operator: z.enum(OPERATORS),
  value: z.unknown().optional(),
  parameters: z.record(z.unknown()).default({}),
  temporalCondition: z.string().default(''),
});

async function assertRequirementBelongsToTender(requirementId: string, tenderId: string) {
  const requirement = await TenderRequirement.findById(requirementId);
  if (!requirement) throw new ApiError(404, 'Requirement not found.');
  if (requirement.tenderId.toString() !== tenderId) {
    throw new ApiError(409, 'This requirement does not belong to the specified tender. A rule cannot cross tenders.');
  }
  return requirement;
}

officerRulesRouter.get(
  '/tenders/:id/rules',
  asyncRoute(async (req, res) => {
    const rules = await ComplianceRule.find({ tenderId: req.params.id }).sort({ createdAt: 1 });
    res.json(rules);
  }),
);

officerRulesRouter.post(
  '/tenders/:id/rules',
  asyncRoute(async (req, res) => {
    const tender = await Tender.findById(req.params.id);
    if (!tender) throw new ApiError(404, 'Tender not found.');
    const input = createSchema.parse(req.body);
    await assertRequirementBelongsToTender(input.requirementId, tender._id.toString());
    const rule = await ComplianceRule.create({ ...input, tenderId: tender._id });
    res.status(201).json(rule);
  }),
);

const patchSchema = createSchema.partial();

officerRulesRouter.patch(
  '/rules/:ruleId',
  asyncRoute(async (req, res) => {
    const rule = await ComplianceRule.findById(req.params.ruleId);
    if (!rule) throw new ApiError(404, 'Rule not found.');
    const input = patchSchema.parse(req.body);
    if (input.requirementId) await assertRequirementBelongsToTender(input.requirementId, rule.tenderId.toString());
    Object.assign(rule, input);
    await rule.save();
    res.json(rule);
  }),
);

officerRulesRouter.delete(
  '/rules/:ruleId',
  asyncRoute(async (req, res) => {
    const rule = await ComplianceRule.findById(req.params.ruleId);
    if (!rule) throw new ApiError(404, 'Rule not found.');
    await rule.deleteOne();
    res.status(204).send();
  }),
);

// Phase 4 — AI rule proposal. Preview-only: the LLM translates one
// already-approved requirement into a structured rule proposal (or says no
// safe rule applies). Nothing is written to ComplianceRule here — the
// officer accepts/edits through the ordinary POST /tenders/:id/rules above,
// exactly like a manually authored rule.
const proposalSchema = z.object({
  ruleApplicable: z.boolean(),
  type: z.enum(RULE_TYPES).nullable().optional(),
  field: z.string().nullable().optional(),
  operator: z.enum(OPERATORS).nullable().optional(),
  value: z.unknown().optional(),
  parameters: z.record(z.unknown()).default({}),
  reason: z.string(),
});
const proposeRuleResponseSchema = z.object({
  requirementCode: z.string(),
  proposal: proposalSchema,
});

officerRulesRouter.post(
  '/tenders/:id/requirements/:requirementId/propose-rule',
  asyncRoute(async (req, res) => {
    const tender = await Tender.findById(req.params.id);
    if (!tender) throw new ApiError(404, 'Tender not found.');

    const requirement = await assertRequirementBelongsToTender(req.params.requirementId, tender._id.toString());
    if (requirement.status !== 'approved') {
      throw new ApiError(409, 'Only an approved requirement can have a rule proposed for it.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 620_000); // local llama3:8b on CPU can take several minutes
    let aiRes: Response;
    try {
      aiRes = await fetch(`${env.aiServiceUrl}/ai/propose-rule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: requirement.code,
          title: requirement.title,
          description: requirement.description,
          category: requirement.category,
          mandatory: requirement.mandatory,
          conditional: requirement.conditional,
          evidenceTypes: requirement.evidenceTypes,
          sourceDocument: requirement.sourceDocument,
          sourcePage: requirement.sourcePage ?? null,
          sourceClause: requirement.sourceClause || null,
        }),
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(503, 'AI service unavailable. The requirement is still available and a rule can be entered manually.');
    } finally {
      clearTimeout(timeout);
    }

    const body = await aiRes.json().catch(() => null);
    if (!aiRes.ok) {
      const message = (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string' && body.detail) || 'AI rule proposal failed. The requirement is still available and a rule can be entered manually.';
      throw new ApiError(aiRes.status, message);
    }

    const parsed = proposeRuleResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(502, 'The AI service returned a response that did not match the expected schema.');
    }

    res.json(parsed.data);
  }),
);
