// Procurement Officer — Bid assessment for one bid (opened by "View result"
// on the Bid assessment list). Evidence-driven investigation view:
//   LEFT  — compliance requirements; the selected one expands inline with
//           rule, source, evidence, finding and actions; then key findings,
//           the officer assessment (kept separate from the system finding)
//           and audit activity.
//   RIGHT — evidence for the selected requirement: page reference, extracted
//           evidence and viewer, plus submitted documents, source
//           verification and cross-source checks.
// Selecting a requirement shows only extracted evidence + metadata. Opening
// or downloading the protected original always asks for confirmation and is
// audit-logged (every access). Only reachable for closed tenders.
//
// TODO: GET /api/officer/bids/:ref/:bidId/assessment, POST audit events.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Callout, Card, Checkbox, DescriptionList, EmptyState, Icon, IconButton, Modal, PageHeader, StatusBadge, Tabs, Tag, Toast, VerificationBadge } from '@/components/primitives';
import { cn } from '@/utils/cn';
import { BIDS, STAGE, TENDERS, refToSlug, slugToRef, type Bid, type Result } from './assessmentData';
import { ResultBadge, RiskBadge } from './BidAssessmentWorkspacePage';

// ---------------------------------------------------------------- content

interface Doc {
  file: string;
  type: string;
  pages: string[][];
}

const docsFor = (company: string): Doc[] => [
  { file: 'PAN Certificate.pdf', type: 'PAN Certificate', pages: [['INCOME TAX DEPARTMENT · GOVT. OF INDIA', 'Permanent Account Number: AABCD1234E', `Name: ${company.toUpperCase()}`, 'Date of incorporation: 14/03/2011']] },
  {
    file: 'GST Certificate.pdf',
    type: 'GST Registration',
    pages: [['Form GST REG-06 · Registration Certificate', 'GSTIN: 33AABCD1234E1Z5', `Legal name: ${company.toUpperCase()}`, 'Principal place of business: Plot 14, SIDCO Industrial Estate, Guindy, Chennai 600032', 'Date of validity: From 01/07/2017']],
  },
  { file: 'Financial Statements.pdf', type: 'Financial Statements', pages: [['AUDITED FINANCIAL STATEMENTS · FY 2023-24 to 2025-26', 'Turnover FY24: ₹ 61,40,000', 'Turnover FY25: ₹ 68,95,000', 'Turnover FY26: ₹ 74,10,000', '3-year average: ₹ 68,15,000'], ['Auditor’s report', 'Signed: Chartered Accountant, M.No. 204518']] },
  {
    file: 'OEM Authorization.pdf',
    type: 'OEM Authorization',
    pages: [
      ['MANUFACTURER AUTHORIZATION FORM', `We authorise ${company} to quote and supply our IP CCTV and NVR products for tender CPCL/PROC/2026/041.`, 'Authorization validity: 10 Jun 2025 to 10 Jun 2026', 'Signed: Authorised signatory, OEM'],
      ['Annexure — Authorised product list', 'IP PTZ Camera 4K · NVR 64-channel · VMS licence'],
    ],
  },
  { file: 'Experience Certificate.pdf', type: 'Experience Certificate', pages: [['COMPLETION CERTIFICATE', 'Supply & commissioning of 96 IP CCTV cameras, Ennore Port Trust', 'Period: Apr 2021 – Jun 2024 (3 years 2 months)', 'Value: ₹ 58,20,000']] },
  { file: 'Technical Compliance.pdf', type: 'Technical Compliance Statement', pages: [['CLAUSE-BY-CLAUSE TECHNICAL COMPLIANCE', '1.1 Resolution 4K — Complied', '1.2 IP67 ingress — Complied', '1.3 IR night vision — Complied'], ['2.1 Storage retention 45 days — Complied', '3.1 Warranty 3 years — Complied', '4.1 Bid validity 90 days — Complied', '5.1 Local content: Class-I supplier — Self-certified']] },
  { file: 'Udyam Certificate.pdf', type: 'Udyam Registration', pages: [['UDYAM REGISTRATION CERTIFICATE', 'Udyam No.: UDYAM-TN-02-0012345', 'Type: Small enterprise', 'Registered on: 11/08/2020']] },
];

interface Req {
  id: string;
  name: string;
  result: Result;
  confidence: number;
  evidence: string;
  page: number; // 1-based
  highlight: string; // text of the evidence line on that page
  extracted: { label: string; value: string }[];
  clause: string;
  source: string;
  finding: string;
  rule: string;
  bidDate?: string;
  needsReview?: boolean;
}

