import { Router } from 'express';
import { z } from 'zod';
import { Tender } from '../models/Tender.js';
import { BidSubmission } from '../models/BidSubmission.js';
import { BidDocument } from '../models/BidDocument.js';
import { TenderRequirement } from '../models/TenderRequirement.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { asyncRoute, ApiError } from '../middleware/errorHandler.js';
import { isOpenForSubmission } from '../utils/tenderLifecycle.js';
import { generateBidReference } from '../utils/bidReference.js';
import { triggerBidDocumentProcessing } from './documents.routes.js';

export const bidsRouter = Router();
bidsRouter.use(requireAuth);

/**
 * Loads a bid AND checks req.userId === bid.bidderId in one place. Every
 * route below goes through this — there is no route that reads or writes a
 * bid by id without this check, so bidder A can never touch bidder B's bid
 * by guessing/changing an id, from the UI or from curl.
 */
async function loadOwnBid(id: string, userId: string) {
  const bid = await BidSubmission.findById(id);
  if (!bid) throw new ApiError(404, 'Bid not found.');
  if (bid.bidderId.toString() !== userId) throw new ApiError(403, 'You do not have access to this bid.');
  return bid;
}

// -------------------------------------------------------------- list / read

bidsRouter.get(
  '/',
  asyncRoute(async (req: AuthedRequest, res) => {
    const bids = await BidSubmission.find({ bidderId: req.userId }).populate('tenderId').sort({ createdAt: -1 });
    res.json(bids);
  }),
);

bidsRouter.get(
  '/:id',
  asyncRoute(async (req: AuthedRequest, res) => {
    const bid = await loadOwnBid(req.params.id, req.userId!);
    await bid.populate(['tenderId', 'documents']);
    res.json(bid);
  }),
);

// -------------------------------------------------------------- create draft

const createSchema = z.object({ tenderNumber: z.string().min(1) });

bidsRouter.post(
  '/',
  asyncRoute(async (req: AuthedRequest, res) => {
    const { tenderNumber } = createSchema.parse(req.body);
    const tender = await Tender.findOne({ tenderNumber });
    if (!tender) throw new ApiError(404, 'Tender not found.');
    if (!isOpenForSubmission(tender)) throw new ApiError(409, 'This tender is not open for new bids (not published, or the submission deadline has passed).');

    const existing = await BidSubmission.findOne({ tenderId: tender._id, bidderId: req.userId });
    if (existing) return res.status(200).json(existing); // idempotent: "Start bid" on an existing draft just resumes it

    const bid = await BidSubmission.create({ tenderId: tender._id, bidderId: req.userId, status: 'draft', formData: {} });
    res.status(201).json(bid);
  }),
);

// -------------------------------------------------------------- edit draft

const patchSchema = z.object({ formData: z.record(z.any()) });

bidsRouter.patch(
  '/:id',
  asyncRoute(async (req: AuthedRequest, res) => {
    const bid = await loadOwnBid(req.params.id, req.userId!);
    if (bid.status !== 'draft') throw new ApiError(409, 'This bid has already been submitted and can no longer be edited.');

    const tender = await Tender.findById(bid.tenderId);
    if (!tender || !isOpenForSubmission(tender)) throw new ApiError(409, 'The submission deadline for this tender has passed. The draft can no longer be edited.');

    const { formData } = patchSchema.parse(req.body);
    bid.formData = { ...(bid.formData as object), ...formData };
    await bid.save();
    res.json(bid);
  }),
);

// -------------------------------------------------------------- final submit

bidsRouter.post(
  '/:id/submit',
  asyncRoute(async (req: AuthedRequest, res) => {
    const bid = await loadOwnBid(req.params.id, req.userId!);
    if (bid.status !== 'draft') throw new ApiError(409, 'This bid has already been submitted.');

    const tender = await Tender.findById(bid.tenderId);
    if (!tender) throw new ApiError(404, 'Tender not found.');
    if (!isOpenForSubmission(tender)) throw new ApiError(409, 'The submission deadline has passed. This bid can no longer be submitted.');
    if (!bid.formData || Object.keys(bid.formData as object).length === 0) throw new ApiError(422, 'Required bid details are missing.');
    if (!bid.documents || bid.documents.length === 0) throw new ApiError(422, 'At least one required document must be uploaded before submission.');

    // Every document-bearing requirement (one with evidenceTypes) that is
    // mandatory must have a document attached against it — mirrors the Step 2
    // checklist gate, enforced server-side so a client bypass can't skip it.
    const mandatoryRequirements = await TenderRequirement.find({ tenderId: tender._id, mandatory: true, evidenceTypes: { $exists: true, $not: { $size: 0 } } });
    if (mandatoryRequirements.length > 0) {
      const uploadedDocs = await BidDocument.find({ bidId: bid._id, requirementId: { $ne: null } }, { requirementId: 1 });
      const linkedRequirementIds = new Set(uploadedDocs.map((d) => d.requirementId?.toString()));
      const missing = mandatoryRequirements.filter((r) => !linkedRequirementIds.has(r._id.toString()));
      if (missing.length > 0) {
        throw new ApiError(422, `${missing.length} mandatory document${missing.length === 1 ? '' : 's'} still required: ${missing.map((r) => r.title).join(', ')}.`);
      }
    }

    bid.bidReference = await generateBidReference(tender.tenderNumber, tender._id.toString());
    bid.status = 'submitted';
    bid.submittedAt = new Date();
    await bid.save();
    res.json(bid);

    // Phase 5.2 — document-intelligence processing starts only now, after the
    // bid is locked. Fire-and-forget: the submit response above already went
    // out; the bidder never waits on Gemini/OCR to see their bid submitted.
    void triggerBidDocumentProcessing(bid._id.toString()).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[gateway] triggerBidDocumentProcessing failed unexpectedly for bid ${bid._id.toString()}:`, err);
    });
  }),
);
