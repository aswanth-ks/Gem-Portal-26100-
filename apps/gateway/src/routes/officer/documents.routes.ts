// Officer tender-document upload/list/download. Same private-storage
// principle as bidder documents.routes.ts: local disk under
// apps/gateway/uploads (gitignored), never served statically, and the only
// route that returns bytes checks the document actually belongs to the
// tender being asked about.

import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Tender } from '../../models/Tender.js';
import { TenderDocument } from '../../models/TenderDocument.js';
import { asyncRoute, ApiError } from '../../middleware/errorHandler.js';
import { env } from '../../config/env.js';

export const officerDocumentsRouter = Router();

fs.mkdirSync(env.uploadsDir, { recursive: true });

const ALLOWED_MIME = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png']);

const upload = multer({
  storage: multer.diskStorage({
    destination: env.uploadsDir,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME.has(file.mimetype)),
});

officerDocumentsRouter.post(
  '/tenders/:id/documents',
  upload.single('file'),
  asyncRoute(async (req, res) => {
    const tender = await Tender.findById(req.params.id);
    if (!tender) throw new ApiError(404, 'Tender not found.');
    if (tender.status === 'closed') throw new ApiError(409, 'This tender is closed.');

    const file = req.file;
    if (!file) throw new ApiError(400, 'No file was uploaded, or the file type is not allowed.');

    const doc = await TenderDocument.create({
      tenderId: tender._id,
      documentType: (req.body.documentType as string) ?? 'General',
      originalFilename: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      size: file.size,
    });
    res.status(201).json(doc);
  }),
);

officerDocumentsRouter.get(
  '/tenders/:id/documents',
  asyncRoute(async (req, res) => {
    const docs = await TenderDocument.find({ tenderId: req.params.id }).sort({ createdAt: -1 });
    res.json(docs);
  }),
);

officerDocumentsRouter.get(
  '/documents/:id/download',
  asyncRoute(async (req, res) => {
    const doc = await TenderDocument.findById(req.params.id);
    if (!doc) throw new ApiError(404, 'Document not found.');
    res.download(doc.storagePath, doc.originalFilename);
  }),
);

officerDocumentsRouter.delete(
  '/documents/:id',
  asyncRoute(async (req, res) => {
    const doc = await TenderDocument.findById(req.params.id);
    if (!doc) throw new ApiError(404, 'Document not found.');
    await doc.deleteOne();
    res.status(204).send();
  }),
);

// Phase 3A — AI requirement extraction. This is preview-only: nothing is
// written to TenderRequirement here. The gateway is the only thing that
// talks to the AI service (apps/ai); the browser never reaches it, and the
// AI service never receives a filesystem path — only the file's bytes.
const AI_CATEGORIES = ['statutory', 'financial', 'technical', 'experience', 'commercial', 'contractual', 'tender_specific', 'other'] as const;

const aiRequirementSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  category: z.enum(AI_CATEGORIES),
  mandatory: z.boolean(),
  conditional: z.boolean(),
  evidenceTypes: z.array(z.string()),
  source: z.object({
    documentPage: z.number().nullable(),
    clause: z.string().nullable(),
    excerpt: z.string(),
  }),
  confidence: z.number().min(0).max(1),
});

const aiAnalyzeResponseSchema = z.object({
  documentId: z.string(),
  status: z.literal('completed'),
  requirements: z.array(aiRequirementSchema),
  pageCount: z.number(),
  droppedCount: z.number().optional(),
});