function reqsFor(b: Bid): Req[] {
  const bidDate = b.submitted.slice(0, 11);
  const base = (id: string, name: string, confidence: number, evidence: string, page: number, highlight: string, extracted: Req['extracted'], rule: string, clause: string, source: string, finding: string): Req => ({
    id, name, result: 'pass', confidence, evidence, page, highlight, extracted, rule, clause, source, finding,
  });
  const oemResult: Result = b.result === 'pass' ? 'pass' : b.result === 'fail' ? 'fail' : 'review';
  const list: Req[] = [
    base('r1', 'PAN Certificate', 98, 'PAN Certificate.pdf', 1, 'Permanent Account Number', [{ label: 'PAN', value: 'AABCD1234E' }], 'Required', 'Copy of PAN card of the bidding entity.', 'Tender Document.pdf — Page 12', 'PAN present and legible; name matches bidder.'),
    base('r2', 'GST Registration', 97, 'GST Certificate.pdf', 1, 'GSTIN', [{ label: 'GSTIN', value: '33AABCD1234E1Z5' }, { label: 'Principal place of business', value: 'Plot 14, SIDCO Industrial Estate, Guindy, Chennai 600032' }], 'Required', 'Valid GST registration certificate.', 'Tender Document.pdf — Page 12', 'Active GSTIN found on the certificate.'),
    {
      ...base('r3', 'Average Annual Turnover ≥ ₹50L', 94, 'Financial Statements.pdf', 1, '3-year average', [{ label: '3-year average turnover', value: '₹ 68,15,000' }], 'Greater than or equal to ₹50 Lakhs', 'Average annual turnover of at least ₹50 Lakhs over the last 3 financial years.', 'Tender Document.pdf — Page 18', 'Average of 3 years = ₹68.15 Lakhs.'),
      ...(b.result === 'fail' ? { result: 'fail' as Result, finding: 'Average of 3 years = ₹41.2 Lakhs, below the ₹50 Lakh threshold.', extracted: [{ label: '3-year average turnover', value: '₹ 41,20,000' }], needsReview: true } : {}),
    },
    {
      ...base(
        'r4',
        'OEM Authorization',
        91,
        'OEM Authorization.pdf',
        1,
        'Authorization validity',
        [{ label: 'Authorization validity', value: oemResult === 'pass' ? '10 Jun 2026 — 10 Jun 2027' : '10 Jun 2025 — 10 Jun 2026' }],
        'Valid on bid date',
        'Valid OEM Authorization must be available on the bid date.',
        'Technical Specification.pdf — Page 20',
        oemResult === 'pass' ? 'Authorization valid on the relevant bid date.' : 'Submitted authorization appears expired on the relevant bid date.',
      ),
      result: oemResult,
      bidDate,
      needsReview: oemResult !== 'pass',
    },
    base('r5', 'Relevant Experience ≥ 3 Years', 93, 'Experience Certificate.pdf', 1, 'Period', [{ label: 'Experience period', value: 'Apr 2021 – Jun 2024 (3 years 2 months)' }], 'Greater than or equal to 3 years', 'At least 3 years of experience in similar CCTV/surveillance works.', 'Tender Document.pdf — Page 19', 'Completion certificate shows 3 years 2 months.'),
    {
      ...base('r6', 'Udyam Registration', 82, 'Udyam Certificate.pdf', 1, 'Udyam No.', [{ label: 'Udyam number', value: 'UDYAM-TN-02-0012345' }], 'Valid on bid date (conditional)', 'MSE bidders claiming exemption must submit a valid Udyam certificate.', 'Tender Document.pdf — Page 13', 'Certificate present; authorized source could not be checked.'),
      bidDate,
      ...(b.id === 'BID-002' ? { result: 'review' as Result, needsReview: true } : {}),
    },
    base('r7', 'Technical Compliance Statement', 96, 'Technical Compliance.pdf', 1, 'CLAUSE-BY-CLAUSE', [{ label: 'Statement', value: 'Present and signed' }], 'Required', 'Clause-by-clause technical compliance statement.', 'Technical Specification.pdf — Page 11', 'Statement present and signed.'),
    base('r8', 'Camera Resolution ≥ 4K', 95, 'Technical Compliance.pdf', 1, 'Resolution', [{ label: 'Declared resolution', value: '4K' }], 'Greater than or equal to 4K', 'Cameras shall be 4K or higher.', 'Technical Specification.pdf — Page 7', 'Declared 4K (clause 1.1).'),
    base('r9', 'Ingress Protection ≥ IP66', 95, 'Technical Compliance.pdf', 1, 'IP67', [{ label: 'Declared rating', value: 'IP67' }], 'Greater than or equal to IP66', 'IP66 or higher ingress rating.', 'Technical Specification.pdf — Page 8', 'Declared IP67 (clause 1.2).'),
    base('r10', 'Night Vision', 92, 'Technical Compliance.pdf', 1, 'night vision', [{ label: 'IR night vision', value: 'Complied' }], 'Required', 'IR night vision required.', 'Technical Specification.pdf — Page 7', 'IR night vision declared.'),
    base('r11', 'Storage Capacity ≥ 30 days', 90, 'Technical Compliance.pdf', 2, 'Storage retention', [{ label: 'Retention', value: '45 days' }], 'Greater than or equal to 30 days', 'Recording retention of at least 30 days.', 'Technical Specification.pdf — Page 8', 'Declared 45-day retention.'),
    base('r12', 'Warranty ≥ 3 years', 93, 'Technical Compliance.pdf', 2, 'Warranty', [{ label: 'Warranty', value: '3 years comprehensive' }], 'Greater than or equal to 3 years', 'Comprehensive warranty of at least 3 years.', 'Technical Specification.pdf — Page 9', 'Declared 3-year comprehensive warranty.'),
    base('r13', 'Bid Validity', 97, 'Technical Compliance.pdf', 2, 'Bid validity', [{ label: 'Bid validity', value: '90 days' }], 'Matches specified value', 'Bid validity as specified in the tender.', 'Tender Document.pdf — Page 21', '90-day validity declared, matches tender.'),
    base('r14', 'Local Content Declaration', 88, 'Technical Compliance.pdf', 2, 'Local content', [{ label: 'Supplier class', value: 'Class-I (self-certified)' }], 'Required', 'Class-I/II local supplier self-certification.', 'Tender Document.pdf — Page 24', 'Self-certification present.'),
  ];
  // Mark remaining non-pass items so "passed" matches the bid summary.
  let nonPass = 14 - b.passed - list.filter((r) => r.result !== 'pass').length;
  for (let i = list.length - 1; i >= 6 && nonPass > 0; i--) {
    if (list[i].result === 'pass') {
      list[i] = { ...list[i], result: 'fail', finding: 'Required declaration not found in the submitted documents.' };
      nonPass--;
    }
  }
  return list;
}

type VStatus = 'verified' | 'unverified' | 'conflict';
const VERIFICATIONS: { id: string; field: string; source: string; status: VStatus; checked: string; note?: string }[] = [
  { id: 'v1', field: 'GSTIN', source: 'Government source', status: 'verified', checked: '26 Sep 2026, 13:42' },
  { id: 'v2', field: 'PAN', source: 'Government source', status: 'verified', checked: '26 Sep 2026, 13:43' },
  { id: 'v3', field: 'Registered address', source: 'GST record vs bidder declaration', status: 'conflict', checked: '26 Sep 2026, 13:43' },
  { id: 'v4', field: 'Udyam', source: 'Authorized source', status: 'unverified', checked: '26 Sep 2026, 13:44', note: 'Source unavailable at verification time. No PASS decision is assigned from this source.' },
];

const ADDRESS_CLAUSE = { clause: 'Registered address declared by the bidder must match statutory registrations (GST/PAN).', source: 'Tender Document.pdf — Page 14' };

const now = () => new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });


function Section({ title, icon, aside, children, className }: { title: string; icon: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('border-t border-outline-variant px-5 py-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-on-surface">
          <Icon name={icon} size="sm" className="text-secondary" />
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

type Filter = 'all' | Result;
type FinalKind = 'accept' | 'review' | 'reject';

const FINAL: Record<FinalKind, { label: string; status: string; tone: 'success' | 'warning' | 'danger'; icon: string; title: string; confirm: string }> = {
  accept: { label: 'Accept bid', status: 'ACCEPTED', tone: 'success', icon: 'check_circle', title: 'Accept bid?', confirm: 'Confirm accept bid' },
  review: { label: 'Keep for review', status: 'REVIEW', tone: 'warning', icon: 'pending_actions', title: 'Keep bid for review', confirm: 'Confirm review' },
  reject: { label: 'Reject bid', status: 'REJECTED', tone: 'danger', icon: 'cancel', title: 'Reject bid?', confirm: 'Confirm reject bid' },
};

// ---------------------------------------------------------------- page

export function BidResultPage() {
  const { ref: slug, bidId } = useParams();
  const tender = TENDERS.find((t) => t.ref === slugToRef(slug ?? ''));
  const bid = tender && tender.stage !== 'open' ? (BIDS[tender.ref] ?? []).find((b) => b.id === bidId) : undefined;
  const listPath = `/officer/bids${tender ? `?tender=${refToSlug(tender.ref)}` : ''}`;

  if (!tender || !bid) {
    return (
      <OfficerPortalShell breadcrumb="Bid assessment">
        <EmptyState
          icon={tender?.stage === 'open' ? 'lock' : 'search_off'}
          title={tender?.stage === 'open' ? 'Assessments sealed until closing' : 'Bid not found'}
          description={tender?.stage === 'open' ? 'Individual bids unlock after the submission deadline.' : 'Check the link or return to the bid list.'}
          actions={<Button to={listPath}>Back to bids</Button>}
        />
      </OfficerPortalShell>
    );
  }

  return <BidResult key={`${tender.ref}/${bid.id}`} tenderTitle={tender.title} tenderRef={tender.ref} stageLabel={STAGE[tender.stage].label} bid={bid} listPath={listPath} />;
}

function BidResult({ tenderTitle, tenderRef, stageLabel, bid, listPath }: { tenderTitle: string; tenderRef: string; stageLabel: string; bid: Bid; listPath: string }) {
  const docs = useMemo(() => docsFor(bid.company), [bid.company]);
  const [reqs, setReqs] = useState(() => reqsFor(bid));
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState(() => reqs.find((r) => r.needsReview)?.id ?? reqs[0].id);
  // Evidence viewer state
  const [viewerDoc, setViewerDoc] = useState(() => (reqs.find((r) => r.needsReview) ?? reqs[0]).evidence);
  const [page, setPage] = useState(() => (reqs.find((r) => r.needsReview) ?? reqs[0]).page);
  const [highlight, setHighlight] = useState<string | null>(() => (reqs.find((r) => r.needsReview) ?? reqs[0]).highlight);
  const [zoom, setZoom] = useState(100);
  const [openedDoc, setOpenedDoc] = useState<string | null>(null); // original unlocked (this viewing only)
  const [pendingDoc, setPendingDoc] = useState<{ doc: Doc; action: 'view' | 'download' } | null>(null);
  // Dialogs / misc
  const [clause, setClause] = useState<{ clause: string; source: string } | null>(null);
  const [expandedV, setExpandedV] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [decision, setDecision] = useState<Result | null>(null);
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState<{ decision: Result; time: string } | null>(null);
  const [audit, setAudit] = useState<{ event: string; time: string; detail?: string[] }[]>(() => [{ event: 'Assessment opened', time: now() }]);
  const [toast, setToast] = useState<string | null>(null);
  // Final bid decision — only ever set by an explicit, confirmed officer action.
  const [finalDraft, setFinalDraft] = useState<FinalKind | null>(null);
  const [finalText, setFinalText] = useState('');
  const [finalTouched, setFinalTouched] = useState(false);
  const [finalDecision, setFinalDecision] = useState<{ kind: FinalKind; time: string; text: string } | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const log = (event: string) => setAudit((a) => [{ event, time: now() }, ...a]);

  function openFinal(kind: FinalKind) {
    setFinalText('');
    setFinalTouched(false);
    setFinalDraft(kind);
  }

  function confirmFinal() {
    if (!finalDraft) return;
    setFinalTouched(true);
    if (finalDraft === 'reject' && !finalText.trim()) return;
    const time = now();
    const text = finalText.trim();
    setFinalDecision({ kind: finalDraft, time, text });
    setAudit((a) => [
      {
        event: 'FINAL BID DECISION RECORDED',
        time,
        detail: [
          `Bid: ${bid.id}`,
          `Bidder: ${bid.company}`,
          `Decision: ${FINAL[finalDraft].status === 'ACCEPTED' ? 'Accepted' : FINAL[finalDraft].status === 'REJECTED' ? 'Rejected' : 'Review'}`,
          'Officer: Procurement Officer',
          `Timestamp: ${time} IST`,
          `${finalDraft === 'reject' ? 'Reason' : 'Comment'}: ${text || '—'}`,
        ],
      },
      ...a,
    ]);
    setToast(`Final decision recorded: ${FINAL[finalDraft].status}`);
    setFinalDraft(null);
  }

  const selected = reqs.find((r) => r.id === selectedId) ?? reqs[0];
  const doc = docs.find((d) => d.file === viewerDoc) ?? docs[0];
  const unlocked = openedDoc === doc.file;
  const pageLines = doc.pages[page - 1] ?? [];

  const passed = reqs.filter((r) => r.result === 'pass').length;
  const needsReview = reqs.filter((r) => r.needsReview).length;
  const hasConflict = tenderRef === 'CPCL/PROC/2026/041' && bid.id === 'BID-002';
  const isReview = (r: Req) => r.needsReview || r.result === 'review';
  const counts = { all: reqs.length, pass: passed, fail: reqs.filter((r) => r.result === 'fail').length, review: reqs.filter(isReview).length };
  const visible = reqs.filter((r) => filter === 'all' || (filter === 'review' ? isReview(r) : r.result === filter));

  /** Show a requirement's evidence (metadata + extracted only — original stays locked). */
  function showEvidence(r: Req) {
    setViewerDoc(r.evidence);
    setPage(r.page);
    setHighlight(r.highlight);
    setOpenedDoc(null);
    log(`${r.name} evidence viewed`);
  }

  function selectReq(r: Req) {
    setSelectedId(r.id);
    showEvidence(r);
  }

  function showDoc(d: Doc, action: 'view' | 'download') {
    setPendingDoc({ doc: d, action });
  }

  function confirmDoc() {
    if (!pendingDoc) return;
    const { doc: d, action } = pendingDoc;
    if (action === 'view') {
      if (d.file !== viewerDoc) {
        setViewerDoc(d.file);
        setPage(1);
        setHighlight(null);
      }
      setOpenedDoc(d.file);
      log(`${d.type} document opened`);
    } else {
      log(`${d.type} document downloaded`);
      setToast(`${d.file} download recorded`);
    }
    setPendingDoc(null);
  }

  function showClause(c: { clause: string; source: string }, label: string) {
    setClause(c);
    log(`${label} tender clause viewed`);
  }

  function flag(r: Req) {
    setReqs((all) => all.map((x) => (x.id === r.id ? { ...x, needsReview: true } : x)));
    log(`${r.name} flagged for review`);
    setToast(`${r.name} flagged for review`);
  }

  const findings = [
    ...reqs
      .filter((r) => r.needsReview && r.result !== 'pass' && r.id !== 'r6') // Udyam: verification gap, shown under Source verification
      .map((r) => ({ key: r.id, text: r.finding.replace(/\.$/, ''), evidence: () => selectReq(r), clause: () => showClause(r, r.name) })),
    ...(hasConflict
      ? [
          {
            key: 'address',
            text: 'Registered address differs between submitted documents',
            evidence: () => {
              const gst = reqs.find((r) => r.id === 'r2')!;
              setSelectedId(gst.id);
              setViewerDoc(gst.evidence);
              setPage(1);
              setHighlight('Principal place of business');
              setOpenedDoc(null);
              log('Registered address evidence viewed');
            },
            clause: () => showClause(ADDRESS_CLAUSE, 'Registered address'),
          },
        ]
      : []),
  ];

  const extracted = selected.evidence === doc.file ? selected.extracted : [];

  return (
    <OfficerPortalShell breadcrumb={bid.id}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Button variant="ghost" size="sm" leftIcon="arrow_back" to={listPath} className="-ml-2 self-start">
            Back to bids
          </Button>
          <PageHeader
            breadcrumbs={[{ label: 'Bids', to: listPath }, { label: tenderRef, to: listPath }, { label: bid.id }]}
            eyebrow={
              <>
                <StatusBadge tone="warning">{stageLabel}</StatusBadge>
                {finalDecision && <StatusBadge tone={FINAL[finalDecision.kind].tone} icon="gavel">Final decision: {FINAL[finalDecision.kind].status}</StatusBadge>}
                {saved ? <StatusBadge tone="success" icon="task_alt">Officer reviewed</StatusBadge> : needsReview ? <StatusBadge tone="warning">Review required</StatusBadge> : <StatusBadge tone="info">Ready for officer review</StatusBadge>}
              </>
            }
            title="Bid assessment"
            description="Review compliance findings, evidence, verification results, and exceptions."
            meta={
              <>
                <span className="font-semibold text-on-surface">{bid.company}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[12px]">{bid.id}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {tenderTitle} <span className="font-mono text-[12px]">({tenderRef})</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>Submitted {bid.submitted}</span>
              </>
            }
          />
        </div>

        {/* AI-generated assessment summary */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-low px-5 py-2.5">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">
              <Icon name="auto_awesome" size="sm" className="text-secondary" />
              AI-generated assessment · system finding
            </span>
            <span className="text-[12px] text-on-surface-variant">AI assists with extraction and verification analysis. Final assessment remains with the Procurement Officer.</span>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-outline-variant">
            {[
              { label: 'Compliance', value: <span className="num">{bid.score}<span className="text-body-sm font-normal text-on-surface-variant"> / 100</span></span> },
              { label: 'Risk', value: <RiskBadge r={bid.risk} /> },
              { label: 'Requirements', value: <span className="num">{passed}<span className="text-body-sm font-normal text-on-surface-variant"> / {reqs.length} passed</span></span> },
              { label: 'Needs review', value: <span className={cn('num', needsReview && 'text-warning-on-container')}>{needsReview}</span> },
              { label: 'Documents', value: <span className="num">{docs.length}<span className="text-body-sm font-normal text-on-surface-variant"> / {docs.length} processed</span></span> },
              { label: 'Assessment', value: needsReview ? <StatusBadge tone="warning">Officer review required</StatusBadge> : <ResultBadge r={bid.result} /> },
            ].map((s) => (
              <div key={s.label} className="px-5 py-4">
                <dt className="text-[12px] text-on-surface-variant">{s.label}</dt>
                <dd className="mt-1 text-headline-sm font-semibold text-on-surface">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Investigation workspace: requirements (left) · evidence (right) */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
          {/* LEFT — compliance assessment */}
          <Card padding="none" className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
              <h2 className="inline-flex items-center gap-2 text-headline-sm font-semibold text-on-surface">
                <Icon name="fact_check" size="md" className="text-secondary" />
                Compliance assessment
              </h2>
              <Tag>System finding</Tag>
            </div>
            <div className="px-5">
              <Tabs
                ariaLabel="Result filter"
                value={filter}
                onChange={(id) => setFilter(id as Filter)}
                items={[
                  { id: 'all', label: 'All', count: counts.all },
                  { id: 'pass', label: 'Passed', count: counts.pass },
                  { id: 'fail', label: 'Failed', count: counts.fail, countTone: counts.fail ? 'danger' : undefined },
                  { id: 'review', label: 'Needs review', count: counts.review, countTone: counts.review ? 'warning' : undefined },
                ]}
              />
            </div>

            <ul className="border-t border-outline-variant">
              {visible.map((r) => {
                const active = r.id === selected.id;
                return (
                  <li key={r.id} className={cn('relative border-b border-outline-variant/70', active && 'bg-info-container/40')}>
                    {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-secondary" />}
                    <button type="button" onClick={() => selectReq(r)} aria-expanded={active} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-container-low/60">
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-on-surface">{r.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-on-surface-variant">
                          <span className="inline-flex items-center gap-1">
                            <Icon name="link" size="xs" /> Evidence linked
                          </span>
                          {r.needsReview && (
                            <span className="inline-flex items-center gap-1 text-warning-on-container">
                              <Icon name="flag" size="xs" /> Needs review
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="num w-10 text-right text-[13px] text-on-surface-variant">{r.confidence}%</span>
                      <ResultBadge r={r.result} />
                      <Icon name={active ? 'expand_less' : 'expand_more'} size="md" className="text-outline" />
                    </button>

                    {active && (
                      <div className="px-5 pb-4">
                        <Callout tone={r.result === 'pass' ? 'success' : r.result === 'fail' ? 'danger' : 'warning'} icon="info" title="Finding">
                          “{r.finding}”
                        </Callout>
                        <DescriptionList
                          className="mt-3"
                          items={[
                            { label: 'Requirement', value: r.clause },
                            { label: 'Rule', value: r.rule },
                            { label: 'Confidence', value: `${r.confidence}%` },
                            { label: 'Tender source', value: r.source },
                            { label: 'Bidder evidence', value: `${r.evidence} — Page ${r.page}` },
                            ...(r.bidDate ? [{ label: 'Relevant bid date', value: r.bidDate }] : []),
                            ...r.extracted.map((e) => ({ label: `Extracted ${e.label.toLowerCase()}`, value: e.value })),
                          ]}
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" leftIcon="menu_book" onClick={() => showClause(r, r.name)}>
                            View tender clause
                          </Button>
                          <Button size="sm" variant="secondary" leftIcon="visibility" onClick={() => showEvidence(r)}>
                            View evidence
                          </Button>
                          <Button size="sm" variant={r.needsReview ? 'ghost' : 'primary'} leftIcon="flag" disabled={r.needsReview} onClick={() => flag(r)}>
                            {r.needsReview ? 'Flagged for review' : 'Flag for review'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
              {visible.length === 0 && <li className="px-5 py-8 text-center text-body-sm text-on-surface-variant">Nothing in this filter.</li>}
            </ul>

            <Section
              title="Key findings"
              icon="flag"
              aside={findings.length > 0 && <span className="text-[12px] font-semibold text-warning-on-container">{findings.length} {findings.length === 1 ? 'item requires' : 'items require'} officer attention</span>}
            >
              {findings.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No items flagged for officer attention.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {findings.map((f, i) => (
                    <li key={f.key} className="rounded-control border border-warning-border bg-warning-container/40 px-3.5 py-3">
                      <div className="text-[14px] text-on-surface">
                        {i + 1}. {f.text}.
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" leftIcon="visibility" onClick={f.evidence}>
                          View evidence
                        </Button>
                        <Button size="sm" variant="secondary" leftIcon="menu_book" onClick={f.clause}>
                          View tender clause
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            {/* Officer assessment — separate from the system finding */}
            <section className="border-t-4 border-navy bg-surface-container-low px-5 py-5">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-on-surface">
                  <Icon name="gavel" size="sm" className="text-navy" />
                  Officer assessment
                </h3>
                <Tag>Final recorded assessment</Tag>
              </div>
              <p className="mb-4 text-body-sm text-on-surface-variant">Review the evidence before recording your assessment. This is independent of the system finding above.</p>

              {saved ? (
                <div className="flex flex-col gap-3 rounded-card border border-outline-variant bg-surface-container-lowest p-4">
                  <div className="flex items-center gap-2 text-[14px] text-on-surface">
                    Final officer assessment: <ResultBadge r={saved.decision} />
                  </div>
                  <div className="text-[12px] text-on-surface-variant">Saved {saved.time} IST · Procurement Officer</div>
                  {comment && <p className="text-body-sm text-on-surface">“{comment}”</p>}
                  <Button size="sm" variant="secondary" className="self-start" onClick={() => setSaved(null)}>
                    Revise
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div role="radiogroup" aria-label="Officer assessment" className="grid grid-cols-3 gap-2">
                    {(['pass', 'review', 'fail'] as Result[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={decision === d}
                        onClick={() => setDecision(d)}
                        className={cn(
                          'focus-ring h-10 rounded-control border text-[14px] font-semibold transition-all',
                          decision === d
                            ? d === 'pass'
                              ? 'border-success bg-success-container text-success-on-container'
                              : d === 'fail'
                                ? 'border-danger bg-danger-container text-danger-on-container'
                                : 'border-warning bg-warning-container text-warning-on-container'
                            : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline',
                        )}
                      >
                        {d.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="off-comment" className="text-[13px] font-semibold text-on-surface">
                      Officer comment
                    </label>
                    <textarea
                      id="off-comment"
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Reasoning for your assessment"
                      className="w-full rounded-control border border-outline-variant bg-surface-container-lowest px-3.5 py-3 text-[14px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-secondary focus:shadow-focus"
                    />
                  </div>
                  <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} label="I have reviewed the evidence associated with this assessment." />
                  <div className="flex flex-wrap justify-end gap-2.5">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        log('Additional review requested');
                        setToast('Additional review requested');
                      }}
                    >
                      Request additional review
                    </Button>
                    <Button
                      leftIcon="save"
                      disabled={!decision || !confirmed}
                      onClick={() => {
                        setSaved({ decision: decision!, time: now() });
                        if (comment.trim()) log('Officer comment added');
                        log(`Officer assessment saved: ${decision!.toUpperCase()}`);
                        setToast('Officer assessment saved');
                      }}
                    >
                      Save officer assessment
                    </Button>
                  </div>
                  <p className="text-[12px] text-on-surface-variant">AI-generated assessment is decision support. The Procurement Officer records the final assessment.</p>
                </div>
              )}
            </section>

            {/* Final bid decision — explicit officer action, never automatic */}
            <section aria-labelledby="final-decision-title" className="border-t border-outline-variant px-5 py-5">
              <div className="rounded-card border-2 border-navy/20 bg-surface-container-lowest p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 id="final-decision-title" className="inline-flex items-center gap-2 text-[16px] font-semibold text-on-surface">
                      <Icon name="gavel" size="sm" className="text-navy" />
                      Final bid decision
                    </h3>
                    <p className="mt-0.5 text-body-sm text-on-surface-variant">Record the final decision for this bid after reviewing the evidence and assessment.</p>
                  </div>
                  {finalDecision && (
                    <StatusBadge tone={FINAL[finalDecision.kind].tone} icon={FINAL[finalDecision.kind].icon}>
                      {FINAL[finalDecision.kind].status}
                    </StatusBadge>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-control bg-surface-container-low px-4 py-3 sm:grid-cols-3">
                  {[
                    { k: 'Bid', v: <span className="font-mono">{bid.id}</span> },
                    { k: 'Bidder', v: bid.company, wide: true },
                    { k: 'Compliance', v: <span className="num">{bid.score} / 100</span> },
                    { k: 'Risk', v: <RiskBadge r={bid.risk} /> },
                    { k: 'Requirements', v: <span className="num">{passed} / {reqs.length} passed</span> },
                    { k: 'Needs review', v: <span className="num">{needsReview}</span> },
                  ].map((s) => (
                    <div key={s.k} className={cn('min-w-0', 'wide' in s && s.wide && 'sm:col-span-2')}>
                      <dt className="text-[12px] text-on-surface-variant">{s.k}</dt>
                      <dd className="truncate text-[14px] font-semibold text-on-surface">{s.v}</dd>
                    </div>
                  ))}
                </dl>

                {finalDecision ? (
                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Final decision</span>
                      <StatusBadge tone={FINAL[finalDecision.kind].tone} icon={FINAL[finalDecision.kind].icon}>
                        {FINAL[finalDecision.kind].status}
                      </StatusBadge>
                    </div>
                    <DescriptionList
                      items={[
                        { label: 'Decision recorded by', value: 'Procurement Officer' },
                        { label: 'Decision time', value: `${finalDecision.time} IST` },
                        { label: finalDecision.kind === 'reject' ? 'Rejection reason' : 'Officer comment', value: finalDecision.text || '—' },
                      ]}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => {
                          setAuditOpen(true);
                          setTimeout(() => document.getElementById('audit-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                        }}
                      >
                        View audit trail →
                      </Button>
                      <Button size="sm" variant="secondary" leftIcon="edit" onClick={() => setFinalDecision(null)}>
                        Change decision
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Button leftIcon="check_circle" onClick={() => openFinal('accept')}>
                        Accept bid
                      </Button>
                      <Button variant="secondary" leftIcon="pending_actions" onClick={() => openFinal('review')}>
                        Keep for review
                      </Button>
                      <Button variant="danger" leftIcon="cancel" onClick={() => openFinal('reject')}>
                        Reject bid
                      </Button>
                    </div>
                    <p className="mt-3 text-[12px] text-on-surface-variant">
                      No decision is recorded automatically. Compliance score and risk are decision support only — each option asks for confirmation.
                    </p>
                  </>
                )}
              </div>
            </section>

            <details
              id="audit-activity"
              open={auditOpen}
              onToggle={(e) => setAuditOpen((e.currentTarget as HTMLDetailsElement).open)}
              className="group scroll-mt-24 border-t border-outline-variant px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-on-surface">
                <span className="inline-flex items-center gap-2">
                  <Icon name="history_edu" size="sm" className="text-secondary" />
                  Audit activity
                  <Tag>{audit.length}</Tag>
                </span>
                <Icon name="expand_more" size="md" className="text-outline transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-3 flex flex-col gap-2.5">
                {audit.map((a, i) => (
                  <li key={i} className={cn('text-[14px]', a.detail && 'rounded-control border border-outline-variant bg-surface-container-low px-3 py-2.5')}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={cn('text-on-surface', a.detail && 'font-semibold')}>{a.event}</span>
                      <span className="shrink-0 text-[12px] text-on-surface-variant">{a.time}</span>
                    </div>
                    {a.detail && (
                      <ul className="mt-1 text-[12px] text-on-surface-variant">
                        {a.detail.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="link" className="mt-3" to={`/officer/audit?bid=${bid.id}&tender=${refToSlug(tenderRef)}`}>
                View full audit trail →
              </Button>
            </details>
          </Card>

          {/* RIGHT — evidence */}
          <div className="flex flex-col gap-6 xl:sticky xl:top-[76px] xl:max-h-[calc(100vh-92px)] xl:overflow-y-auto scroll-thin [&>*]:shrink-0">
            <Card padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <h2 className="inline-flex items-center gap-2 text-headline-sm font-semibold text-on-surface">
                  <Icon name="plagiarism" size="md" className="text-secondary" />
                  Evidence
                </h2>
                <span className="text-[12px] text-on-surface-variant">
                  For: <span className="font-semibold text-on-surface">{selected.name}</span>
                </span>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 border-t border-outline-variant px-5 py-2.5">
                <Icon name="picture_as_pdf" size="sm" className="text-secondary" />
                <span className="min-w-0 truncate font-mono text-[13px] font-semibold text-on-surface">{doc.file}</span>
                <span className="text-[12px] text-on-surface-variant">· {doc.type}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-y border-outline-variant bg-surface-container-low px-4 py-2">
                <IconButton size="sm" icon="chevron_left" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
                <span className="num text-[12px] text-on-surface-variant">
                  Page {page} of {doc.pages.length}
                </span>
                <IconButton size="sm" icon="chevron_right" aria-label="Next page" disabled={page >= doc.pages.length} onClick={() => setPage((p) => p + 1)} />
                <span className="mx-1 h-5 w-px bg-outline-variant" aria-hidden="true" />
                <IconButton size="sm" icon="zoom_out" aria-label="Zoom out" disabled={zoom <= 70} onClick={() => setZoom((z) => z - 15)} />
                <span className="num w-9 text-center text-[12px] text-on-surface-variant">{zoom}%</span>
                <IconButton size="sm" icon="zoom_in" aria-label="Zoom in" disabled={zoom >= 145} onClick={() => setZoom((z) => z + 15)} />
                <Button size="sm" variant="secondary" leftIcon="open_in_new" className="ml-auto" onClick={() => showDoc(doc, 'view')}>
                  Open full document
                </Button>
              </div>

              {/* Preview */}
              <div className="max-h-[420px] overflow-auto scroll-thin bg-surface-container px-5 py-5">
                <div
                  className="mx-auto w-full max-w-[440px] rounded-control border border-outline-variant bg-surface-container-lowest p-6 shadow-card"
                  style={{ fontSize: `${(13 * zoom) / 100}px` }}
                >
                  <div className="mb-4 flex items-center justify-between text-[11px] text-on-surface-variant">
                    <span>{doc.type}</span>
                    <span>
                      Page {page} of {doc.pages.length}
                    </span>
                  </div>
                  {unlocked ? (
                    pageLines.map((l, i) => {
                      const hit = !!highlight && l.includes(highlight);
                      return (
                        <p key={l} className={cn('mb-3 leading-relaxed', i === 0 ? 'font-semibold text-on-surface' : 'text-on-surface-variant', hit && 'rounded bg-warning-container px-1.5 py-0.5 text-on-surface ring-1 ring-warning-border')}>
                          {l}
                        </p>
                      );
                    })
                  ) : (
                    <div className="flex flex-col gap-3">
                      {pageLines.map((l) => {
                        const hit = !!highlight && l.includes(highlight);
                        return hit ? (
                          <p key={l} className="rounded bg-warning-container px-1.5 py-0.5 leading-relaxed text-on-surface ring-1 ring-warning-border">
                            {l}
                          </p>
                        ) : (
                          <span key={l} className="block h-3 rounded bg-surface-container-high" style={{ width: `${55 + ((l.length * 7) % 40)}%` }} aria-hidden="true" />
                        );
                      })}
                      <p className="mt-2 flex items-start gap-1.5 text-[12px] text-on-surface-variant">
                        <Icon name="lock" size="xs" className="mt-0.5" />
                        Protected original. Only the extracted evidence line is shown — use “Open full document” to view the original (recorded in the audit trail).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Extracted evidence */}
              <div className="border-t border-outline-variant px-5 py-4">
                <h3 className="mb-2 text-[14px] font-semibold text-on-surface">Extracted evidence</h3>
                {extracted.length > 0 ? (
                  <DescriptionList
                    items={[
                      ...extracted.map((e) => ({ label: e.label, value: e.value })),
                      { label: 'Source', value: `${selected.evidence} · Page ${selected.page}` },
                    ]}
                  />
                ) : (
                  <p className="text-body-sm text-on-surface-variant">Select a requirement to see the evidence extracted from this document.</p>
                )}
              </div>
            </Card>

            {/* Submitted documents */}
            <Card padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-on-surface">
                  <Icon name="folder_open" size="sm" className="text-secondary" />
                  Submitted documents
                </h3>
                <span className="text-[12px] text-on-surface-variant">
                  {docs.length} / {docs.length} processed
                </span>
              </div>
              <ul className="divide-y divide-outline-variant border-t border-outline-variant">
                {docs.map((d) => (
                  <li key={d.file} className={cn('flex items-center gap-3 px-5 py-2.5', d.file === doc.file && 'bg-info-container/40')}>
                    <Icon name="picture_as_pdf" size="sm" className="shrink-0 text-secondary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] text-on-surface">{d.file}</div>
                      <div className="text-[12px] text-on-surface-variant">
                        {d.type} · <span className="text-success-on-container">Processed</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => showDoc(d, 'view')}>
                      View
                    </Button>
                    <IconButton size="sm" icon="download" aria-label={`Download ${d.file}`} onClick={() => showDoc(d, 'download')} />
                  </li>
                ))}
              </ul>
            </Card>

            {/* Verification + cross-source */}
            <Card padding="none" className="overflow-hidden">
              <Section title="Source verification" icon="verified_user" className="border-t-0">
                <ul className="divide-y divide-outline-variant rounded-card border border-outline-variant">
                  {VERIFICATIONS.filter((v) => hasConflict || v.status !== 'conflict').map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low"
                        aria-expanded={expandedV === v.id}
                        onClick={() => {
                          const open = expandedV !== v.id;
                          setExpandedV(open ? v.id : null);
                          if (open) log(`${v.field} verification viewed`);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-semibold text-on-surface">{v.field}</div>
                          <div className="text-[12px] text-on-surface-variant">
                            {v.source}
                            {v.status !== 'unverified' && ` · ${v.checked}`}
                          </div>
                        </div>
                        <VerificationBadge s={v.status} />
                        <Icon name={expandedV === v.id ? 'expand_less' : 'expand_more'} size="md" className="text-outline" />
                      </button>
                      {(expandedV === v.id || v.status === 'unverified') && (
                        <div className="px-4 pb-3 text-body-sm text-on-surface-variant">
                          {v.note ?? `Last checked: ${v.checked}`}
                          {v.status === 'conflict' && (
                            <Button size="sm" variant="link" className="ml-2" onClick={() => setConflictOpen(true)}>
                              View conflict
                            </Button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[12px] text-on-surface-variant">Results reflect recorded checks at the time shown; the system does not claim live access.</p>
              </Section>

              <Section title="Cross-source checks" icon="compare_arrows">
                <ul className="flex flex-col gap-2 text-[14px]">
                  <li className="flex items-center gap-2 text-on-surface">
                    <Icon name="check_circle" size="sm" className="text-success" /> PAN matches bidder submission
                  </li>
                  <li className="flex items-center gap-2 text-on-surface">
                    <Icon name="check_circle" size="sm" className="text-success" /> GSTIN matches submitted GST certificate
                  </li>
                  {hasConflict ? (
                    <li className="rounded-control border border-danger-border bg-danger-container/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 font-semibold text-on-surface">
                          <Icon name="warning" size="sm" className="text-warning" /> Registered address mismatch
                        </span>
                        <StatusBadge tone="danger">CONFLICT</StatusBadge>
                      </div>
                      <div className="mt-1 text-body-sm text-on-surface-variant">GST Certificate vs Bidder Declaration · Field: Registered address</div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => {
                          setConflictOpen(true);
                          log('Address conflict viewed');
                        }}
                      >
                        View conflict
                      </Button>
                    </li>
                  ) : (
                    <li className="flex items-center gap-2 text-on-surface">
                      <Icon name="check_circle" size="sm" className="text-success" /> Registered address consistent across documents
                    </li>
                  )}
                </ul>
              </Section>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={!!pendingDoc}
        onClose={() => setPendingDoc(null)}
        icon="folder_open"
        size="md"
        title={pendingDoc?.action === 'download' ? 'Download bid document?' : 'Open bid document?'}
        description={pendingDoc?.doc.file}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDoc(null)}>
              Cancel
            </Button>
            <Button onClick={confirmDoc}>{pendingDoc?.action === 'download' ? 'Download' : 'Open document'}</Button>
          </>
        }
      >
        <DescriptionList
          items={[
            { label: 'Bid', value: <span className="font-mono">{bid.id}</span> },
            { label: 'Bidder', value: bid.company },
            { label: 'Officer', value: 'Procurement Officer' },
            { label: 'Time', value: `${now()} IST` },
          ]}
        />
        <p className="mt-4 flex items-start gap-2 text-body-sm text-on-surface-variant">
          <Icon name="history_edu" size="sm" className="mt-0.5 text-outline" />
          This action will be recorded in the procurement audit trail.
        </p>
      </Modal>

      <Modal open={!!clause} onClose={() => setClause(null)} icon="menu_book" size="md" title="Tender clause" description={clause?.source} footer={<Button onClick={() => setClause(null)}>Close</Button>}>
        <blockquote className="rounded-card border-l-4 border-secondary bg-surface-container-low px-4 py-3 text-body-md text-on-surface">“{clause?.clause}”</blockquote>
      </Modal>

      <Modal
        open={conflictOpen}
        onClose={() => setConflictOpen(false)}
        icon="compare_arrows"
        title="Registered address conflict"
        description="Not resolved automatically — officer review required."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConflictOpen(false)}>
              Close
            </Button>
            <Button
              leftIcon="flag"
              onClick={() => {
                setConflictOpen(false);
                log('Address conflict flagged for review');
                setToast('Address conflict flagged for review');
              }}
            >
              Flag for review
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-[13px] text-on-surface-variant">
            <span>
              Field: <span className="font-semibold text-on-surface">Registered address</span>
            </span>
            <StatusBadge tone="danger">CONFLICT</StatusBadge>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ['Source A · GST Certificate', 'Plot 14, SIDCO Industrial Estate, Guindy, Chennai 600032'],
              ['Source B · Bidder Declaration', 'No. 22, Anna Salai, Teynampet, Chennai 600018'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-card border border-outline-variant p-4">
                <div className="text-[12px] font-semibold text-on-surface-variant">{k}</div>
                <div className="mt-1 text-[14px] text-on-surface">{v}</div>
              </div>
            ))}
          </div>
          <Callout tone="warning" icon="compare_arrows" title="Difference">
            Different premises and PIN code (600032 vs 600018).
          </Callout>
        </div>
      </Modal>

      {/* Final decision confirmation */}
      <Modal
        open={!!finalDraft}
        onClose={() => setFinalDraft(null)}
        icon={finalDraft ? FINAL[finalDraft].icon : 'gavel'}
        size="md"
        title={finalDraft ? FINAL[finalDraft].title : ''}
        description={
          finalDraft === 'reject'
            ? `Record a rejection decision for ${bid.id} — ${bid.company}.`
            : finalDraft === 'review'
              ? `${bid.id} — ${bid.company}. The bid status becomes REVIEW.`
              : `You are about to record a final decision for ${bid.id} — ${bid.company}.`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setFinalDraft(null)}>
              Cancel
            </Button>
            <Button variant={finalDraft === 'reject' ? 'danger' : 'primary'} onClick={confirmFinal}>
              {finalDraft ? FINAL[finalDraft].confirm : ''}
            </Button>
          </>
        }
      >
        {finalDraft && (
          <div className="flex flex-col gap-4">
            {finalDraft === 'accept' && (
              <dl className="grid grid-cols-3 gap-3 rounded-control bg-surface-container-low px-4 py-3">
                {[
                  { k: 'Compliance', v: `${bid.score} / 100` },
                  { k: 'Risk', v: <RiskBadge r={bid.risk} /> },
                  { k: 'Requirements', v: `${passed} / ${reqs.length} passed` },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="text-[12px] text-on-surface-variant">{s.k}</dt>
                    <dd className="num text-[14px] font-semibold text-on-surface">{s.v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="final-text" className="flex items-center justify-between text-[13px] font-semibold text-on-surface">
                <span>
                  {finalDraft === 'reject' ? 'Rejection reason' : finalDraft === 'review' ? 'Reason / comment' : 'Officer comment'}
                  {finalDraft === 'reject' && <span className="ml-0.5 text-danger">*</span>}
                </span>
                {finalDraft === 'accept' && <span className="text-[12px] font-normal text-on-surface-variant">Optional</span>}
              </label>
              <textarea
                id="final-text"
                rows={3}
                value={finalText}
                onChange={(e) => setFinalText(e.target.value)}
                aria-invalid={finalDraft === 'reject' && finalTouched && !finalText.trim()}
                placeholder={finalDraft === 'reject' ? 'Enter the reason for rejection.' : finalDraft === 'review' ? 'Explain what requires additional review.' : 'Add a comment for the record'}
                className={cn(
                  'w-full rounded-control border bg-surface-container-lowest px-3.5 py-3 text-[14px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-secondary focus:shadow-focus',
                  finalDraft === 'reject' && finalTouched && !finalText.trim() ? 'border-danger' : 'border-outline-variant',
                )}
              />
              {finalDraft === 'reject' && finalTouched && !finalText.trim() && (
                <p role="alert" className="flex items-center gap-1 text-[12px] font-medium text-danger-on-container">
                  <Icon name="error" size="xs" /> A rejection reason is required.
                </p>
              )}
            </div>
            {finalDraft !== 'review' && (
              <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
                <Icon name="history_edu" size="sm" className="mt-0.5 text-outline" />
                This decision will be recorded in the procurement audit trail.
              </p>
            )}
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast} />}
    </OfficerPortalShell>
  );
}
