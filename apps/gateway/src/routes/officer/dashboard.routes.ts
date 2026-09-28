// Phase 5.5 — minimal real aggregation endpoints for the officer dashboard
// and review queue. Every number here is computed from the actual MongoDB
// collections at request time — nothing is hardcoded or cached as a fake
// snapshot. This intentionally does NOT compute or expose compliance
// scores/PASS-FAIL/risk — that engine does not exist yet (a later phase).

import { Router } from 'express';
import { Tender } from '../../models/Tender.js';
import { BidSubmission } from '../../models/BidSubmission.js';
import { BidDocument } from '../../models/BidDocument.js';
import { BidderProfile } from '../../models/BidderProfile.js';
import { AuditEvent } from '../../models/AuditEvent.js';
import { asyncRoute } from '../../middleware/errorHandler.js';

export const officerDashboardRouter = Router();

// Phase 8 — general (not-bid-scoped) audit trail for the officer Audit page.
// Real records only, newest first; if nothing has happened yet this returns
// an empty array and the page shows an honest empty state.
officerDashboardRouter.get(
  '/audit',
  asyncRoute(async (_req, res) => {
    const events = await AuditEvent.find({}).sort({ timestamp: -1 }).limit(200);
    res.json(events);
  }),
);

officerDashboardRouter.get(
  '/dashboard/summary',
  asyncRoute(async (_req, res) => {
    const tenders = await Tender.find({}, { status: 1, submissionStart: 1, submissionDeadline: 1 });
    const now = Date.now();
    let draftTenders = 0;
    let publishedTenders = 0;
    let closedTenders = 0;
    let submissionOpen = 0;
    let submissionClosed = 0;
    for (const t of tenders) {
      if (t.status === 'draft') draftTenders++;
      else if (t.status === 'closed') closedTenders++;
      else {
        publishedTenders++;
        const open = now >= t.submissionStart.getTime() && now < t.submissionDeadline.getTime();
        if (open) submissionOpen++;
        else submissionClosed++;
      }
    }

    const totalBids = await BidSubmission.countDocuments({ status: { $in: ['submitted', 'closed'] } });
    const documentsRequiringAttention = await BidDocument.countDocuments({ processingStatus: 'failed' });

    res.json({
      totalTenders: tenders.length,
      draftTenders,
      publishedTenders,
      closedTenders,
      submissionOpen,
      submissionClosed,
      totalBids,
      documentsRequiringAttention,
    });
  }),
);

// A real, honest "needs officer attention" queue — the only real signal
// available before Phase 6's compliance evaluator exists is a document that
// failed automatic processing. The sealed-bid rule still applies: a failure
// belonging to a tender whose submission window hasn't closed yet is not
// listed, exactly like every other officer bid route.
officerDashboardRouter.get(
  '/reviews',
  asyncRoute(async (_req, res) => {
    const now = new Date();
    const openTenders = await Tender.find({ submissionDeadline: { $gt: now } }, { _id: 1 });
    const sealedTenderIds = new Set(openTenders.map((t) => t._id.toString()));

    const failedDocs = await BidDocument.find({ processingStatus: 'failed' }).sort({ processingCompletedAt: -1 }).limit(50);
    if (failedDocs.length === 0) return res.json([]);

    const bidIds = [...new Set(failedDocs.map((d) => d.bidId.toString()))];
    const bids = await BidSubmission.find({ _id: { $in: bidIds }, status: { $in: ['submitted', 'closed'] } });
    const bidById = new Map(bids.map((b) => [b._id.toString(), b]));

    const tenderIds = [...new Set(bids.map((b) => b.tenderId.toString()))];
    const tenders = await Tender.find({ _id: { $in: tenderIds } });
    const tenderById = new Map(tenders.map((t) => [t._id.toString(), t]));

    const profiles = await BidderProfile.find({ userId: { $in: bids.map((b) => b.bidderId) } });
    const profileByUser = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const rows = [];
    for (const doc of failedDocs) {
      const bid = bidById.get(doc.bidId.toString());
      if (!bid) continue; // draft/deleted bid — not a real reviewable case
      const tender = tenderById.get(bid.tenderId.toString());
      if (!tender || sealedTenderIds.has(tender._id.toString())) continue; // still sealed

      rows.push({
        documentId: doc._id,
        filename: doc.originalFilename,
        error: doc.processingError,
        bidId: bid._id,
        bidReference: bid.bidReference,
        tenderNumber: tender.tenderNumber,
        organizationName: profileByUser.get(bid.bidderId.toString())?.organizationName ?? '(profile not found)',
      });
    }
    res.json(rows);
  }),
);
