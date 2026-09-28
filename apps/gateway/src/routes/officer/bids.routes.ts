// Officer read-only view of bidder submissions. Real data only — no
// compliance scoring/PASS-FAIL/risk exists yet (that's a later phase); this
// exposes exactly what the backend actually knows: who submitted, when,
// what they submitted, and the documents attached.
//
// Sealed-bid rule applies to officers too, not just other bidders: a bid is
// invisible here until its tender's submission deadline has passed, and only
// ever shows submitted/closed bids — a bidder's private draft is never
// visible to an officer, ever.

import { Router } from 'express';
import { Tender } from '../../models/Tender.js';
import { BidSubmission } from '../../models/BidSubmission.js';
import { BidderProfile } from '../../models/BidderProfile.js';
import { BidDocument } from '../../models/BidDocument.js';
import { BidEvidence } from '../../models/BidEvidence.js';
import { TenderRequirement } from '../../models/TenderRequirement.js';
import { ComplianceRule } from '../../models/ComplianceRule.js';
import { ComplianceEvaluation } from '../../models/ComplianceEvaluation.js';
import { OfficerAssessment, ASSESSMENT_VALUES } from '../../models/OfficerAssessment.js';
import { FinalBidDecision, FINAL_DECISIONS } from '../../models/FinalBidDecision.js';
import { AuditEvent } from '../../models/AuditEvent.js';
import { runComplianceEvaluation } from '../../services/evaluationRunner.js';
import { recordAuditEvent } from '../../services/audit.js';
import { asyncRoute, ApiError } from '../../middleware/errorHandler.js';
import { z } from 'zod';
import type { Request } from 'express';
import type { AuthedRequest } from '../../middleware/auth.js';

export const officerBidsRouter = Router();

// Officer identity for audit/assessment/decision records comes only from the
// verified officer JWT (set on req.officer by requireOfficer) — never from a
// client-submitted field. Automatic evaluation elsewhere uses 'system'.
function officerIdOf(req: Request): string {
  const officer = (req as AuthedRequest).officer;
  if (!officer) throw new ApiError(401, 'Officer authentication required.');
  return officer.email;
}

function isSealed(tender: { submissionDeadline: Date }): boolean {
  return Date.now() < tender.submissionDeadline.getTime();
}

// Phase 10C — evaluationMode controls AVAILABILITY only, never correctness.
// isSealed() remains the one canonical deadline check; IMMEDIATE mode simply
// bypasses it for officer visibility once a bid has been submitted. A
// bidder's sealed-bid protection (documents.routes.ts, unaffected by this
// phase) never consults evaluationMode at all.
function officerVisibilityBlocked(tender: { submissionDeadline: Date; evaluationMode?: string }): boolean {
  if (tender.evaluationMode === 'IMMEDIATE') return false;
  return isSealed(tender);
}

officerBidsRouter.get(
  '/tenders/:id/bids',
  asyncRoute(async (req, res) => {
    const tender = await Tender.findById(req.params.id);
    if (!tender) throw new ApiError(404, 'Tender not found.');

    if (officerVisibilityBlocked(tender)) {
      return res.json({ sealed: true, deadline: tender.submissionDeadline, bids: [] });
    }

    const bids = await BidSubmission.find({ tenderId: tender._id, status: { $in: ['submitted', 'closed'] } }).sort({ submittedAt: 1 });
    const profiles = await BidderProfile.find({ userId: { $in: bids.map((b) => b.bidderId) } });
    const profileByUser = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const rows = bids.map((b) => ({
      _id: b._id,
      bidderId: b.bidderId,
      status: b.status,
      bidReference: b.bidReference,
      submittedAt: b.submittedAt,
      documentCount: b.documents.length,
      organizationName: profileByUser.get(b.bidderId.toString())?.organizationName ?? '(profile not found)',
    }));

    res.json({ sealed: false, deadline: tender.submissionDeadline, bids: rows });
  }),
);

