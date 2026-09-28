import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { BidSubmission } from '../models/BidSubmission.js';
import { BidDocument } from '../models/BidDocument.js';
import { BidEvidence } from '../models/BidEvidence.js';
import { TenderRequirement } from '../models/TenderRequirement.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { asyncRoute, ApiError } from '../middleware/errorHandler.js';
import { isOpenForSubmission } from '../utils/tenderLifecycle.js';
import { linkRequirement } from '../utils/requirementLinking.js';
import { Tender } from '../models/Tender.js';
import { ComplianceRule } from '../models/ComplianceRule.js';
import { runComplianceEvaluation } from '../services/evaluationRunner.js';
import { env } from '../config/env.js';

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

fs.mkdirSync(env.uploadsDir, { recursive: true });

const ALLOWED_MIME = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']);

const upload = multer({
  storage: multer.diskStorage({
    destination: env.uploadsDir,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB, matches the bidder UI's stated limit
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME.has(file.mimetype)),
});

// Bid documents are private: they live under apps/gateway/uploads (gitignored,
// never served as a static/public directory) and the only route that reads
// their bytes back is /documents/:id/download below, which checks ownership
// first. There is no public URL for a bid document anywhere in this API.
//
// Phase 5.2 — Step 2 is document collection only. Upload stores the file and
// (optionally) the bidder's own choice of which requirement it satisfies; it
// does NOT call the AI service. Document-intelligence processing is deferred
// until after the bid is actually submitted (see bids.routes.ts's `/submit`,
// which calls triggerBidDocumentProcessing below).
documentsRouter.post(
  '/bids/:bidId',
  upload.single('file'),
  asyncRoute(async (req: AuthedRequest, res) => {
    const bid = await BidSubmission.findById(req.params.bidId);
    if (!bid) throw new ApiError(404, 'Bid not found.');
    if (bid.bidderId.toString() !== req.userId) throw new ApiError(403, 'You do not have access to this bid.');
    if (bid.status !== 'draft') throw new ApiError(409, 'This bid has already been submitted; documents can no longer be added.');

    const tender = await Tender.findById(bid.tenderId);
    if (!tender || !isOpenForSubmission(tender)) throw new ApiError(409, 'The submission deadline has passed.');

    const file = req.file;
    if (!file) throw new ApiError(400, 'No file was uploaded, or the file type is not allowed (PDF, DOC/DOCX, JPG, PNG).');

    const requirementIdRaw = typeof req.body.requirementId === 'string' && req.body.requirementId.trim() ? req.body.requirementId.trim() : null;
    let requirementId: string | null = null;
    if (requirementIdRaw) {
      const requirement = await TenderRequirement.findOne({ _id: requirementIdRaw, tenderId: bid.tenderId });
      if (!requirement) throw new ApiError(400, 'That requirement does not belong to this tender.');
      requirementId = requirement._id.toString();
    }

    const doc = await BidDocument.create({
      bidId: bid._id,
      bidderId: req.userId,
      documentType: (req.body.documentType as string) ?? 'General',
      originalFilename: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      size: file.size,
      // The bidder's own declared requirement, set at upload time — distinct
      // from the AI's own (possibly corrective) link computed later in
      // processDocument(), which overwrites this once real evidence exists.
      requirementId,
      linkStatus: requirementId ? 'linked' : 'unmatched',
    });
    bid.documents.push(doc._id);
    await bid.save();
    res.status(201).json(doc);
  }),
);

// Removes a document the bidder no longer wants attached to a draft bid —
// used by the Step 2 "Remove"/"Replace" actions. Only ever allowed before
// submission; once a bid is submitted its documents are immutable evidence.
documentsRouter.delete(
  '/:id',
  asyncRoute(async (req: AuthedRequest, res) => {
    const doc = await BidDocument.findById(req.params.id);
    if (!doc) throw new ApiError(404, 'Document not found.');
    if (doc.bidderId.toString() !== req.userId) throw new ApiError(403, 'You do not have access to this document.');

    const bid = await BidSubmission.findById(doc.bidId);
    if (bid && bid.status !== 'draft') throw new ApiError(409, 'This bid has already been submitted; documents can no longer be removed.');

    if (bid) {
      bid.documents = bid.documents.filter((d) => d.toString() !== doc._id.toString());
      await bid.save();
    }
    await BidEvidence.deleteMany({ documentId: doc._id });
    try {
      fs.unlinkSync(doc.storagePath);
    } catch {
      // file already gone — not fatal, the DB record is still removed
    }
    await doc.deleteOne();
    res.status(204).send();
  }),
);

// Phase 5 — bidder document evidence extraction. Reuses the exact provider
// abstraction (AI_PROVIDER=gemini|ollama) via the AI service's
// POST /ai/extract-document — no separate AI client, no direct Gemini/Ollama
// calls from the gateway.
const aiEvidenceFieldSchema = z.object({
  field: z.string().min(1),
  value: z.string(),
  normalizedValue: z.union([z.string(), z.number(), z.boolean()]).nullable().optional(),
  sourcePage: z.number().nullable().optional(),
  sourceText: z.string().default(''),
  confidence: z.number().min(0).max(1),
  status: z.enum(['extracted', 'review_required']),
});
const aiExtractResponseSchema = z.object({
  documentType: z.enum(['CA_CERTIFICATE', 'PAN', 'GST_CERTIFICATE', 'EXPERIENCE_CERTIFICATE', 'OEM_AUTHORIZATION', 'UNSUPPORTED']),
  classificationConfidence: z.number().min(0).max(1),
  fields: z.array(aiEvidenceFieldSchema),
  pageCount: z.number(),
});

async function processDocument(documentId: string) {
  const doc = await BidDocument.findById(documentId);
  if (!doc) return; // deleted mid-flight

  try {
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(doc.storagePath);
    } catch {
      throw new ApiError(404, 'The stored document file could not be found on disk.');
    }

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(fileBuffer)], { type: doc.mimeType }), doc.originalFilename);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_800_000); // background job, generous ceiling (see Phase 3A's identical pattern)
    let aiRes: Response;
    try {
      aiRes = await fetch(`${env.aiServiceUrl}/ai/extract-document`, { method: 'POST', body: form, signal: controller.signal });
    } catch (fetchErr) {
      // eslint-disable-next-line no-console
      console.error(`[gateway] document extraction fetch failed for document ${documentId}:`, fetchErr);
      throw new ApiError(503, 'AI service unavailable. The document is still stored and can be reviewed manually.');
    } finally {
      clearTimeout(timeout);
    }

    const body = await aiRes.json().catch(() => null);
    if (!aiRes.ok) {
      const message = (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string' && body.detail) || 'AI analysis failed.';
      // eslint-disable-next-line no-console
      console.error(`[gateway] AI service returned ${aiRes.status} for document ${documentId}:`, body);
      throw new ApiError(aiRes.status, message);
    }

    const parsed = aiExtractResponseSchema.safeParse(body);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error(`[gateway] AI extraction response failed schema validation for document ${documentId}:`, parsed.error.issues);
      throw new ApiError(502, 'The AI service returned a response that did not match the expected schema.');
    }

    const result = parsed.data;

    // Best-effort requirement link, derived from the tender's real
    // requirements — never hardcoded per document type.
    const bidForLinking = await BidSubmission.findById(doc.bidId);
    const requirements = bidForLinking ? await TenderRequirement.find({ tenderId: bidForLinking.tenderId }) : [];
    const link = linkRequirement(result.documentType, requirements);

    // Replace any prior evidence for this document (a re-run should not
    // duplicate rows).
    await BidEvidence.deleteMany({ documentId: doc._id });
    if (result.fields.length > 0) {
      await BidEvidence.insertMany(
        result.fields.map((f) => ({
          bidId: doc.bidId,
          documentId: doc._id,
          requirementId: link.requirementId,
          documentType: result.documentType,
          field: f.field,
          value: f.value,
          normalizedValue: f.normalizedValue ?? undefined,
          sourcePage: f.sourcePage ?? undefined,
          sourceText: f.sourceText,
          extractionConfidence: f.confidence,
          status: f.status,
        })),
      );
    }

    await BidDocument.updateOne(
      { _id: documentId },
      {
        processingStatus: 'completed',
        processingCompletedAt: new Date(),
        processingError: undefined,
        classifiedType: result.documentType,
        classificationConfidence: result.classificationConfidence,
        requirementId: link.requirementId,
        linkStatus: link.linkStatus,
      },
    );
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Document analysis failed unexpectedly. The document is still stored and can be reviewed manually.';
    if (!(err instanceof ApiError)) {
      // eslint-disable-next-line no-console
      console.error(`[gateway] unexpected error during background document processing ${documentId}:`, err);
    }
    await BidDocument.updateOne({ _id: documentId }, { processingStatus: 'failed', processingError: message, processingCompletedAt: new Date() });
  }
}

