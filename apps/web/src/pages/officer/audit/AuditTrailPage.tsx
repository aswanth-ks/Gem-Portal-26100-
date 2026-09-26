// Procurement Officer — Audit Trail (sidebar: Compliance › Audit Trail).
// Read-only record of procurement actions: who, what, when, which tender/bid,
// and the result. Search + filters (tender, bid, action, officer, date
// range), a compact final-decision history, and a detail drawer per event.
// Nothing here edits or modifies procurement decisions.
// ?bid=BID-002 / ?tender=<slug> prefill filters (links from the bid page).
//
// TODO: GET /api/officer/audit?… (server-side filtering + pagination).

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Callout, Card, DescriptionList, Icon, IconButton, Input, PageHeader, SearchInput, Select, StatusBadge } from '@/components/primitives';
import { cn } from '@/utils/cn';

type ActionKey =
  | 'tender_created'
  | 'tender_updated'
  | 'tender_published'
  | 'bid_submitted'
  | 'documents_processed'
  | 'assessment_generated'
  | 'verification_performed'
  | 'assessment_opened'
  | 'document_viewed'
  | 'document_downloaded'
  | 'evidence_viewed'
  | 'clause_viewed'
  | 'verification_viewed'
  | 'assessment_updated'
  | 'officer_comment'
  | 'final_decision';

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const ACTIONS: Record<ActionKey, { label: string; tone: Tone; icon: string; group: string }> = {
  tender_created: { label: 'Tender Created', tone: 'neutral', icon: 'post_add', group: 'Tender Created' },
  tender_updated: { label: 'Tender Updated', tone: 'neutral', icon: 'edit_note', group: 'Tender Created' },
  tender_published: { label: 'Tender Published', tone: 'info', icon: 'campaign', group: 'Tender Published' },
  bid_submitted: { label: 'Bid Submitted', tone: 'info', icon: 'upload_file', group: 'Bid Submitted' },
  documents_processed: { label: 'Documents Processed', tone: 'neutral', icon: 'task', group: 'Assessment Generated' },
  assessment_generated: { label: 'Assessment Generated', tone: 'neutral', icon: 'auto_awesome', group: 'Assessment Generated' },
  verification_performed: { label: 'Verification Performed', tone: 'neutral', icon: 'verified_user', group: 'Verification Viewed' },
  assessment_opened: { label: 'Bid Assessment Opened', tone: 'neutral', icon: 'fact_check', group: 'Document Viewed' },
  document_viewed: { label: 'Bid Document Viewed', tone: 'warning', icon: 'visibility', group: 'Document Viewed' },
  document_downloaded: { label: 'Bid Document Downloaded', tone: 'warning', icon: 'download', group: 'Document Downloaded' },
  evidence_viewed: { label: 'Evidence Viewed', tone: 'neutral', icon: 'plagiarism', group: 'Document Viewed' },
  clause_viewed: { label: 'Tender Clause Viewed', tone: 'neutral', icon: 'menu_book', group: 'Document Viewed' },
  verification_viewed: { label: 'Verification Viewed', tone: 'neutral', icon: 'verified', group: 'Verification Viewed' },
  assessment_updated: { label: 'Officer Assessment Updated', tone: 'info', icon: 'rate_review', group: 'Assessment Updated' },
  officer_comment: { label: 'Officer Comment Added', tone: 'info', icon: 'comment', group: 'Officer Comment' },
  final_decision: { label: 'Final Bid Decision', tone: 'success', icon: 'gavel', group: 'Final Decision' },
};

const ACTION_FILTERS = ['Tender Created', 'Tender Published', 'Bid Submitted', 'Assessment Generated', 'Document Viewed', 'Document Downloaded', 'Verification Viewed', 'Assessment Updated', 'Officer Comment', 'Final Decision'];

interface AuditEvent {
  id: string;
  ts: string; // ISO, IST
  action: ActionKey;
  tender: string;
  bid?: string;
  bidder?: string;
  actor: string;
  details: string;
  result?: string;
  comment?: string;
  document?: string;
  access?: string;
}

const E = (id: number, ts: string, action: ActionKey, tender: string, actor: string, details: string, extra: Partial<AuditEvent> = {}): AuditEvent => ({
  id: `AUD-2026-${String(id).padStart(6, '0')}`,
  ts,
  action,
  tender,
  actor,
  details,
  ...extra,
});

