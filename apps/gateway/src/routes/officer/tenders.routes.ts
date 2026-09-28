// Officer tender CRUD. All routes require requireOfficer (mounted in
// index.ts). Draft/published/closed lifecycle rules live here — this is the
// server-side enforcement, not just a UI affordance.

import { Router } from 'express';
import { z } from 'zod';
import { Tender } from '../../models/Tender.js';
import { TenderDocument } from '../../models/TenderDocument.js';
import { TenderRequirement } from '../../models/TenderRequirement.js';
import { ComplianceRule } from '../../models/ComplianceRule.js';
import { asyncRoute, ApiError } from '../../middleware/errorHandler.js';

export const officerTendersRouter = Router();

const createSchema = z.object({
  draftId: z.string().optional(), // resume-or-create: see handler below
  tenderNumber: z.string().min(1).optional(), // may be assigned later, before publish
  title: z.string().default(''),
  description: z.string().default(''),
  department: z.string().default(''),
  scopeOfWork: z.array(z.string()).default([]),
  eligibilityCriteria: z.array(z.string()).default([]),
  technicalRequirements: z.array(z.string()).default([]),
  requiredDocuments: z.array(z.string()).default([]),
  value: z.string().default(''),
  submissionStart: z.string().datetime().optional(),
  submissionDeadline: z.string().datetime().optional(),
  // Phase 10C — controls officer visibility timing only (never correctness);
  // see models/Tender.ts. Zod rejects any value outside the enum with a 422,
  // exactly like every other enum field in this API — no arbitrary strings.
  evaluationMode: z.enum(['SEALED', 'IMMEDIATE']).optional(),
});

officerTendersRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const parsedCreate = createSchema.safeParse(req.body);
    if (!parsedCreate.success) throw new ApiError(422, parsedCreate.error.issues[0]?.message ?? 'Invalid request.');
    const input = parsedCreate.data;

    // Resume-or-create: the wizard has no :id in its routes and keeps the
    // draft's real Mongo _id client-side (sessionStorage). If it's given one,
    // resume that exact draft instead of minting a new Tender — this is what
    // makes a duplicate POST (e.g. React StrictMode's double-invoked effect)
    // safe: the second call just returns the same document.
    if (input.draftId) {
      const existing = await Tender.findById(input.draftId).catch(() => null);
      if (existing) {
        res.status(200).json(existing);
        return;
      }
      // Unknown/stale id (e.g. cleared sessionStorage pointing nowhere) —
      // fall through and create a fresh draft rather than erroring.
    }

    const tender = await Tender.create({
      ...input,
      // Placeholder values so the schema's `required` fields don't block
      // creating an empty draft from Step 1 before the officer has typed
      // anything — every one of these is expected to be overwritten by the
      // wizard's own PATCH calls before publish (validated in publish()).
      // `title` was previously missing from this list, which is exactly what
      // caused Tender.create() to fail Mongoose's required-string validation
      // on an empty string (500, see Phase 2 bugfix notes).
      tenderNumber: input.tenderNumber || `DRAFT-${Date.now()}`,
      title: input.title || 'Untitled tender',
      description: input.description || ' ',
      department: input.department || ' ',
      value: input.value || ' ',
      submissionStart: input.submissionStart ? new Date(input.submissionStart) : new Date(),
      submissionDeadline: input.submissionDeadline ? new Date(input.submissionDeadline) : new Date(Date.now() + 86400000),
      status: 'draft',
      createdBy: 'officer',
    });
    res.status(201).json(tender);
  }),
);

officerTendersRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    const tenders = await Tender.find().sort({ createdAt: -1 });
    res.json(tenders);
  }),
);

officerTendersRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const tender = await Tender.findById(req.params.id);
    if (!tender) throw new ApiError(404, 'Tender not found.');
    res.json(tender);
  }),
);

const patchSchema = createSchema.partial().extend({ status: z.enum(['draft', 'published', 'closed']).optional() });

function submissionWindowIsOpen(tender: { status: string; submissionStart: Date; submissionDeadline: Date }): boolean {
  const now = Date.now();
  return tender.status === 'published' && now >= tender.submissionStart.getTime() && now < tender.submissionDeadline.getTime();
}

officerTendersRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const tender = await Tender.findById(req.params.id);
    if (!tender) throw new ApiError(404, 'Tender not found.');

    const parsedPatch = patchSchema.safeParse(req.body);
    if (!parsedPatch.success) throw new ApiError(422, parsedPatch.error.issues[0]?.message ?? 'Invalid request.');
    const input = parsedPatch.data;

    // Phase 10B (bug fix) — the tender lifecycle is one-way:
    // draft -> published -> closed. A published or closed tender must never
    // be revertible to draft: real bids, evidence, compliance evaluations,
    // officer assessments and final decisions can already exist against it,
    // and reverting to draft would hide it from the bidder-facing published-
    // tenders endpoint while officer routes (gated on the deadline, not on
    // tender.status) kept serving that same real data — an inconsistent
    // state discovered live during the Phase 10A acceptance test.
    if (input.status === 'draft' && tender.status !== 'draft') {
      throw new ApiError(409, 'Published or closed tenders cannot be reverted to draft.');
    }

    // Immutability boundary (item 8): once the submission window is open,
    // schedule/identity fields are locked. A closed tender is read-only.
    if (tender.status === 'closed') {
      throw new ApiError(409, 'This tender is closed and can no longer be edited.');
    }
    if (submissionWindowIsOpen(tender)) {
      // Compare the actual VALUE, not mere presence — the wizard's Step 1
      // "Continue"/"Save" always PATCHes the full field set, including
      // tenderNumber/submissionStart/submissionDeadline unchanged, whenever
      // the officer revisits Step 1 (e.g. via the Review page's "Edit" link)
      // after publishing. Rejecting on presence alone made every such visit
      // fail with a 409 even when nothing about the schedule/identity was
      // actually being changed — this only rejects a genuine change.
      if (input.tenderNumber !== undefined && input.tenderNumber !== tender.tenderNumber) {
        throw new ApiError(409, '"tenderNumber" cannot be changed once the submission window is open.');
      }
      if (input.submissionStart !== undefined && new Date(input.submissionStart).getTime() !== tender.submissionStart.getTime()) {
        throw new ApiError(409, '"submissionStart" cannot be changed once the submission window is open.');
      }
      if (input.submissionDeadline !== undefined && new Date(input.submissionDeadline).getTime() !== tender.submissionDeadline.getTime()) {
        throw new ApiError(409, '"submissionDeadline" cannot be changed once the submission window is open.');
      }
    }

    if (input.status === 'published') {
      await validateForPublish(tender._id.toString(), { ...tender.toObject(), ...input });
      tender.publishedAt = new Date();
    }

    Object.assign(tender, input);
    if (input.submissionStart) tender.submissionStart = new Date(input.submissionStart);
    if (input.submissionDeadline) tender.submissionDeadline = new Date(input.submissionDeadline);
    await tender.save();
    res.json(tender);
  }),
);

async function validateForPublish(tenderId: string, tender: { tenderNumber?: string; submissionStart?: Date | string; submissionDeadline?: Date | string }) {
  const errors: string[] = [];

  if (!tender.tenderNumber || tender.tenderNumber.startsWith('DRAFT-')) errors.push('A valid tender number is required.');
  else {
    const dup = await Tender.findOne({ tenderNumber: tender.tenderNumber, _id: { $ne: tenderId } });
    if (dup) errors.push(`Tender number "${tender.tenderNumber}" is already in use.`);
  }

  if (!tender.submissionStart) errors.push('Submission start date is required.');
  if (!tender.submissionDeadline) errors.push('Submission deadline is required.');
  if (tender.submissionStart && tender.submissionDeadline && new Date(tender.submissionDeadline).getTime() <= new Date(tender.submissionStart).getTime()) {
    errors.push('Submission deadline must be after submission start.');
  }

  const docCount = await TenderDocument.countDocuments({ tenderId });
  if (docCount === 0) errors.push('At least one tender document is required.');

  const requirements = await TenderRequirement.find({ tenderId });
  if (requirements.length === 0) errors.push('At least one bidder requirement is required.');

  const requirementIds = new Set(requirements.map((r) => r._id.toString()));
  const rules = await ComplianceRule.find({ tenderId });
  for (const rule of rules) {
    if (!requirementIds.has(rule.requirementId.toString())) {
      errors.push(`A compliance rule references a requirement that does not belong to this tender.`);
      break;
    }
  }

  if (errors.length > 0) throw new ApiError(422, errors.join(' '));
}
