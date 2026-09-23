// My Bids page — ported from the Stitch screen "CPCL Bidder Portal - My
// Bids" (project: GeM Portal). Source: Stitch project 6921642772921774119,
// screen 25bc481f794f425b9c3c02d025350e47.
//
// The Stitch prototype's inline <script> (tab filter, live search, empty
// state) is reimplemented as React state below instead of DOM manipulation.
//
// TODO: replace BID_ROWS with data from features/tenders (my bids) via
// GET /api/bids once the gateway exposes it. TODO: wire "Continue Bid"
// (draft rows) to resume at the bidder's actual last-completed workspace
// step instead of always Step 1.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';

type BidStatus = 'draft' | 'submitted' | 'processing' | 'closed';
type TabId = 'all' | BidStatus;

interface BidRow {
  icon: string;
  title: string;
  tags: string[];
  ref: string;
  bidId: string;
  status: BidStatus;
  justSubmitted?: boolean;
  dateLabel: string;
  dateValue: string;
  dateTime?: string;
  dateNote: string;
  dateNoteIcon: string;
  closing: string;
  closingNote: string;
  closingNoteClass: string;
  search: string;
}

const BID_ROWS: BidRow[] = [
  {
    icon: 'videocam',
    title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
    tags: ['Manali Refinery Operations', 'Surveillance & Perimeter Security'],
    ref: 'CPCL/PROC/2026/041',
    bidId: 'BID-2026-00418',
    status: 'submitted',
    justSubmitted: true,
    dateLabel: 'Submitted On:',
    dateValue: '04 Oct 2026',
    dateTime: '16:42:09 IST',
    dateNote: 'Signed via DSC',
    dateNoteIcon: 'lock',
    closing: '04 Oct 2026, 17:00 IST',
    closingNote: 'Window Closing Soon',
    closingNoteClass: 'bg-error-container text-on-error-container',
    search: 'supply of cctv cameras for public safety infrastructure manali refinery operations surveillance cpcl/proc/2026/041 bid-2026-00418',
  },
  {
    icon: 'security',
    title: 'Industrial Network Security Equipment',
    tags: ['IT & Communications Division', 'Firewalls & Core Switches'],
    ref: 'CPCL/PROC/2026/039',
    bidId: 'BID-2026-00392',
    status: 'processing',
    dateLabel: 'Submitted On:',
    dateValue: '28 Sep 2026',
    dateTime: '14:18:40 IST',
    dateNote: 'Signed via DSC',
    dateNoteIcon: 'lock',
    closing: '08 Oct 2026, 15:00 IST',
    closingNote: '4 days remaining',
    closingNoteClass: '',
    search: 'industrial network security equipment it & communications division firewalls core switches cpcl/proc/2026/039 bid-2026-00392',
  },
  {
    icon: 'monitor',
    title: 'Control Room Display Systems',
    tags: ['Process Automation & SCADA Infrastructure'],
    ref: 'CPCL/PROC/2026/037',
    bidId: 'BID-2026-00371',
    status: 'submitted',
    dateLabel: 'Submitted On:',
    dateValue: '22 Sep 2026',
    dateTime: '11:32:15 IST',
    dateNote: 'Signed via DSC',
    dateNoteIcon: 'lock',
    closing: '12 Oct 2026, 12:00 IST',
    closingNote: '8 days remaining',
    closingNoteClass: '',
    search: 'control room display systems process automation scada infrastructure cpcl/proc/2026/037 bid-2026-00371',
  },
  {
    icon: 'power',
    title: 'AMC Heavy-Duty Gas Turbine Generators',
    tags: ['Mechanical & Power Auxiliary Maintenance'],
    ref: 'CPCL/PROC/2026/033',
    bidId: 'BID-DRAFT-2026-00334',
    status: 'draft',
    dateLabel: 'Created / Saved:',
    dateValue: '30 Sep 2026',
    dateTime: '18:20:11 IST',
    dateNote: 'Auto-saved locally',
    dateNoteIcon: 'save',
    closing: '15 Oct 2026, 16:30 IST',
    closingNote: '11 days remaining',
    closingNoteClass: '',
    search: 'amc heavy-duty gas turbine generators mechanical & power auxiliary maintenance cpcl/proc/2026/033 bid-draft-2026-00334',
  },
];

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'processing', label: 'Under Processing' },
  { id: 'closed', label: 'Closed' },
];

