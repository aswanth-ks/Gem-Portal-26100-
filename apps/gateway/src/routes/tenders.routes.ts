import { Router } from 'express';
import { Tender } from '../models/Tender.js';
import { TenderRequirement } from '../models/TenderRequirement.js';
import { asyncRoute, ApiError } from '../middleware/errorHandler.js';

export const tendersRouter = Router();

// Published-only, always — a draft/unpublished tender is never returned by
// this router regardless of what's requested, so there's no way for the
// bidder-facing API to leak an officer's in-progress tender.
tendersRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    const tenders = await Tender.find({ status: { $in: ['published', 'closed'] } }).sort({ submissionDeadline: 1 });
    res.json(tenders);
  }),
);

tendersRouter.get(
  '/:tenderNumber',
  asyncRoute(async (req, res) => {
    const tenderNumber = decodeURIComponent(req.params.tenderNumber);
    const tender = await Tender.findOne({ tenderNumber, status: { $in: ['published', 'closed'] } });
    if (!tender) throw new ApiError(404, 'Tender not found or not published.');
    res.json(tender);
  }),
);

// Phase 3A — real, officer-confirmed requirements (AI-extracted or manual;
// the bidder never sees the distinction, and never sees AI proposals that
// weren't accepted — those are never persisted at all). Same published/closed
// gate as the tender itself, so a draft tender's requirements are never
// reachable through this route either.
tendersRouter.get(
  '/:tenderNumber/requirements',
  asyncRoute(async (req, res) => {
    const tenderNumber = decodeURIComponent(req.params.tenderNumber);
    const tender = await Tender.findOne({ tenderNumber, status: { $in: ['published', 'closed'] } });
    if (!tender) throw new ApiError(404, 'Tender not found or not published.');
    const requirements = await TenderRequirement.find({ tenderId: tender._id }).sort({ code: 1 });
    res.json(requirements);
  }),
);
