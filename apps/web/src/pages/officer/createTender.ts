// Shared constants for the officer "Create tender" wizard (O04, O05, …) so
// every step shows the same draft reference and stepper.

import type { StepItem } from '@/components/primitives';

export const DRAFT_REF = 'TND-DRAFT-2026-0047';

export const CREATE_TENDER_STEPS: StepItem[] = [
  { label: 'Tender information' },
  { label: 'Tender documents' },
  { label: 'Bidder requirements' },
  { label: 'Technical & financial rules' },
  { label: 'Review & publish' },
];

export const CREATE_TENDER_ROUTES = {
  info: '/officer/tenders/new',
  documents: '/officer/tenders/new/documents',
  requirements: '/officer/tenders/new/requirements',
  rules: '/officer/tenders/new/rules',
  review: '/officer/tenders/new/review',
} as const;