const T41 = 'CPCL/PROC/2026/041';
const T39 = 'CPCL/PROC/2026/039';
const T35 = 'CPCL/PROC/2026/035';
const DELTA = { bid: 'BID-002', bidder: 'Delta Equipments Pvt Ltd' };

const EVENTS: AuditEvent[] = [
  E(9842, '2026-09-26T15:32:18', 'final_decision', T41, 'Procurement Officer', 'Bid Accepted', { ...DELTA, result: 'Accepted', comment: 'OEM authorization renewal letter verified with OEM; address change supported by updated GST application.' }),
  E(9839, '2026-09-26T15:24:05', 'officer_comment', T41, 'Procurement Officer', 'Comment added to assessment', { ...DELTA, comment: 'Requested renewed OEM authorization copy from bidder via clarification.' }),
  E(9836, '2026-09-26T15:21:40', 'assessment_updated', T41, 'Procurement Officer', 'Assessment: REVIEW', { ...DELTA, result: 'REVIEW' }),
  E(9830, '2026-09-26T15:12:31', 'clause_viewed', T41, 'Procurement Officer', 'Technical Specification.pdf — Page 20', { ...DELTA }),
  E(9827, '2026-09-26T15:09:12', 'document_downloaded', T41, 'Procurement Officer', 'GST Certificate.pdf', { ...DELTA, document: 'GST Certificate.pdf', access: 'Officer', result: 'Downloaded after confirmation' }),
  E(9824, '2026-09-26T15:04:47', 'document_viewed', T41, 'Procurement Officer', 'OEM Authorization.pdf', { ...DELTA, document: 'OEM Authorization.pdf', access: 'Officer', result: 'Opened after confirmation' }),
  E(9821, '2026-09-26T15:02:10', 'evidence_viewed', T41, 'Procurement Officer', 'OEM Authorization evidence', { ...DELTA }),
  E(9818, '2026-09-26T14:58:36', 'verification_viewed', T41, 'Procurement Officer', 'GSTIN verification', { ...DELTA, result: 'VERIFIED' }),
  E(9815, '2026-09-26T14:55:02', 'assessment_opened', T41, 'Procurement Officer', 'Bid assessment opened', { ...DELTA }),
  E(9810, '2026-09-26T14:42:44', 'assessment_generated', T41, 'System', 'AI assessment generated', { ...DELTA, result: 'Compliance 87/100 · Risk HIGH · 2 need review' }),
  E(9808, '2026-09-26T14:41:20', 'verification_performed', T41, 'System', 'GSTIN, PAN verified · Udyam unverified (source unavailable)', { ...DELTA }),
  E(9805, '2026-09-26T14:40:03', 'documents_processed', T41, 'System', '7 / 7 documents processed', { ...DELTA }),
  E(9801, '2026-09-26T13:18:11', 'final_decision', T35, 'Procurement Officer', 'Bid Rejected', { bid: 'BID-004', bidder: 'Prime Industrial Solutions', result: 'Rejected', comment: 'Average turnover below the ₹50 Lakh threshold (Tender Document, Pg. 18).' }),
  E(9797, '2026-09-26T12:47:55', 'final_decision', T35, 'Procurement Officer', 'Bid Kept for Review', { bid: 'BID-002', bidder: 'Southern Automation Co.', result: 'Review', comment: 'Awaiting clarification on experience certificate dates.' }),
  E(9788, '2026-09-26T11:05:37', 'document_viewed', T35, 'Procurement Officer', 'Experience Certificate.pdf', { bid: 'BID-002', bidder: 'Southern Automation Co.', document: 'Experience Certificate.pdf', access: 'Officer', result: 'Opened after confirmation' }),
  E(9760, '2026-10-03T16:18:00', 'bid_submitted', T41, 'Bidder portal', 'Bid received · identity sealed until closing', { bid: 'BID-002' }),
  E(9701, '2026-09-20T10:00:06', 'tender_published', T41, 'Procurement Officer', 'Published with DSC Level-3 signature'),
  E(9688, '2026-09-19T17:42:15', 'tender_updated', T41, 'Procurement Officer', 'Submission schedule updated'),
  E(9650, '2026-09-18T11:20:44', 'tender_created', T41, 'Procurement Officer', 'Draft TND-DRAFT-2026-0047 created'),
  E(9602, '2026-09-15T09:12:30', 'tender_published', T39, 'Procurement Officer', 'Published with DSC Level-3 signature'),
].sort((a, b) => b.ts.localeCompare(a.ts));