// Reliability fix: real analysis (gateway -> apps/ai -> Ollama) can take
// several minutes on CPU (an 8m22s real run was measured against the actual
// CPCL tender PDF). The browser must not block synchronously for that —
// this runs as an in-process background task: the POST below flips the
// document's analysisStatus to 'processing' and responds immediately (202),
// then the actual work happens in `runAnalysis` without the request handler
// awaiting it. The frontend polls the GET route until status leaves
// 'processing'. No Redis/BullMQ/queue infra — a single in-process async
// function is enough for this single-instance MVP.
async function runAnalysis(documentId: string, tenderId: string) {
  const doc = await TenderDocument.findById(documentId);
  if (!doc) return; // deleted mid-flight — nothing to update

  try {
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(doc.storagePath);
    } catch {
      throw new ApiError(404, 'The stored document file could not be found on disk.');
    }

    const form = new FormData();
    form.append('tenderId', tenderId);
    form.append('documentId', documentId);
    form.append('file', new Blob([new Uint8Array(fileBuffer)], { type: doc.mimeType }), doc.originalFilename);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_800_000); // 30 min generous ceiling — this is background now, not blocking a request
    let aiRes: Response;
    try {
      aiRes = await fetch(`${env.aiServiceUrl}/ai/analyze-tender`, { method: 'POST', body: form, signal: controller.signal });
    } catch (fetchErr) {
      // FIX 1: the actual cause is logged here — never swallowed — even
      // though the browser only ever sees a sanitized status/message.
      // eslint-disable-next-line no-console
      console.error(`[gateway] AI analysis fetch failed for document ${documentId}:`, fetchErr);
      throw new ApiError(503, 'AI service unavailable. The tender document is still available and requirements can be entered manually.');
    } finally {
      clearTimeout(timeout);
    }

    const body = await aiRes.json().catch(() => null);
    if (!aiRes.ok) {
      const message = (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string' && body.detail) || 'AI analysis failed. The tender document is still available and requirements can be entered manually.';
      // eslint-disable-next-line no-console
      console.error(`[gateway] AI service returned ${aiRes.status} for document ${documentId}:`, body);
      throw new ApiError(aiRes.status, message);
    }

    // The gateway validates the AI service's response before it ever reaches
    // the officer UI — the architecture's "gateway validates, AI never talks
    // to Mongo" boundary applies to outbound responses too, not just input.
    const parsed = aiAnalyzeResponseSchema.safeParse(body);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error(`[gateway] AI response failed schema validation for document ${documentId}:`, parsed.error.issues);
      throw new ApiError(502, 'The AI service returned a response that did not match the expected schema.');
    }

    await TenderDocument.updateOne(
      { _id: documentId },
      { analysisStatus: 'completed', analysisResult: parsed.data, analysisCompletedAt: new Date(), analysisError: undefined },
    );
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'AI analysis failed unexpectedly. The tender document is still available and requirements can be entered manually.';
    if (!(err instanceof ApiError)) {
      // eslint-disable-next-line no-console
      console.error(`[gateway] unexpected error during background analysis of document ${documentId}:`, err);
    }
    await TenderDocument.updateOne({ _id: documentId }, { analysisStatus: 'failed', analysisError: message, analysisCompletedAt: new Date() });
  }
}

officerDocumentsRouter.post(
  '/tenders/:id/documents/:documentId/analyze',
  asyncRoute(async (req, res) => {
    const tender = await Tender.findById(req.params.id);
    if (!tender) throw new ApiError(404, 'Tender not found.');

    const doc = await TenderDocument.findById(req.params.documentId);
    if (!doc) throw new ApiError(404, 'Document not found.');
    if (doc.tenderId.toString() !== tender._id.toString()) throw new ApiError(403, 'This document does not belong to the specified tender.');
    if (doc.mimeType !== 'application/pdf') throw new ApiError(422, 'Only PDF documents can be analyzed by AI in this phase.');

    // Reuse a completed result instead of re-running Llama, and never start
    // a second job while one is already running (idempotent trigger).
    if (doc.analysisStatus === 'processing') {
      res.status(202).json({ status: 'processing' });
      return;
    }
    if (doc.analysisStatus === 'completed' && doc.analysisResult) {
      res.status(200).json(doc.analysisResult);
      return;
    }

    doc.analysisStatus = 'processing';
    doc.analysisError = undefined;
    doc.analysisStartedAt = new Date();
    doc.analysisCompletedAt = undefined;
    await doc.save();

    res.status(202).json({ status: 'processing' });

    // Fire-and-forget: intentionally not awaited so the response above isn't
    // blocked. Its own errors are caught internally (see runAnalysis) and
    // this .catch is only a last-resort net for something truly unexpected.
    void runAnalysis(doc._id.toString(), tender._id.toString()).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[gateway] runAnalysis rejected unexpectedly for document ${doc._id.toString()}:`, err);
    });
  }),
);

// Polling endpoint for the frontend — never triggers work, only reports the
// current job state (and the stored result once completed).
officerDocumentsRouter.get(
  '/tenders/:id/documents/:documentId/analyze',
  asyncRoute(async (req, res) => {
    const tender = await Tender.findById(req.params.id);
    if (!tender) throw new ApiError(404, 'Tender not found.');

    const doc = await TenderDocument.findById(req.params.documentId);
    if (!doc) throw new ApiError(404, 'Document not found.');
    if (doc.tenderId.toString() !== tender._id.toString()) throw new ApiError(403, 'This document does not belong to the specified tender.');

    if (doc.analysisStatus === 'completed' && doc.analysisResult) {
      res.json({ status: 'completed', ...(doc.analysisResult as object) });
      return;
    }
    if (doc.analysisStatus === 'failed') {
      res.json({ status: 'failed', error: doc.analysisError });
      return;
    }
    res.json({ status: doc.analysisStatus });
  }),
);