const STATUS_BADGE: Record<BidStatus, { icon: string; label: string; className: string; spin?: boolean }> = {
  submitted: { icon: 'check_circle', label: 'Submitted', className: 'bg-[#E7F6ED] border border-[#138A4B] text-[#0F6B3A]' },
  processing: { icon: 'sync', label: 'Under Processing', className: 'bg-[#FFF7E6] border border-[#FF9933] text-[#8A4B00]', spin: true },
  draft: { icon: '', label: 'Draft', className: 'bg-[#EDEFF2] border border-[#5B6472] text-[#172033]' },
  closed: { icon: 'block', label: 'Closed', className: 'bg-surface-container border border-outline text-on-surface-variant' },
};

const STATUS_DEFS = [
  { dot: 'bg-[#5B6472]', label: 'Draft', body: 'Form filled and saved locally. Unsubmitted bids are not visible to the CPCL tender committee and may be edited until deadline.' },
  { dot: 'bg-[#138A4B]', label: 'Submitted', body: 'Encrypted, digitally signed with your Class-3 token, and receipt acknowledged in the sovereign ledger.' },
  { dot: 'bg-[#FF9933]', label: 'Under Processing', body: 'Envelope verification, integrity checks, and fee reconciliation in automated staging prior to technical opening.' },
  { dot: 'bg-outline', label: 'Closed', body: 'Tender window closed or evaluated. Historical bids remain archived for statutory audit compliance for 7 years.' },
];

