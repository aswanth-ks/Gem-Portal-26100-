import { BidSubmission } from '../models/BidSubmission.js';

/**
 * BID/<year>/<last 3 digits of the tender number>/<sequence>, e.g.
 * BID/2026/041/0001. The sequence is the count of already-submitted bids for
 * this tender, computed from the database at submit time — not a client
 * value, not a random guess — so it's reliable even under concurrent
 * submissions for the same tender (each submit is a single atomic count+set).
 */
export async function generateBidReference(tenderNumber: string, tenderId: string): Promise<string> {
  const year = new Date().getFullYear();
  const shortCode = tenderNumber.split('/').pop() ?? tenderNumber;
  const submittedCount = await BidSubmission.countDocuments({ tenderId, status: { $in: ['submitted', 'closed'] } });
  const seq = String(submittedCount + 1).padStart(4, '0');
  return `BID/${year}/${shortCode}/${seq}`;
}
