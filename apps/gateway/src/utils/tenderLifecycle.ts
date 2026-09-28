import type { HydratedDocument } from 'mongoose';

interface TenderLike {
  status: string;
  submissionDeadline: Date;
}

/**
 * The real server clock against the tender's own deadline — this is the
 * single place "is this tender still open for submission?" is decided.
 * Every route that creates/edits/submits a bid calls this; none of them
 * trust a client-supplied flag or the frontend's clock.
 */
export function isOpenForSubmission(tender: TenderLike | HydratedDocument<TenderLike>): boolean {
  return tender.status === 'published' && Date.now() < new Date(tender.submissionDeadline).getTime();
}