officerBidsRouter.get(
  '/bids/:bidId',
  asyncRoute(async (req, res) => {
    const bid = await BidSubmission.findById(req.params.bidId).populate('documents');
    if (!bid) throw new ApiError(404, 'Bid not found.');
    if (bid.status !== 'submitted' && bid.status !== 'closed') throw new ApiError(404, 'Bid not found.');

    const tender = await Tender.findById(bid.tenderId);
    if (!tender) throw new ApiError(404, 'Tender not found.');
    if (officerVisibilityBlocked(tender)) throw new ApiError(403, 'This tender is still open for submissions — bids stay sealed until the deadline passes.');

    const profile = await BidderProfile.findOne({ userId: bid.bidderId });

    res.json({
      _id: bid._id,
      tenderId: tender._id,
      tenderNumber: tender.tenderNumber,
      tenderTitle: tender.title,
      status: bid.status,
      bidReference: bid.bidReference,
      submittedAt: bid.submittedAt,
      documentProcessingStatus: bid.documentProcessingStatus,
      complianceEvaluationStatus: bid.complianceEvaluationStatus,
      formData: bid.formData,
      documents: bid.documents,
      organizationName: profile?.organizationName ?? '(profile not found)',
      registrationNumber: profile?.registrationNumber ?? '',
      contactPerson: profile?.contactPerson ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
    });
  }),
);

// Phase 5.5 — officer view of a submitted document's real document-
// intelligence status/evidence (reuses the exact same BidDocument/BidEvidence
// data the bidder's own GET /documents/:id/evidence reads — no second
// evidence store, no compliance verdict computed or exposed here). Same
// sealed-bid gate as every other officer bid route.
officerBidsRouter.get(
  '/bid-documents/:id/evidence',
  asyncRoute(async (req, res) => {
    const doc = await BidDocument.findById(req.params.id);
    if (!doc) throw new ApiError(404, 'Document not found.');
    const bid = await BidSubmission.findById(doc.bidId);
    if (!bid || (bid.status !== 'submitted' && bid.status !== 'closed')) throw new ApiError(404, 'Document not found.');
    const tender = await Tender.findById(bid.tenderId);
    if (!tender || officerVisibilityBlocked(tender)) throw new ApiError(403, 'This tender is still open for submissions — bids stay sealed until the deadline passes.');

    const fields = doc.processingStatus === 'completed' ? await BidEvidence.find({ documentId: doc._id }).sort({ createdAt: 1 }) : [];

    await recordAuditEvent({
      tenderId: tender._id,
      bidId: bid._id,
      officerId: officerIdOf(req),
      action: 'EVIDENCE_VIEW',
      entityType: 'BidDocument',
      entityId: doc._id,
      result: doc.processingStatus,
      context: { requirementId: doc.requirementId ?? undefined, filename: doc.originalFilename },
    });

    res.json({
      status: doc.processingStatus,
      error: doc.processingStatus === 'failed' ? doc.processingError : undefined,
      documentType: doc.classifiedType,
      classificationConfidence: doc.classificationConfidence,
      requirementId: doc.requirementId,
      linkStatus: doc.linkStatus,
      fields,
    });
  }),
);

// Phase 6/10C — deterministic compliance evaluation. Pure rule-engine logic
// lives in services/complianceEvaluator.ts (no AI/LLM import anywhere in that
// module); the actual orchestration (load real data, call the evaluator,
// upsert, audit) lives in services/evaluationRunner.ts and is shared with the
// automatic post-submission trigger in documents.routes.ts — this route is
// now "Run/Re-run Evaluation": the FIRST evaluation normally already ran
// automatically right after document processing finished (see
// runAutomaticEvaluationIfReady), so most real calls here are a deliberate
// manual re-run. Idempotent regardless — an upsert keyed on
// (bidId, requirementId), so calling this repeatedly never creates duplicate
// rows and always reflects the current rule/evidence state.
officerBidsRouter.post(
  '/bids/:bidId/evaluate',
  asyncRoute(async (req, res) => {
    const bid = await BidSubmission.findById(req.params.bidId);
    if (!bid) throw new ApiError(404, 'Bid not found.');
    if (bid.status !== 'submitted' && bid.status !== 'closed') throw new ApiError(404, 'Bid not found.');

    const tender = await Tender.findById(bid.tenderId);
    if (!tender) throw new ApiError(404, 'Tender not found.');
    if (officerVisibilityBlocked(tender)) throw new ApiError(403, 'Compliance evaluation is available after the bid submission deadline.');

    // Guard against evaluating incomplete evidence — checked against the
    // real per-document state (not just the cached bid-level summary field),
    // so this works correctly even for a bid submitted before
    // documentProcessingStatus existed on the schema.
    const pdfDocs = await BidDocument.find({ bidId: bid._id, mimeType: 'application/pdf' }, { processingStatus: 1 });
    if (pdfDocs.some((d) => d.processingStatus === 'idle' || d.processingStatus === 'processing')) {
      throw new ApiError(409, 'Bid documents are still processing.');
    }

    // Determine run-vs-rerun before we upsert anything below.
    const priorEvaluationCount = await ComplianceEvaluation.countDocuments({ bidId: bid._id });

    const outcome = await runComplianceEvaluation(bid, tender, { officerId: officerIdOf(req), action: priorEvaluationCount > 0 ? 'COMPLIANCE_EVALUATION_RERUN' : 'COMPLIANCE_EVALUATION_RUN' });

    bid.complianceEvaluationStatus = 'COMPLETED';
    await bid.save();

    res.json({ bidId: bid._id, ...outcome });
  }),
);