const TENDERS = [...new Set(EVENTS.map((e) => e.tender))];
const BIDS = [...new Set(EVENTS.map((e) => e.bid).filter(Boolean) as string[])].sort();
const ACTORS = [...new Set(EVENTS.map((e) => e.actor))];

const fmt = (iso: string, seconds = false) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), hour12: false });

function decisionTone(result?: string): Tone {
  if (result === 'Accepted') return 'success';
  if (result === 'Rejected') return 'danger';
  if (result === 'Review') return 'warning';
  return 'neutral';
}

function ActionBadge({ e }: { e: AuditEvent }) {
  const a = ACTIONS[e.action];
  const tone = e.action === 'final_decision' ? decisionTone(e.result) : a.tone;
  return (
    <StatusBadge tone={tone} icon={a.icon}>
      {a.label}
    </StatusBadge>
  );
}

export function AuditTrailPage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const [tender, setTender] = useState(() => params.get('tender')?.replace(/-/g, '/') ?? '');
  const [bid, setBid] = useState(params.get('bid') ?? '');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [active, setActive] = useState<AuditEvent | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EVENTS.filter((e) => {
      if (tender && e.tender !== tender) return false;
      if (bid && e.bid !== bid) return false;
      if (action && ACTIONS[e.action].group !== action) return false;
      if (actor && e.actor !== actor) return false;
      const day = e.ts.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!q) return true;
      return [e.tender, e.bid, e.bidder, ACTIONS[e.action].label, e.actor, e.details, e.id].some((v) => v?.toLowerCase().includes(q));
    });
  }, [query, tender, bid, action, actor, from, to]);

  const decisions = EVENTS.filter((e) => e.action === 'final_decision');
  const filtersOn = !!(query || tender || bid || action || actor || from || to);
  const clear = () => {
    setQuery('');
    setTender('');
    setBid('');
    setAction('');
    setActor('');
    setFrom('');
    setTo('');
  };

  const isDoc = active && (active.action === 'document_viewed' || active.action === 'document_downloaded');

  return (
    <OfficerPortalShell breadcrumb="Audit Trail">
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: 'Compliance' }, { label: 'Audit Trail' }]}
          title="Audit Trail"
          description="Track procurement actions, document access, verification activity, and officer decisions."
        />

        <div className="grid grid-cols-1 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card padding="none" className="min-w-0 overflow-hidden">
            {/* Filters */}
            <div className="flex flex-col gap-3 border-b border-outline-variant bg-surface-container-low/60 px-5 py-4">
              <SearchInput size="md" shortcut={false} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by tender, bid, bidder, action, or officer…" aria-label="Search audit events" />
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto_auto]">
                <Select size="sm" aria-label="Tender" value={tender} onChange={(e) => setTender(e.target.value)}>
                  <option value="">All tenders</option>
                  {TENDERS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
                <Select size="sm" aria-label="Bid" value={bid} onChange={(e) => setBid(e.target.value)}>
                  <option value="">All bids</option>
                  {BIDS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </Select>
                <Select size="sm" aria-label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
                  <option value="">All actions</option>
                  {ACTION_FILTERS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
                <Select size="sm" aria-label="Officer / actor" value={actor} onChange={(e) => setActor(e.target.value)}>
                  <option value="">All actors</option>
                  {ACTORS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
                <Input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} className="!h-9 text-[13px]" />
                <Input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} className="!h-9 text-[13px]" />
                <Button size="sm" variant="ghost" disabled={!filtersOn} onClick={clear}>
                  Clear filters
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 text-body-sm text-on-surface-variant">
              <span className="num">
                <strong className="font-semibold text-on-surface">{rows.length}</strong> of {EVENTS.length} events
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="lock" size="xs" /> Read-only record
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-outline-variant bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">
                    <th className="px-5 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Tender</th>
                    <th className="px-3 py-2.5">Bid</th>
                    <th className="px-3 py-2.5">Actor</th>
                    <th className="px-3 py-2.5">Details</th>
                    <th className="px-5 py-2.5">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} onClick={() => setActive(e)} className={cn('cursor-pointer border-b border-outline-variant/70 transition-colors hover:bg-surface-container-low', active?.id === e.id && 'bg-info-container/40')}>
                      <td className="whitespace-nowrap px-5 py-3 text-[13px] text-on-surface">{fmt(e.ts)}</td>
                      <td className="px-3 py-3">
                        <ActionBadge e={e} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-on-surface-variant">{e.tender}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-on-surface">{e.bid ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-on-surface">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name={e.actor === 'System' ? 'memory' : e.actor === 'Bidder portal' ? 'public' : 'person'} size="xs" className="text-outline" />
                          {e.actor}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-on-surface-variant">{e.details}</td>
                      <td className="px-5 py-3 text-right">
                        <Icon name="chevron_right" size="md" className="text-outline" />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-body-sm text-on-surface-variant">
                        No audit events match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Side: decisions + retention notice */}
          <div className="flex flex-col gap-6">
            <Card padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold text-on-surface">
                  <Icon name="gavel" size="sm" className="text-navy" /> Final decision history
                </h2>
                <Button size="sm" variant="link" onClick={() => setAction('Final Decision')}>
                  Filter
                </Button>
              </div>
              <ul className="divide-y divide-outline-variant border-t border-outline-variant">
                {decisions.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => setActive(d)} className="flex w-full items-start justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-container-low">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-on-surface">
                          <span className="font-mono">{d.bid}</span> · {d.bidder}
                        </div>
                        <div className="text-[12px] text-on-surface-variant">
                          {d.tender} · {d.actor} · {fmt(d.ts)}
                        </div>
                      </div>
                      <StatusBadge tone={decisionTone(d.result)}>{d.result}</StatusBadge>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Callout tone="neutral" icon="info" title="About this record">
              Audit records are retained to provide traceability for procurement actions. This page is read-only — decisions can’t be edited or modified from here.
            </Callout>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {active && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-navy-900/50 backdrop-blur-[2px] animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && setActive(null)}>
          <aside role="dialog" aria-modal="true" aria-labelledby="audit-title" className="flex h-full w-full max-w-[460px] flex-col bg-surface-container-lowest shadow-overlay animate-slide-in-right">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-5">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Audit event</div>
                <h2 id="audit-title" className="mt-0.5 text-headline-md text-on-surface">
                  {ACTIONS[active.action].label}
                </h2>
                <div className="mt-2">
                  <ActionBadge e={active} />
                </div>
              </div>
              <IconButton icon="close" aria-label="Close" onClick={() => setActive(null)} />
            </div>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto scroll-thin px-6 py-6">
              <DescriptionList
                items={[
                  { label: 'Action', value: ACTIONS[active.action].label },
                  ...(isDoc ? [{ label: 'Document', value: active.document ?? '—' }] : []),
                  { label: 'Timestamp', value: `${fmt(active.ts, true)} IST` },
                  { label: 'Actor', value: active.actor },
                  ...(isDoc && active.access ? [{ label: 'Access', value: active.access }] : []),
                  { label: 'Tender', value: <span className="font-mono">{active.tender}</span> },
                  ...(active.bid ? [{ label: 'Bid', value: <span className="font-mono">{active.bid}</span> }] : []),
                  ...(active.bidder ? [{ label: 'Bidder', value: active.bidder }] : []),
                  { label: 'Details', value: active.details },
                  ...(active.result ? [{ label: 'Result', value: active.action === 'final_decision' ? <StatusBadge tone={decisionTone(active.result)}>{active.result}</StatusBadge> : active.result }] : []),
                  ...(active.comment ? [{ label: active.result === 'Rejected' ? 'Reason' : 'Comment', value: active.comment }] : []),
                  { label: 'Event ID', value: <span className="font-mono">{active.id}</span> },
                ]}
              />
              <p className="flex items-start gap-2 rounded-control bg-surface-container-low px-3.5 py-3 text-body-sm text-on-surface-variant">
                <Icon name="history_edu" size="sm" className="mt-0.5 text-outline" />
                This event is part of the procurement audit record.
              </p>
            </div>
            <div className="flex justify-end border-t border-outline-variant bg-surface-container-low px-6 py-4">
              <Button variant="secondary" onClick={() => setActive(null)}>
                Close
              </Button>
            </div>
          </aside>
        </div>
      )}
    </OfficerPortalShell>
  );
}
