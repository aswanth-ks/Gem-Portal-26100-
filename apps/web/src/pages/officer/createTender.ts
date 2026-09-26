// Shared constants for the officer "Create tender" wizard so every step shows
// the same draft reference and stepper. Bidder requirements and evaluation
// rules are combined into one supervised "Compliance configuration" step.

import type { StepItem } from '@/components/primitives';

export const DRAFT_REF = 'TND-DRAFT-2026-0047';

export const CREATE_TENDER_STEPS: StepItem[] = [
  { label: 'Tender information' },
  { label: 'Tender documents' },
  { label: 'Compliance configuration' },
  { label: 'Review & publish' },
];

export const CREATE_TENDER_ROUTES = {
  info: '/officer/tenders/new',
  documents: '/officer/tenders/new/documents',
  compliance: '/officer/tenders/new/compliance',
  review: '/officer/tenders/new/review',
} as const;