// Read-only fetch of whatever evaluation results already exist, without
// re-running the evaluator — used by the officer UI to show "already
// evaluated" state on page load without forcing a fresh run.
officerBidsRouter.get(
  '/bids/:bidId/evaluate',
  asyncRoute(async (req, res) => {
    const bid = await BidSubmission.findById(req.params.bidId);
    if (!bid) throw new ApiError(404, 'Bid not found.');
    if (bid.status !== 'submitted' && bid.status !== 'closed') throw new ApiError(404, 'Bid not found.');

    const tender = await Tender.findById(bid.tenderId);
    if (!tender) throw new ApiError(404, 'Tender not found.');
    if (officerVisibilityBlocked(tender)) throw new ApiError(403, 'Compliance evaluation is available after the bid submission deadline.');

    const evaluations = await ComplianceEvaluation.find({ bidId: bid._id });
    if (evaluations.length === 0) {
      res.json({ bidId: bid._id, evaluated: false, summary: null, results: [], unconfigured: [] });
      return;
    }

    const requirements = await TenderRequirement.find({ tenderId: tender._id });
    const requirementById = new Map(requirements.map((r) => [r._id.toString(), r]));
    const rules = await ComplianceRule.find({ tenderId: tender._id });
    const configuredRequirementIds = new Set(rules.map((r) => r.requirementId.toString()));
    const unconfigured = requirements.filter((r) => !configuredRequirementIds.has(r._id.toString())).map((r) => ({ requirementId: r._id.toString(), requirementTitle: r.title }));

    const results = evaluations.map((e) => ({
      requirementId: e.requirementId.toString(),
      requirementTitle: requirementById.get(e.requirementId.toString())?.title ?? '(requirement removed)',
      ruleId: e.ruleId.toString(),
      result: e.result,
      reason: e.reason,
      finding: e.finding,
      evidenceIds: e.evidenceIds.map((id) => id.toString()),
    }));
    const summary = { pass: results.filter((r) => r.result === 'PASS').length, fail: results.filter((r) => r.result === 'FAIL').length, review: results.filter((r) => r.result === 'REVIEW').length };

    res.json({ bidId: bid._id, evaluated: true, summary, results, unconfigured, evaluatedAt: evaluations[0].evaluatedAt, evaluatorVersion: evaluations[0].evaluatorVersion });
  }),
);

// Phase 7 — officer human assessment of a requirement's compliance result.
// This is deliberately separate storage from ComplianceEvaluation: the
// deterministic PASS/FAIL/REVIEW (Phase 6) is machine-generated and
// immutable per evaluation run; this is the officer's own judgment about
// that result, and a re-run of the evaluator (which upserts
// ComplianceEvaluation) must never touch or lose this. Same sealed-bid gate
// as every other officer bid route.
async function loadBidAndTenderForAssessment(bidId: string) {
  const bid = await BidSubmission.findById(bidId);
  if (!bid) throw new ApiError(404, 'Bid not found.');
  if (bid.status !== 'submitted' && bid.status !== 'closed') throw new ApiError(404, 'Bid not found.');
  const tender = await Tender.findById(bid.tenderId);
  if (!tender) throw new ApiError(404, 'Tender not found.');
  if (officerVisibilityBlocked(tender)) throw new ApiError(403, 'Bid assessment is sealed until the submission deadline.');
  return { bid, tender };
}