export function MyBidsPage() {
  const [showToast, setShowToast] = useState(true);
  const [tab, setTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { all: BID_ROWS.length, draft: 0, submitted: 0, processing: 0, closed: 0 };
    BID_ROWS.forEach((r) => c[r.status]++);
    return c;
  }, []);

  const rows = useMemo(() => {
    const q = query.toLowerCase().trim();
    return BID_ROWS.filter((r) => (tab === 'all' || r.status === tab) && (!q || r.search.includes(q)));
  }, [tab, query]);

  return (
    <BidderPortalShell breadcrumb="My Bids">
      <div className="flex flex-col w-full px-space-lg py-space-md">
        {/* Success toast */}
        {showToast && (
          <div className="mb-space-md p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md transition-all duration-300">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-[#E7F6ED] border border-[#138A4B] text-[#0F6B3A] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <div className="flex items-center gap-space-xs">
                  <h4 className="font-label-lg text-label-lg text-on-surface">Bid Submitted Successfully</h4>
                  <span className="px-2 py-0.5 rounded-full bg-[#E7F6ED] text-[#0F6B3A] font-label-sm text-label-sm uppercase tracking-wide">Recorded</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Tender: <span className="font-medium text-on-surface">CPCL/PROC/2026/041</span> • Acknowledgment Receipt{' '}
                  <span className="font-mono text-secondary font-medium">SR-2026-00418</span> has been dispatched to authorized signatory email.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-space-sm shrink-0 self-end md:self-auto">
              <button className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors font-label-sm text-label-sm text-on-surface font-semibold" onClick={() => window.print()} type="button">
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                Download Receipt
              </button>
              <button aria-label="Dismiss alert" className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors" onClick={() => setShowToast(false)} type="button">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-space-lg gap-space-md">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm tracking-wider uppercase">Bid Registry</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                • Official Bidder Account: <strong className="font-mono text-on-surface">BIDDER-00482</strong>
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">My Bids</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
              View and track the bids submitted for procurement opportunities. All actions are cryptographically sealed and authenticated under
              your active Class-3 Digital Signature Certificate.
            </p>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <Link className="inline-flex items-center gap-2 px-space-lg py-2.5 rounded-lg bg-primary text-on-primary hover:bg-secondary transition-colors font-label-lg text-label-lg shadow-sm" to="/tenders">
              <span className="material-symbols-outlined text-[20px]">search_insights</span>
              Browse Tenders
            </Link>
          </div>
        </div>

        {/* Status Tabs & Filter Toolbar */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-t-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant px-space-md gap-space-sm overflow-x-auto">
            <nav className="flex items-center space-x-1" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={
                    'inline-flex items-center gap-2 py-space-md px-space-sm border-b-2 font-label-lg text-label-lg whitespace-nowrap transition-colors ' +
                    (tab === t.id ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-on-surface')
                  }
                  onClick={() => setTab(t.id)}
                  type="button"
                >
                  <span>{t.label}</span>
                  <span
                    className={
                      'px-2 py-0.5 rounded-full font-label-sm text-label-sm ' +
                      (tab === t.id ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : 'bg-surface-container-high text-on-surface')
                    }
                  >
                    {counts[t.id]}
                  </span>
                </button>
              ))}
            </nav>
            <div className="hidden lg:flex items-center gap-1.5 py-space-sm font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">schedule</span>
              <span>
                Registry Refreshed: <span className="font-medium text-on-surface">04 Oct 2026, 17:05:22 IST</span>
              </span>
            </div>
          </div>
          <div className="p-space-md flex flex-col md:flex-row items-center justify-between gap-space-md bg-surface-container-low/40">
            <div className="relative w-full md:w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input
                className="w-full h-10 pl-10 pr-space-md rounded-lg bg-surface-container-lowest border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-secondary transition-all"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by tender title or reference..."
                type="text"
                value={query}
              />
            </div>
            <div className="flex items-center justify-between w-full md:w-auto gap-space-lg">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Showing <strong className="font-semibold text-on-surface">{rows.length}</strong> {rows.length === 1 ? 'bid' : 'bids'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Sort:</span>
                <select className="h-9 px-space-sm rounded-lg bg-surface-container-lowest border border-outline-variant font-label-sm text-label-sm text-on-surface focus:outline-none focus:border-secondary">
                  <option value="recent">Most Recent Submission</option>
                  <option value="deadline">Approaching Deadline</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bids Table */}
        <div className="overflow-x-auto bg-surface-container-lowest border-x border-b border-outline-variant shadow-sm">
          {rows.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-3 px-space-md w-4/12" scope="col">Tender Information</th>
                  <th className="py-3 px-space-md w-2/12" scope="col">Reference Numbers</th>
                  <th className="py-3 px-space-md w-2/12" scope="col">Timeline &amp; Dates</th>
                  <th className="py-3 px-space-md w-2/12" scope="col">Closing Deadline</th>
                  <th className="py-3 px-space-md w-1/12 text-center" scope="col">Status</th>
                  <th className="py-3 px-space-md w-1/12 text-right" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-body-sm text-body-sm">
                {rows.map((row) => {
                  const badge = STATUS_BADGE[row.status];
                  const isDraft = row.status === 'draft';
                  return (
                    <tr key={row.bidId} className="group hover:bg-surface-container-low/70 transition-colors">
                      <td className="py-4 px-space-md align-top">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 text-on-surface-variant group-hover:text-secondary transition-colors">
                            <span className="material-symbols-outlined text-[18px]">{row.icon}</span>
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Link className="font-label-lg text-label-lg text-on-surface font-semibold hover:text-secondary transition-colors leading-snug" to={`/my-bids/${encodeURIComponent(row.bidId)}`}>
                                {row.title}
                              </Link>
                              {row.justSubmitted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                                  Just Submitted
                                </span>
                              )}
                            </div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                              {row.tags.map((tag, i) => (
                                <span key={tag} className="flex items-center gap-1.5">
                                  {i > 0 && <span>•</span>}
                                  <span>{tag}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-space-md align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tender Ref:</span>
                          <span className="font-mono text-on-surface font-semibold text-[13px]">{row.ref}</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-1">{isDraft ? 'Draft ID:' : 'Submission ID:'}</span>
                          <span className={'font-mono font-medium text-[13px] ' + (isDraft ? 'text-on-surface-variant' : 'text-secondary')}>{row.bidId}</span>
                          {row.status === 'submitted' && (
                            <span className="font-label-sm text-label-sm text-[#0F6B3A] inline-flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[13px]">verified</span> Receipt Available
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-space-md align-top">
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{row.dateLabel}</span>
                          <span className="font-medium text-on-surface text-[13px] mt-0.5">{row.dateValue}</span>
                          {row.dateTime && <span className="font-mono text-on-surface-variant text-[12px]">{row.dateTime}</span>}
                          <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 inline-flex items-center gap-1">
                            <span className={'material-symbols-outlined text-[14px] ' + (row.dateNoteIcon === 'lock' ? 'text-[#0F6B3A]' : '')}>{row.dateNoteIcon}</span> {row.dateNote}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-space-md align-top">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 text-on-surface font-medium text-[13px]">
                            <span>{row.closing}</span>
                          </div>
                          {row.closingNoteClass ? (
                            <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-label-sm w-fit font-medium ${row.closingNoteClass}`}>
                              <span className="material-symbols-outlined text-[13px]">timer</span> {row.closingNote}
                            </span>
                          ) : (
                            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{row.closingNote}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-space-md align-top text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold uppercase tracking-wider whitespace-nowrap ${badge.className}`}>
                          {badge.icon ? (
                            <span className={'material-symbols-outlined text-[14px]' + (badge.spin ? ' animate-spin' : '')}>{badge.icon}</span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5B6472]"></span>
                          )}
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-4 px-space-md align-top text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {isDraft ? (
                            <>
                              <Link className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-secondary transition-colors font-label-sm text-label-sm font-semibold shadow-xs" to={`/tenders/${encodeURIComponent(row.ref)}/bid/1`}>
                                Continue Bid
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </Link>
                              <button className="text-error hover:text-on-error-container font-label-sm text-label-sm inline-flex items-center gap-1" type="button">
                                Discard Draft
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                className={
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold transition-colors ' +
                                  (row.status === 'submitted' && row.justSubmitted
                                    ? 'bg-secondary text-on-secondary hover:bg-primary-container shadow-xs'
                                    : 'border border-outline-variant hover:bg-surface-container text-on-surface')
                                }
                                to={`/my-bids/${encodeURIComponent(row.bidId)}`}
                              >
                                View Bid
                                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                              </Link>
                              <button className="text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm inline-flex items-center gap-1 underline underline-offset-2" type="button">
                                Download PDF
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 px-space-md flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-space-md">
                <span className="material-symbols-outlined text-[28px]">folder_off</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">No bids found in this category</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1 mb-space-lg">
                There are currently no bids matching your search or selected status filter under vendor BIDDER-00482.
              </p>
              <div className="flex items-center gap-space-sm">
                <button
                  className="px-space-md py-2 rounded-lg border border-outline-variant font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors"
                  onClick={() => {
                    setQuery('');
                    setTab('all');
                  }}
                  type="button"
                >
                  Clear Filters
                </button>
                <Link className="px-space-md py-2 rounded-lg bg-primary text-on-primary hover:bg-secondary font-label-md text-label-md transition-colors" to="/tenders">
                  Browse Live Tenders
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Bidder Guidance & Lifecycle Helper Strip */}
        <div className="mt-space-lg bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md">
          <div className="flex items-center gap-2 mb-space-sm">
            <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
            <h3 className="font-label-lg text-label-lg text-on-surface">Status Definitions &amp; Vendor Governance</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {STATUS_DEFS.map((def) => (
              <div key={def.label} className="p-space-sm rounded-lg bg-surface-container-low border border-outline-variant">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${def.dot}`}></span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold">{def.label}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{def.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-space-sm pt-space-sm border-t border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#0F6B3A]">verified_user</span>
              Strict vendor isolation: You are viewing records strictly restricted to registered bidder entity <strong className="font-mono text-on-surface">BIDDER-00482</strong>.
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Need bid retraction or clarification? <a className="text-secondary font-semibold hover:underline" href="#">Raise Clarification Query</a>
            </span>
          </div>
        </div>
      </div>
    </BidderPortalShell>
  );
}