// Phase 10C — automatic post-submission pipeline: recomputes the bid's real
// documentProcessingStatus from the actual per-document state (never a
// separate counter that could drift), and once every PDF document has
// reached a terminal state (completed/failed), tries to run the deterministic
// evaluator automatically. Called after every single document settles —
// idempotent by construction, so it doesn't matter which document happens to
// finish last or whether several finish at nearly the same moment.
async function onDocumentProcessingSettled(bidId: string) {
  const pdfDocs = await BidDocument.find({ bidId, mimeType: 'application/pdf' }, { processingStatus: 1 });

  if (pdfDocs.length === 0) {
    // Nothing for the AI pipeline to process (e.g. only non-PDF documents
    // were uploaded) — vacuously "not started", not "completed": there is no
    // real processing to report as done.
    await BidSubmission.updateOne({ _id: bidId }, { documentProcessingStatus: 'NOT_STARTED' });
  } else {
    const stillGoing = pdfDocs.some((d) => d.processingStatus === 'idle' || d.processingStatus === 'processing');
    if (stillGoing) return; // wait for the rest — do not evaluate partial evidence
    const allFailed = pdfDocs.every((d) => d.processingStatus === 'failed');
    const anyFailed = pdfDocs.some((d) => d.processingStatus === 'failed');
    await BidSubmission.updateOne({ _id: bidId }, { documentProcessingStatus: allFailed ? 'FAILED' : anyFailed ? 'PARTIAL_FAILURE' : 'COMPLETED' });
  }

  await runAutomaticEvaluationIfReady(bidId);
}