officerBidsRouter.get(
  '/bids/:bidId/assessment',
  asyncRoute(async (req, res) => {
    const { bid } = await loadBidAndTenderForAssessment(req.params.bidId);
    const assessments = await OfficerAssessment.find({ bidId: bid._id });
    res.json(assessments);
  }),
);

const assessmentInputSchema = z.object({
  assessment: z.enum(ASSESSMENT_VALUES),
  comment: z.string().default(''),
});

officerBidsRouter.post(
  '/bids/:bidId/requirements/:requirementId/assessment',
  asyncRoute(async (req, res) => {
    const { bid, tender } = await loadBidAndTenderForAssessment(req.params.bidId);

    const requirement = await TenderRequirement.findById(req.params.requirementId);
    if (!requirement || requirement.tenderId.toString() !== tender._id.toString()) {
      throw new ApiError(404, 'Requirement not found for this tender.');
    }

    const input = assessmentInputSchema.parse(req.body);

    const existing = await OfficerAssessment.findOne({ bidId: bid._id, requirementId: requirement._id });

    // The officer records a judgment about the result — they never edit the
    // deterministic ComplianceEvaluation itself (no such field is accepted
    // here at all).
    const saved = await OfficerAssessment.findOneAndUpdate(
      { bidId: bid._id, requirementId: requirement._id },
      { bidId: bid._id, tenderId: tender._id, requirementId: requirement._id, assessment: input.assessment, comment: input.comment, officerId: officerIdOf(req) },
      { upsert: true, new: true },
    );

    await recordAuditEvent({
      tenderId: tender._id,
      bidId: bid._id,
      officerId: officerIdOf(req),
      action: existing ? 'OFFICER_ASSESSMENT_UPDATED' : 'OFFICER_ASSESSMENT_CREATED',
      entityType: 'OfficerAssessment',
      entityId: saved._id,
      result: input.assessment,
      context: { requirementId: requirement._id.toString(), requirementTitle: requirement.title },
      before: existing ? { assessment: existing.assessment, comment: existing.comment } : undefined,
      after: { assessment: saved.assessment, comment: saved.comment },
    });

    res.json(saved);
  }),
);

// Officer download of a submitted bid's document — same private-storage
// principle, ownership re-derived from the bid, and only reachable once the
// tender's deadline has passed (sealed-bid rule again).
//
// This is the only real way an officer "opens" a bid document in this
// application (there is no separate inline preview) — one click both views
// and downloads the file, so both audit actions are recorded for that one
// real event, not fabricated as two separate user actions.
officerBidsRouter.get(
  '/bid-documents/:documentId/download',
  asyncRoute(async (req, res) => {
    const doc = await BidDocument.findById(req.params.documentId);
    if (!doc) throw new ApiError(404, 'Document not found.');
    const bid = await BidSubmission.findById(doc.bidId);
    if (!bid || (bid.status !== 'submitted' && bid.status !== 'closed')) throw new ApiError(404, 'Document not found.');
    const tender = await Tender.findById(bid.tenderId);
    if (!tender || officerVisibilityBlocked(tender)) throw new ApiError(403, 'This tender is still open for submissions — documents stay sealed until the deadline passes.');

    await recordAuditEvent({ tenderId: tender._id, bidId: bid._id, officerId: officerIdOf(req), action: 'DOCUMENT_VIEW', entityType: 'BidDocument', entityId: doc._id, context: { filename: doc.originalFilename } });
    await recordAuditEvent({ tenderId: tender._id, bidId: bid._id, officerId: officerIdOf(req), action: 'DOCUMENT_DOWNLOAD', entityType: 'BidDocument', entityId: doc._id, context: { filename: doc.originalFilename } });

    res.download(doc.storagePath, doc.originalFilename);
  }),
);

