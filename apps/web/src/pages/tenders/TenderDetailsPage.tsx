// Tender Details — ported from Stitch screen "CPCL Bidder Portal - Tender
// Details (CPCL/PROC/2026/041)" (project 6921642772921774119, screen
// 2f565a0d1aa744cc852c347242a42498), rebuilt on the shared design system.
//
// Phase 1: fetches the real tender by :ref (GET /api/tenders/:ref) instead of
// hardcoding 041. Bidder relationship state (draft/submitted/none) is real —
// derived from the caller's own bids (GET /api/bids), not a UI simulator.
// "Start bid"/"Continue bid" creates or resumes a real draft (POST /api/bids)
// before navigating into the bid workspace.
//
// Sections below that have no real backing schema yet (compliance matrix,
// technical spec table, official documents/corrigenda, GCC/SCC accordions,
// EMD/financial figures) remain illustrative static content — there is no
// tender-authoring flow yet to produce this data. This is flagged here and
// in the project's final report, not hidden.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import {
  Button,
  Callout,
  Card,
  CellStack,
  Icon,
  IconButton,
  PageHeader,
  SectionHeader,
  StatCard,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tag,
} from '@/components/primitives';
import { cn } from '@/utils/cn';
import { TranslateAssist } from '@/components/TranslateAssist';
import { api, ApiError } from '@/lib/api';
import type { ApiBid, ApiTender, ApiTenderRequirement } from '@/lib/types';

type SectionId = 'overview' | 'eligibility' | 'compliance' | 'documents' | 'specs' | 'financial' | 'terms' | 'corrigenda';

const SECTION_NAV: { id: SectionId; label: string; count?: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'documents', label: 'Required documents' },
  { id: 'specs', label: 'Technical specs' },
  { id: 'financial', label: 'Financial & EMD' },
  { id: 'terms', label: 'Terms (GCC/SCC)' },
  { id: 'corrigenda', label: 'Official documents' },
];

// Illustrative only — no real schema for statutory clauses / spec tables yet.
const COMPLIANCE_ROWS = [
  { title: 'Class-3 Digital Signature Certificate (DSC) binding', sub: 'All bid documents encrypted with SHA-256 certificate', category: 'Statutory', enforce: 'mandatory' as const, cite: 'Sec 1.4 · Cl. 8', action: 'System verified', ok: true },
  { title: 'Public Procurement (Make in India) Order 2017', sub: 'Class-I (≥50%) or Class-II (≥20%) local content declaration', category: 'Statutory', enforce: 'mandatory' as const, cite: 'Sec 2.1 · Cl. 14', action: 'Self-cert annexure', ok: false },
  { title: 'Integrity Pact with Independent External Monitor', sub: 'Mandatory tripartite agreement against corrupt practices', category: 'Integrity', enforce: 'mandatory' as const, cite: 'Sec 3.0 · Cl. 2', action: 'Sign Annexure-VII', ok: false },
];

const ACCORDIONS = [
  { id: 'gcc', icon: 'gavel', title: 'General Conditions of Contract (GCC)', body: 'Standard CPCL General Conditions of Contract apply. Where GCC and SCC differ, SCC prevails. The contractor must observe statutory labour codes, the Minimum Wages Act and ESI/PF compliance during on-site integration.' },
  { id: 'ld', icon: 'timer_off', title: 'Liquidated damages & delay penalty', body: 'Delivery beyond the agreed window attracts liquidated damages per contract value per week or part thereof, capped per GCC terms. Force Majeure delays are assessed under GCC Clause 31.' },
  { id: 'arb', icon: 'balance', title: 'Arbitration, dispute resolution & jurisdiction', body: 'Disputes not settled by executive conciliation within 45 days go to sole arbitration under the Arbitration and Conciliation Act, 1996. Seat and venue: Chennai, Tamil Nadu.' },
];

function scrollToSection(id: SectionId) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeRemainingLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} remaining`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'} remaining`;
  return 'Closing soon';
}

