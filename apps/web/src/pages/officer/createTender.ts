// Shared constants + real-draft-id plumbing for the officer "Create tender"
// wizard (O04–O08) so every step shows the same stepper and operates on the
// same MongoDB tender document.
//
// The wizard's routes are fixed paths (no :id segment) — see AppRouter.tsx.
// Rather than restructure routing, the in-progress draft's real Mongo _id is
// kept in sessionStorage: it survives a refresh on the same step (Test 2)
// but is scoped to one browser tab, matching this wizard's single-draft-at-a-
// time design. Starting a new tender (Step 1 with no id) creates a fresh one.

import type { StepItem } from '@/components/primitives';

const DRAFT_ID_KEY = 'gem_portal_officer_draft_tender_id';

export function getDraftTenderId(): string | null {
  return sessionStorage.getItem(DRAFT_ID_KEY);
}
export function setDraftTenderId(id: string): void {
  sessionStorage.setItem(DRAFT_ID_KEY, id);
}
export function clearDraftTenderId(): void {
  sessionStorage.removeItem(DRAFT_ID_KEY);
}

export const CREATE_TENDER_STEPS: StepItem[] = [
  { label: 'Tender information' },
  { label: 'Tender documents' },
  { label: 'Bidder requirements' },
  { label: 'Rules & compliance' },
  { label: 'Review & publish' },
];

export const CREATE_TENDER_ROUTES = {
  info: '/officer/tenders/new',
  documents: '/officer/tenders/new/documents',
  requirements: '/officer/tenders/new/requirements',
  rules: '/officer/tenders/new/rules',
  review: '/officer/tenders/new/review',
} as const;