// Phase 8 — tender clause / source-reference view. There was no dedicated
// endpoint for this before (the requirement's source fields were only ever
// bundled into the bulk requirements list) — added here specifically so
// TENDER_CLAUSE_VIEW reflects a real, deliberate officer action rather than
// being fabricated from data that was already loaded for another purpose.
officerBidsRouter.get(
  '/bids/:bidId/requirements/:requirementId/clause',
  asyncRoute(async (req, res) => {
    const { bid, tender } = await loadBidAndTenderForAssessment(req.params.bidId);
    const requirement = await TenderRequirement.findById(req.params.requirementId);
    if (!requirement || requirement.tenderId.toString() !== tender._id.toString()) {
      throw new ApiError(404, 'Requirement not found for this tender.');
    }

    await recordAuditEvent({
      tenderId: tender._id,
      bidId: bid._id,
      officerId: officerIdOf(req),
      action: 'TENDER_CLAUSE_VIEW',
      entityType: 'TenderRequirement',
      entityId: requirement._id,
      context: { requirementTitle: requirement.title },
    });

    res.json({
      requirementId: requirement._id,
      title: requirement.title,
      sourceDocument: requirement.sourceDocument || null,
      sourcePage: requirement.sourcePage ?? null,
      sourceClause: requirement.sourceClause || null,
    });
  }),
);

// Phase 8 — final procurement decision. A human-only judgment: never derived
// from PASS/FAIL/REVIEW counts, AI confidence, or any other automated
// signal. Stored separately from ComplianceEvaluation and OfficerAssessment;
// updating it never touches either of those collections.
const decisionInputSchema = z
  .object({
    decision: z.enum(FINAL_DECISIONS, { errorMap: () => ({ message: 'decision must be one of ACCEPTED, REVIEW, REJECTED.' }) }),
    comment: z.string().optional().default(''),
    reason: z.string().optional().default(''),
  })
  .refine((v) => v.decision !== 'REJECTED' || v.reason.trim().length > 0, { message: 'A non-empty reason is required to reject a bid.', path: ['reason'] });

officerBidsRouter.get(
  '/bids/:bidId/decision',
  asyncRoute(async (req, res) => {
    const { bid } = await loadBidAndTenderForAssessment(req.params.bidId);
    const decision = await FinalBidDecision.findOne({ bidId: bid._id });
    res.json(decision ?? null);
  }),
);

officerBidsRouter.post(
  '/bids/:bidId/decision',
  asyncRoute(async (req, res) => {
    const { bid, tender } = await loadBidAndTenderForAssessment(req.params.bidId);

    const parsed = decisionInputSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(422, parsed.error.issues.map((i) => i.message).join(' '));
    const input = parsed.data;

    const existing = await FinalBidDecision.findOne({ bidId: bid._id });

    const saved = await FinalBidDecision.findOneAndUpdate(
      { bidId: bid._id },
      { bidId: bid._id, tenderId: tender._id, decision: input.decision, comment: input.comment, reason: input.reason, officerId: officerIdOf(req) },
      { upsert: true, new: true },
    );

    await recordAuditEvent({
      tenderId: tender._id,
      bidId: bid._id,
      officerId: officerIdOf(req),
      action: existing ? 'FINAL_DECISION_UPDATED' : 'FINAL_DECISION_CREATED',
      entityType: 'FinalBidDecision',
      entityId: saved._id,
      result: input.decision,
      context: { comment: input.comment, reason: input.reason },
      before: existing ? { decision: existing.decision, comment: existing.comment, reason: existing.reason } : undefined,
      after: { decision: saved.decision, comment: saved.comment, reason: saved.reason },
    });

    res.json(saved);
  }),
);

// Phase 8 — real, bid-scoped audit trail (the officer Bid Assessment page's
// "View Audit Trail"). Read-only, newest first, real records only.
officerBidsRouter.get(
  '/bids/:bidId/audit',
  asyncRoute(async (req, res) => {
    const { bid } = await loadBidAndTenderForAssessment(req.params.bidId);
    const events = await AuditEvent.find({ bidId: bid._id }).sort({ timestamp: -1 }).limit(200);
    res.json(events);
  }),
);