// Phase 10C — the automatic evaluation trigger. Reuses the exact same
// deterministic evaluator/orchestration the officer's manual "Re-run
// Evaluation" button uses (services/evaluationRunner.ts) — there is no
// second evaluator and the LLM is never consulted here. Atomically claims
// the run via a conditional update on complianceEvaluationStatus, so calling
// this multiple times concurrently (several documents settling at once,
// a retry, a process restart) can never start two evaluation runs or create
// duplicate ComplianceEvaluation rows — only the caller that wins the
// compare-and-set proceeds.
async function runAutomaticEvaluationIfReady(bidId: string) {
  const claimed = await BidSubmission.findOneAndUpdate({ _id: bidId, complianceEvaluationStatus: { $in: ['NOT_STARTED', 'WAITING_FOR_DOCUMENTS'] } }, { complianceEvaluationStatus: 'PROCESSING' }, { new: true });
  if (!claimed) return; // another caller already claimed this run, or it already completed

  try {
    const tender = await Tender.findById(claimed.tenderId);
    if (!tender) {
      await BidSubmission.updateOne({ _id: bidId }, { complianceEvaluationStatus: 'FAILED' });
      return;
    }

    // Phase 10C §14 — do not invent rules. If the tender has none configured
    // yet, honestly report "not started" (not "failed") and let an officer
    // run it manually later once rules exist.
    const ruleCount = await ComplianceRule.countDocuments({ tenderId: tender._id });
    if (ruleCount === 0) {
      await BidSubmission.updateOne({ _id: bidId }, { complianceEvaluationStatus: 'NOT_STARTED' });
      return;
    }

    await runComplianceEvaluation(claimed, tender, { officerId: 'system', action: 'COMPLIANCE_EVALUATION_RUN', automatic: true });
    await BidSubmission.updateOne({ _id: bidId }, { complianceEvaluationStatus: 'COMPLETED' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[gateway] automatic compliance evaluation failed for bid ${bidId}:`, err);
    await BidSubmission.updateOne({ _id: bidId }, { complianceEvaluationStatus: 'FAILED' });
  }
}

// Phase 5.2 — called once, right after a bid is successfully submitted (see
// bids.routes.ts's `/:id/submit`). This is the ONLY place document-
// intelligence processing now starts from; upload no longer triggers it.
// Fire-and-forget per document, same as the manual /:id/process trigger below
// — the bid is already submitted and locked by the time this runs, so it
// never blocks the submit response.
export async function triggerBidDocumentProcessing(bidId: string) {
  const docs = await BidDocument.find({ bidId, mimeType: 'application/pdf', processingStatus: 'idle' });
  if (docs.length > 0) {
    await BidSubmission.updateOne({ _id: bidId }, { documentProcessingStatus: 'PROCESSING', complianceEvaluationStatus: 'WAITING_FOR_DOCUMENTS' });
  }
  for (const doc of docs) {
    doc.processingStatus = 'processing';
    doc.processingStartedAt = new Date();
    await doc.save();
    void processDocument(doc._id.toString())
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[gateway] processDocument rejected unexpectedly for document ${doc._id.toString()}:`, err);
      })
      .then(() => onDocumentProcessingSettled(bidId));
  }
  if (docs.length === 0) {
    void onDocumentProcessingSettled(bidId).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[gateway] onDocumentProcessingSettled failed for bid ${bidId}:`, err);
    });
  }
}

documentsRouter.post(
  '/:id/process',
  asyncRoute(async (req: AuthedRequest, res) => {
    const doc = await BidDocument.findById(req.params.id);
    if (!doc) throw new ApiError(404, 'Document not found.');
    if (doc.bidderId.toString() !== req.userId) throw new ApiError(403, 'You do not have access to this document.');

    // Idempotent trigger — never starts a second job while one is running,
    // never re-runs a completed one.
    if (doc.processingStatus === 'processing') {
      res.status(202).json({ status: 'processing' });
      return;
    }
    if (doc.processingStatus === 'completed') {
      res.status(200).json({ status: 'completed' });
      return;
    }

    doc.processingStatus = 'processing';
    doc.processingError = undefined;
    doc.processingStartedAt = new Date();
    doc.processingCompletedAt = undefined;
    await doc.save();
    res.status(202).json({ status: 'processing' });

    void processDocument(doc._id.toString())
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[gateway] processDocument rejected unexpectedly for document ${doc._id.toString()}:`, err);
      })
      .then(() => onDocumentProcessingSettled(doc.bidId.toString()));
  }),
);

documentsRouter.get(
  '/:id/evidence',
  asyncRoute(async (req: AuthedRequest, res) => {
    const doc = await BidDocument.findById(req.params.id);
    if (!doc) throw new ApiError(404, 'Document not found.');
    if (doc.bidderId.toString() !== req.userId) throw new ApiError(403, 'You do not have access to this document.');

    const fields = doc.processingStatus === 'completed' ? await BidEvidence.find({ documentId: doc._id }).sort({ createdAt: 1 }) : [];

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

documentsRouter.get(
  '/:id/download',
  asyncRoute(async (req: AuthedRequest, res) => {
    const doc = await BidDocument.findById(req.params.id);
    if (!doc) throw new ApiError(404, 'Document not found.');
    if (doc.bidderId.toString() !== req.userId) throw new ApiError(403, 'You do not have access to this document.');
    res.download(doc.storagePath, doc.originalFilename);
  }),
);
