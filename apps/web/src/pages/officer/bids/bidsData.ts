// Mock data for the officer Bids workspace (queue → tender bids → bid
// assessment). Tenders still open for submission expose only a bid count;
// bidder-level data exists only for tenders whose window has closed.
//
// TODO: replace with GET /api/officer/bids and /api/officer/bids/:ref.

export type TenderStage = 'open' | 'closed' | 'evaluation' | 'completed';
export type Assessment = 'sealed' | 'ready' | 'under_review' | 'findings' | 'completed';

export interface BidTender {
  ref: string;
  title: string;
  deadline: string; // display
  deadlineISO: string;
  bids: number;
  stage: TenderStage;
  assessment: Assessment;
}

export const BID_TENDERS: BidTender[] = [
  { ref: 'CPCL/PROC/2026/041', title: 'Supply of CCTV Cameras for Public Safety Infrastructure', deadline: '04 Oct 2026, 17:00', deadlineISO: '2026-10-04T17:00', bids: 8, stage: 'open', assessment: 'sealed' },
  { ref: 'CPCL/PROC/2026/039', title: 'Industrial Network Security Equipment', deadline: '08 Oct 2026, 15:00', deadlineISO: '2026-10-08T15:00', bids: 5, stage: 'open', assessment: 'sealed' },
  { ref: 'CPCL/PROC/2026/037', title: 'Control Room Display Systems', deadline: '24 Sep 2026, 12:00', deadlineISO: '2026-09-24T12:00', bids: 6, stage: 'closed', assessment: 'ready' },
  { ref: 'CPCL/PROC/2026/035', title: 'Industrial Safety Monitoring & Gas Detection Sensor Array', deadline: '22 Sep 2026, 17:00', deadlineISO: '2026-09-22T17:00', bids: 4, stage: 'evaluation', assessment: 'under_review' },
  { ref: 'CPCL/PROC/2026/033', title: 'Plant Access Control & Turnstile System', deadline: '19 Sep 2026, 15:00', deadlineISO: '2026-09-19T15:00', bids: 3, stage: 'evaluation', assessment: 'findings' },
  { ref: 'CPCL/PROC/2026/029', title: 'Fire Hydrant Pipeline Refurbishment', deadline: '02 Sep 2026, 12:00', deadlineISO: '2026-09-02T12:00', bids: 7, stage: 'completed', assessment: 'completed' },
];

export const STAGE_LABEL: Record<TenderStage, string> = {
  open: 'Submission open',
  closed: 'Submission closed',
  evaluation: 'Under evaluation',
  completed: 'Completed',
};

export const ASSESSMENT_LABEL: Record<Assessment, string> = {
  sealed: 'Sealed until closing',
  ready: 'Ready for review',
  under_review: 'Under review',
  findings: 'Verification findings',
  completed: 'Completed',
};

export type Processing = 'processed' | 'processing_complete';
export type BidAssessment = 'ready' | 'findings' | 'reviewed';

export interface Bid {
  id: string;
  bidder: string;
  submitted: string;
  processing: Processing;
  assessment: BidAssessment;
}

const GENERIC_BIDDERS = ['ABC Engineering Pvt Ltd', 'Delta Equipments Pvt Ltd', 'National Safety Systems Ltd', 'Southern Automation Co.', 'Vision Infra Solutions', 'Coromandel Controls Ltd', 'Bharat Instruments Pvt Ltd'];

/** Bids per closed tender (never generated for tenders still open). */
export function bidsFor(t: BidTender): Bid[] {
  if (t.stage === 'open') return [];
  if (t.ref === 'CPCL/PROC/2026/037') {
    return [
      { id: 'BID-001', bidder: 'ABC Engineering Pvt Ltd', submitted: '23 Sep 2026, 14:32', processing: 'processed', assessment: 'ready' },
      { id: 'BID-002', bidder: 'Delta Equipments Pvt Ltd', submitted: '23 Sep 2026, 16:18', processing: 'processed', assessment: 'ready' },
      { id: 'BID-003', bidder: 'National Safety Systems Ltd', submitted: '24 Sep 2026, 10:42', processing: 'processing_complete', assessment: 'findings' },
      { id: 'BID-004', bidder: 'Southern Automation Co.', submitted: '24 Sep 2026, 09:05', processing: 'processed', assessment: 'ready' },
      { id: 'BID-005', bidder: 'Vision Infra Solutions', submitted: '24 Sep 2026, 11:20', processing: 'processed', assessment: 'ready' },
      { id: 'BID-006', bidder: 'Coromandel Controls Ltd', submitted: '24 Sep 2026, 11:51', processing: 'processed', assessment: 'ready' },
    ];
  }
  return Array.from({ length: t.bids }, (_, i) => ({
    id: `BID-${String(i + 1).padStart(3, '0')}`,
    bidder: GENERIC_BIDDERS[i % GENERIC_BIDDERS.length],
    submitted: `${t.deadline.slice(0, 11)}, ${String(9 + i).padStart(2, '0')}:${String((i * 17) % 60).padStart(2, '0')}`,
    processing: 'processed',
    assessment: t.assessment === 'completed' ? 'reviewed' : t.assessment === 'findings' && i === 0 ? 'findings' : 'ready',
  }));
}

export const refToSlug = (ref: string) => ref.replace(/\//g, '-');
export const slugToRef = (slug: string) => slug.replace(/-/g, '/');
export const findTender = (slug?: string) => BID_TENDERS.find((t) => t.ref === slugToRef(slug ?? ''));
