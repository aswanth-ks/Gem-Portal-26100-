// Mock data shared by the Bid assessment list (tenders + bids) and the
// per-bid assessment page. Open tenders have no bidder-level data.
//
// The submission deadline (deadlineISO) is the source of truth for a
// tender's stage — see tenderLifecycle.ts. `underEvaluation` is the only
// thing an officer sets directly, and only applies once the vault is
// already open (it can never re-seal a tender or override the deadline).
//
// TODO: replace with GET /api/officer/bids?tender=… and /assessment.

import { isSealed, formatDeadline } from '@/pages/officer/tenderLifecycle';

export type Stage = 'open' | 'closed' | 'evaluation';

export interface Tender {
  ref: string;
  title: string;
  bids: number;
  stage: Stage;
  deadline: string;
  deadlineISO: string;
}

interface RawTender {
  ref: string;
  title: string;
  bids: number;
  deadlineISO: string;
  underEvaluation?: boolean;
}

const RAW_TENDERS: RawTender[] = [
  { ref: 'CPCL/PROC/2026/041', title: 'Supply of CCTV Cameras for Public Safety Infrastructure', bids: 8, deadlineISO: '2026-10-04T17:00' },
  { ref: 'CPCL/PROC/2026/039', title: 'Industrial Network Security Equipment', bids: 5, deadlineISO: '2026-10-02T15:00' },
  { ref: 'CPCL/PROC/2026/037', title: 'Control Room Display Systems', bids: 6, deadlineISO: '2026-10-12T12:00' },
  { ref: 'CPCL/PROC/2026/035', title: 'Industrial Safety Monitoring & Gas Detection Sensor Array', bids: 4, deadlineISO: '2026-09-22T17:00', underEvaluation: true },
];

function deriveStage(t: RawTender): Stage {
  if (isSealed(t.deadlineISO)) return 'open';
  return t.underEvaluation ? 'evaluation' : 'closed';
}

export const TENDERS: Tender[] = RAW_TENDERS.map((t) => ({
  ref: t.ref,
  title: t.title,
  bids: t.bids,
  deadlineISO: t.deadlineISO,
  deadline: formatDeadline(t.deadlineISO),
  stage: deriveStage(t),
}));

export const STAGE: Record<Stage, { label: string; tone: 'info' | 'warning' | 'neutral' }> = {
  open: { label: 'Submission open', tone: 'info' },
  closed: { label: 'Submission closed', tone: 'warning' },
  evaluation: { label: 'Under evaluation', tone: 'neutral' },
};

export type Result = 'pass' | 'review' | 'fail';
export type Risk = 'low' | 'medium' | 'high';
export type Review = 'ready' | 'reviewed' | 'attention';

export interface Bid {
  id: string;
  company: string;
  score: number;
  risk: Risk;
  result: Result;
  submitted: string;
  ts: number;
  passed: number;
  needsReview: number;
  review: Review;
}

const COMPANIES = ['ABC Engineering Pvt Ltd', 'Delta Equipments Pvt Ltd', 'National Safety Systems Ltd', 'Prime Industrial Solutions', 'Southern Automation Co.', 'Vision Infra Solutions', 'Coromandel Controls Ltd', 'Bharat Instruments Pvt Ltd'];

const BIDS_041: Omit<Bid, 'ts'>[] = [
  { id: 'BID-001', company: 'ABC Engineering Pvt Ltd', score: 92, risk: 'low', result: 'pass', submitted: '03 Oct 2026, 14:32', passed: 14, needsReview: 0, review: 'ready' },
  { id: 'BID-002', company: 'Delta Equipments Pvt Ltd', score: 87, risk: 'high', result: 'review', submitted: '03 Oct 2026, 16:18', passed: 11, needsReview: 2, review: 'attention' },
  { id: 'BID-003', company: 'National Safety Systems Ltd', score: 74, risk: 'medium', result: 'review', submitted: '04 Oct 2026, 10:42', passed: 12, needsReview: 1, review: 'attention' },
  { id: 'BID-004', company: 'Prime Industrial Solutions', score: 61, risk: 'high', result: 'fail', submitted: '04 Oct 2026, 11:08', passed: 9, needsReview: 1, review: 'attention' },
  { id: 'BID-005', company: 'Southern Automation Co.', score: 89, risk: 'low', result: 'pass', submitted: '04 Oct 2026, 12:15', passed: 14, needsReview: 0, review: 'ready' },
  { id: 'BID-006', company: 'Vision Infra Solutions', score: 83, risk: 'medium', result: 'pass', submitted: '04 Oct 2026, 13:40', passed: 13, needsReview: 0, review: 'ready' },
  { id: 'BID-007', company: 'Coromandel Controls Ltd', score: 78, risk: 'low', result: 'review', submitted: '04 Oct 2026, 15:02', passed: 13, needsReview: 1, review: 'attention' },
  { id: 'BID-008', company: 'Bharat Instruments Pvt Ltd', score: 90, risk: 'low', result: 'pass', submitted: '04 Oct 2026, 16:47', passed: 14, needsReview: 0, review: 'reviewed' },
];

function parseTs(s: string) {
  const [d, m, y, t] = s.replace(',', '').split(' ');
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(m);
  const [hh, mm] = t.split(':').map(Number);
  return new Date(Number(y), mon, Number(d), hh, mm).getTime();
}

function generate(t: Tender): Bid[] {
  return Array.from({ length: t.bids }, (_, i) => {
    const result: Result = i % 4 === 1 ? 'review' : i % 4 === 3 ? 'fail' : 'pass';
    const submitted = `${t.deadline.slice(0, 11)}, ${String(9 + i).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`;
    return {
      id: `BID-${String(i + 1).padStart(3, '0')}`,
      company: COMPANIES[(i + 2) % COMPANIES.length],
      score: [91, 79, 86, 58, 88][i % 5],
      risk: (['low', 'medium', 'low', 'high', 'medium'] as Risk[])[i % 5],
      result,
      submitted,
      ts: parseTs(submitted),
      passed: result === 'pass' ? 14 : result === 'review' ? 12 : 9,
      needsReview: result === 'pass' ? 0 : 1,
      review: t.stage === 'evaluation' && i < 2 ? 'reviewed' : result === 'pass' ? 'ready' : 'attention',
    };
  });
}

export const BIDS: Record<string, Bid[]> = {
  'CPCL/PROC/2026/041': BIDS_041.map((b) => ({ ...b, ts: parseTs(b.submitted) })),
  'CPCL/PROC/2026/039': generate(TENDERS[1]),
  'CPCL/PROC/2026/035': generate(TENDERS[3]),
};

export const refToSlug = (ref: string) => ref.replace(/\//g, '-');
export const slugToRef = (slug: string) => slug.replace(/-/g, '/');
export const assessmentPath = (ref: string, bidId: string) => `/officer/bids/${refToSlug(ref)}/${bidId}`;