export function TenderDetailsPage() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const displayRef = ref ? decodeURIComponent(ref) : '';

  const [tender, setTender] = useState<ApiTender | null>(null);
  const [myBid, setMyBid] = useState<ApiBid | null>(null);
  const [requirements, setRequirements] = useState<ApiTenderRequirement[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [ctaBusy, setCtaBusy] = useState(false);
  const [ctaError, setCtaError] = useState<string | null>(null);

  useEffect(() => {
    if (!displayRef) return;
    let cancelled = false;
    setTender(null);
    setLoadError(null);
    (async () => {
      try {
        const t = await api.get<ApiTender>(`/tenders/${encodeURIComponent(displayRef)}`);
        if (cancelled) return;
        setTender(t);
        try {
          const reqs = await api.get<ApiTenderRequirement[]>(`/tenders/${encodeURIComponent(displayRef)}/requirements`);
          if (!cancelled) setRequirements(reqs);
        } catch {
          // Non-fatal — the tender itself still loaded; requirements just show as unavailable below.
        }
        try {
          const bids = await api.get<ApiBid[]>('/bids');
          if (cancelled) return;
          const mine = bids.find((b) => (typeof b.tenderId === 'string' ? b.tenderId : b.tenderId._id) === t._id);
          setMyBid(mine ?? null);
        } catch {
          // Not logged in — browsing tenders is public, bid state simply stays unknown.
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this tender.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [displayRef]);

  // Real, officer-confirmed requirements (Phase 3A) — either AI-extracted and
  // accepted, or manually entered; the bidder sees no distinction, and never
  // sees an unaccepted AI proposal (those are never persisted at all).
  const technicalRequirements = requirements.filter((r) => r.category === 'technical');
  const eligibilityRequirements = requirements.filter((r) => r.category !== 'technical');
  const requiredDocumentNames = Array.from(new Set(requirements.flatMap((r) => r.evidenceTypes)));

  const isClosed = tender ? tender.status === 'closed' || new Date(tender.submissionDeadline).getTime() <= Date.now() : false;
  const isSubmitted = myBid?.status === 'submitted' || myBid?.status === 'closed';

  // A submitted bid stays viewable even after the tender closes — only a
  // *new* bid is blocked by a closed tender.
  const ctaLabel = isSubmitted ? 'View bid' : isClosed ? 'Tender closed' : myBid ? 'Continue bid' : 'Start bid';
  const ctaDisabled = !isSubmitted && isClosed;

  async function handleCta() {
    if (!tender) return;
    if (isSubmitted && myBid) {
      navigate(`/my-bids/${myBid._id}`);
      return;
    }
    if (isClosed) return;
    if (myBid) {
      navigate(`/tenders/${encodeURIComponent(displayRef)}/bid/1`);
      return;
    }
    setCtaBusy(true);
    setCtaError(null);
    try {
      const bid = await api.post<ApiBid>('/bids', { tenderNumber: tender.tenderNumber });
      setMyBid(bid);
      navigate(`/tenders/${encodeURIComponent(displayRef)}/bid/1`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Another request (or the DB's own unique index) beat us to it —
        // recover by fetching the bidder's existing bid instead of failing.
        try {
          const bids = await api.get<ApiBid[]>('/bids');
          const mine = bids.find((b) => (typeof b.tenderId === 'string' ? b.tenderId : b.tenderId._id) === tender._id);
          if (mine) {
            setMyBid(mine);
            if (mine.status === 'submitted' || mine.status === 'closed') navigate(`/my-bids/${mine._id}`);
            else navigate(`/tenders/${encodeURIComponent(displayRef)}/bid/1`);
            return;
          }
        } catch {
          // fall through to showing the error below
        }
      }
      setCtaError(err instanceof ApiError ? err.message : 'Could not start a bid for this tender.');
    } finally {
      setCtaBusy(false);
    }
  }

  if (loadError) {
    return (
      <BidderPortalShell>
        <Card padding="lg" className="mx-auto max-w-xl text-center">
          <Icon name="error" size="xl" className="mx-auto text-danger" />
          <h2 className="mt-3 text-[18px] font-semibold text-on-surface">Could not load tender {displayRef}</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">{loadError}</p>
          <Button className="mt-4" to="/tenders" variant="secondary">
            Back to tenders
          </Button>
        </Card>
      </BidderPortalShell>
    );
  }

  if (!tender) {
    return (
      <BidderPortalShell>
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </BidderPortalShell>
    );
  }

  return (
    <BidderPortalShell>
      <div className="flex flex-col gap-10">
        <PageHeader
          breadcrumbs={[{ label: 'Workspace', to: '/dashboard' }, { label: 'Tenders', to: '/tenders' }, { label: displayRef }]}
          eyebrow={
            <>
              <Tag mono>{tender.tenderNumber}</Tag>
              <StatusBadge status={isClosed ? 'closed' : 'open'}>{isClosed ? 'Closed' : 'NIT stage · active enquiry'}</StatusBadge>
              <Tag icon="category">{tender.department}</Tag>
            </>
          }
          title={tender.title}
          description={tender.description}
          actions={
            <>
              <IconButton variant="secondary" icon="bookmark_add" aria-label="Save tender to watchlist" />
              <Button size="lg" onClick={handleCta} rightIcon="arrow_forward" disabled={ctaDisabled || ctaBusy} loading={ctaBusy}>
                {ctaLabel}
              </Button>
            </>
          }
        />

        {ctaError && (
          <Callout tone="danger" title="Could not start bid">
            {ctaError}
          </Callout>
        )}

        {/* Deadline + bidder relationship */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-col divide-y divide-outline-variant lg:flex-row lg:divide-x lg:divide-y-0">
            <div className="flex items-center gap-4 p-5 sm:p-6 lg:w-[380px]">
              <span className={cn('inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-card', isClosed ? 'bg-neutral-container text-neutral' : 'bg-warning-container text-warning-on-container')}>
                <Icon name={isClosed ? 'event_busy' : 'alarm'} size="xl" />
              </span>
              <div>
                <div className="text-[12px] font-medium text-on-surface-variant">{isClosed ? 'Tender concluded' : 'Submission closes'}</div>
                <div className="text-[17px] font-semibold text-on-surface num">{formatDeadline(tender.submissionDeadline)}</div>
                {!isClosed && (
                  <div className="mt-1">
                    <StatusBadge status="closing-soon">{timeRemainingLabel(tender.submissionDeadline)}</StatusBadge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-1 items-center p-5 sm:p-6 text-body-md text-on-surface-variant">
              {isClosed
                ? 'The submission window for this tender has concluded.'
                : myBid
                  ? `You have a ${myBid.status} bid for this tender.`
                  : 'You have not yet started a bid response for this tender notice.'}
            </div>
          </div>
        </Card>

        {/* Key facts */}
        <section aria-label="Key facts" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <StatCard label="Estimated value" value={tender.value} />
          <StatCard label="Submission opens" value={new Date(tender.submissionStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
          <StatCard label="Submission closes" value={new Date(tender.submissionDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
          <StatCard label="Status" value={tender.status} />
        </section>

        {/* Sticky section nav */}
        <div className="sticky top-header z-20 -mx-4 border-y border-outline-variant bg-background/90 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            {SECTION_NAV.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveSection(s.id);
                  scrollToSection(s.id);
                }}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                  activeSection === s.id ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant hover:bg-surface-container-low'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 01 Overview */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="overview">
          <SectionHeader index="01" title="Overview & scope of work" description="Procurement objective and installation requirements" />
          <Card padding="lg" className="flex flex-col gap-5">
            <p className="text-body-lg text-on-surface">{tender.description}</p>
            {tender.scopeOfWork.length > 0 && (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {tender.scopeOfWork.map((s) => (
                  <li key={s} className="flex items-start gap-2 rounded-card border border-outline-variant/70 bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                    <Icon name="check_circle" size="sm" className="mt-0.5 shrink-0 text-secondary" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* 02 Eligibility */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="eligibility">
          <SectionHeader index="02" title="Pre-qualification & eligibility" description="Requirements confirmed by the procurement officer for this tender" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {eligibilityRequirements.map((r) => (
              <Card key={r._id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Tag mono>{r.code}</Tag>
                  {r.conditional ? <StatusBadge status="conditional" /> : r.mandatory ? <StatusBadge status="mandatory" /> : <StatusBadge tone="neutral">Optional</StatusBadge>}
                </div>
                <h3 className="text-[15px] font-semibold text-on-surface">{r.title}</h3>
                <p className="flex-1 text-body-sm text-on-surface-variant">{r.description || 'No further description provided.'}</p>
                {r.description && <TranslateAssist text={r.description} />}
                {(r.sourcePage || r.sourceClause) && (
                  <p className="text-[12px] text-on-surface-variant">
                    Source: {r.sourceDocument || 'Tender document'}{r.sourcePage ? ` · Page ${r.sourcePage}` : ''}{r.sourceClause ? ` · Clause ${r.sourceClause}` : ''}
                  </p>
                )}
              </Card>
            ))}
            {eligibilityRequirements.length === 0 && <p className="text-body-sm text-on-surface-variant">Not specified in the published tender document.</p>}
          </div>
        </section>

        {/* 03 Compliance — illustrative, no real schema yet */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="compliance">
          <SectionHeader index="03" title="Statutory compliance matrix" description="Illustrative — not yet driven by real tender data" />
          <Card padding="none" className="overflow-hidden">
            <Table minWidth={860}>
              <THead>
                <tr>
                  <Th className="pl-6">Requirement</Th>
                  <Th>Category</Th>
                  <Th>Enforcement</Th>
                  <Th>Citation</Th>
                  <Th align="right" className="pr-6">
                    Verification
                  </Th>
                </tr>
              </THead>
              <TBody>
                {COMPLIANCE_ROWS.map((row) => (
                  <Tr key={row.title}>
                    <Td className="pl-6">
                      <CellStack primary={row.title} secondary={row.sub} />
                    </Td>
                    <Td>
                      <Tag>{row.category}</Tag>
                    </Td>
                    <Td>
                      <StatusBadge status={row.enforce} />
                    </Td>
                    <Td className="font-mono text-[12.5px] text-on-surface-variant whitespace-nowrap">{row.cite}</Td>
                    <Td align="right" className="pr-6">
                      <span className={cn('inline-flex items-center gap-1 text-[13px] font-medium whitespace-nowrap', row.ok ? 'text-success-on-container' : 'text-secondary')}>
                        <Icon name={row.ok ? 'check_circle' : 'edit_document'} size="sm" />
                        {row.action}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        </section>

        {/* 04 Required documents */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="documents">
          <SectionHeader index="04" title="Required documents" description="Prepare these before entering the bid submission workspace" actions={<StatusBadge tone="info">{requiredDocumentNames.length} documents</StatusBadge>} />
          <Callout tone="neutral">Files are uploaded inside the bid workspace (step 2).</Callout>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {requiredDocumentNames.map((d) => (
              <li key={d} className="flex items-center gap-2 rounded-card border border-outline-variant/70 bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                <Icon name="description" size="sm" className="shrink-0 text-secondary" />
                {d}
              </li>
            ))}
            {requiredDocumentNames.length === 0 && <p className="text-body-sm text-on-surface-variant">Not specified in the published tender document.</p>}
          </ul>
        </section>

        {/* 05 Technical specs */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="specs">
          <SectionHeader index="05" title="Technical specifications" description="Requirements confirmed by the procurement officer for this tender" />
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {technicalRequirements.map((r) => (
              <li key={r._id} className="flex items-start gap-2 rounded-card border border-outline-variant/70 bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                <Icon name="settings" size="sm" className="mt-0.5 shrink-0 text-secondary" />
                <span>
                  <strong className="text-on-surface">{r.title}.</strong> {r.description}
                </span>
              </li>
            ))}
            {technicalRequirements.length === 0 && <p className="text-body-sm text-on-surface-variant">Not specified in the published tender document.</p>}
          </ul>
        </section>

        {/* 06 Financial — illustrative, no real EMD schema yet */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="financial">
          <SectionHeader index="06" title="Financial requirements, EMD & payment" description="Illustrative — EMD/PBG terms are not yet part of the real tender schema" />
          <Card className="flex flex-col gap-2">
            <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Estimated value</div>
            <div className="text-headline-lg text-on-surface num">{tender.value}</div>
            <p className="text-body-sm text-on-surface-variant">EMD, PBG and payment milestone terms are specified in the tender document and are not yet modeled in this system.</p>
          </Card>
        </section>

        {/* 07 Terms — illustrative */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="terms">
          <SectionHeader index="07" title="Contractual terms (GCC / SCC)" description="Standard clauses — illustrative" />
          <Card padding="none" className="divide-y divide-outline-variant overflow-hidden">
            {ACCORDIONS.map((acc) => {
              const open = openAccordion === acc.id;
              return (
                <div key={acc.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenAccordion(open ? null : acc.id)}
                    className="focus-ring flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-surface-container-low"
                  >
                    <span className="flex items-center gap-3 text-[15px] font-semibold text-on-surface">
                      <Icon name={acc.icon} size="lg" className="text-secondary" />
                      {acc.title}
                    </span>
                    <Icon name="expand_more" size="lg" className={cn('text-outline transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && <p className="px-6 pb-5 pl-[60px] text-body-md text-on-surface-variant animate-fade-in">{acc.body}</p>}
                </div>
              );
            })}
          </Card>
        </section>

        {/* 08 Official documents — no file schema for tender-level docs yet */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="corrigenda">
          <SectionHeader index="08" title="Official documents & corrigenda" description="Not yet available — tender document uploads are not part of this phase" />
          <Callout tone="neutral">Officer-side tender document publishing is out of scope for this phase; no source documents are attached yet.</Callout>
        </section>

        {/* Bottom CTA band */}
        <Card tone="brand" padding="lg" className="relative overflow-hidden">
          <span className="absolute inset-x-0 top-0 h-1 bg-saffron" aria-hidden="true" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-2">
              <span className="font-mono text-[12px] text-white/60">{tender.tenderNumber}</span>
              <h3 className="text-headline-lg text-white">Ready to submit your bid?</h3>
              <p className="text-body-md text-white/75">Your submission can be saved as a draft at any stage before the deadline.</p>
              <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="schedule" size="sm" className="text-saffron" /> Closes {formatDeadline(tender.submissionDeadline)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col">
              <Button variant="saffron" size="lg" onClick={handleCta} rightIcon="arrow_forward" disabled={ctaDisabled || ctaBusy} loading={ctaBusy}>
                {ctaLabel}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </BidderPortalShell>
  );
}
