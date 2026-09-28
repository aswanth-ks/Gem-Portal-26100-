// Officer bidder-requirement CRUD. Requirements are either manually authored
// by the officer, or AI-proposed (apps/ai, via POST .../documents/:id/analyze)
// and then submitted here through this exact same create endpoint once the
// officer accepts them — there is no separate "AI requirement" model
// (Phase 3A's data boundary: AI proposal -> officer confirmation -> this).

import { Router } from 'express';
import { z } from 'zod';
import { Tender } from '../../models/Tender.js';
import { TenderRequirement } from '../../models/TenderRequirement.js';
import { ComplianceRule } from '../../models/ComplianceRule.js';
import { asyncRoute, ApiError } from '../../middleware/errorHandler.js';

export const officerRequirementsRouter = Router();

const CATEGORIES = ['statutory', 'financial', 'technical', 'eligibility', 'experience', 'commercial', 'contractual', 'tender_specific', 'other'] as const;
const STATUSES = ['proposed', 'approved', 'rejected'] as const;

const createSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  category: z.enum(CATEGORIES),
  mandatory: z.boolean().default(true),
  conditional: z.boolean().default(false),
  evidenceTypes: z.array(z.string()).default([]),
  sourceDocument: z.string().default(''),
  sourcePage: z.number().optional(),
  sourceClause: z.string().default(''),
  status: z.enum(STATUSES).optional(),
});

officerRequirementsRouter.get(
  '/tenders/:id/requirements',
  asyncRoute(async (req, res) => {
    const reqs = await TenderRequirement.find({ tenderId: req.params.id }).sort({ createdAt: 1 });
    res.json(reqs);
  }),
);

officerRequirementsRouter.post(
  '/tenders/:id/requirements',
  asyncRoute(async (req, res) => {
    const tender = await Tender.findById(req.params.id);
    if (!tender) throw new ApiError(404, 'Tender not found.');
    const input = createSchema.parse(req.body);
    const requirement = await TenderRequirement.create({ ...input, tenderId: tender._id });
    res.status(201).json(requirement);
  }),
);

const patchSchema = createSchema.partial();

officerRequirementsRouter.patch(
  '/requirements/:requirementId',
  asyncRoute(async (req, res) => {
    const requirement = await TenderRequirement.findById(req.params.requirementId);
    if (!requirement) throw new ApiError(404, 'Requirement not found.');
    const input = patchSchema.parse(req.body);
    Object.assign(requirement, input);
    await requirement.save();
    res.json(requirement);
  }),
);

officerRequirementsRouter.delete(
  '/requirements/:requirementId',
  asyncRoute(async (req, res) => {
    const requirement = await TenderRequirement.findById(req.params.requirementId);
    if (!requirement) throw new ApiError(404, 'Requirement not found.');
    // A requirement with rules attached can't be silently orphaned — the
    // officer must remove the rules first (keeps the Tender -> Requirement ->
    // Rule relationship always consistent).
    const ruleCount = await ComplianceRule.countDocuments({ requirementId: requirement._id });
    if (ruleCount > 0) throw new ApiError(409, 'Remove the compliance rules attached to this requirement first.');
    await requirement.deleteOne();
    res.status(204).send();
  }),
);
