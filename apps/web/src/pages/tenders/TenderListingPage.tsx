// Tender Listing & Search page — ported from the Stitch screen
// "CPCL Bidder Portal - Tender Listing & Search" (project: GeM Portal).
//
// Source of truth: Stitch project 6921642772921774119, screen
// 8e3086035020499ebc5cdef3cbe2e1c1. Ported as closely as possible to the
// generated HTML/Tailwind markup. The Stitch prototype's inline <script>
// (interactive state simulator, tab switching, live search-as-you-type,
// copy-to-clipboard toast) is reimplemented as React state below instead of
// DOM manipulation.
//
// TODO: replace TENDER_ROWS with data from features/tenders/api once
// GET /api/tenders (with filter/sort/pagination) exists on the gateway.
// TODO: wire filter dropdowns (category/type/closing window/eligibility/
// value) and sort-by to real query params instead of being static controls.
// TODO: wire "View Tender" to /tenders/:ref (see TenderDetailsPage).

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';

type SimState = 'all' | 'closing' | 'empty' | 'skeleton';
type TabId = 'all' | 'open' | 'closing' | 'closed';

interface TenderRow {
  ref: string;
  category: 'equipment' | 'it' | 'safety' | 'services' | 'infrastructure';
  status: 'open' | 'closing';
  barColor: string;
  tags: { label: string; tone: 'neutral' | 'highlight' }[];
  title: string;
  authority: string;
  categoryIcon: string;
  categoryLabel: string;
  indicator: { icon: string; iconClass: string; bg: string; content: React.ReactNode };
  value: string;
  emd: string;
  statusLabel: string;
  statusClass: string;
  statusDot: string;
  daysLabel: string;
  daysClass: string;
  due: string;
  bookmarked?: boolean;
  ctaClass: string;
}

const TENDER_ROWS: TenderRow[] = [
  {
    ref: 'CPCL/PROC/2026/041',
    category: 'equipment',
    status: 'closing',
    barColor: 'bg-amber-500',
    tags: [
      { label: 'Two-Cover (Tech + Fin)', tone: 'neutral' },
      { label: 'NCB National', tone: 'neutral' },
      { label: 'MSE Exemption Applicable', tone: 'highlight' },
    ],
    title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
    authority: 'Chennai Petroleum Corporation Limited • Manali Refinery (Zone 4)',
    categoryIcon: 'category',
    categoryLabel: 'Equipment & Hardware',
    indicator: {
      icon: 'edit_note',
      iconClass: 'text-secondary',
      bg: 'bg-surface-container-low',
      content: (
        <>
          <span className="font-label-sm text-label-sm text-on-surface">
            Draft in progress: <strong>Technical Specs Uploaded (Step 3 of 6)</strong>
          </span>
          <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden inline-block ml-1">
            <div className="w-1/2 h-full bg-secondary"></div>
          </div>
        </>
      ),
    },
    value: '₹42.50 Lakhs',
    emd: 'EMD: ₹85,000 (Exemptible)',
    statusLabel: 'CLOSING SOON',
    statusClass: 'bg-amber-50 text-amber-800',
    statusDot: 'bg-amber-600 animate-pulse',
    daysLabel: '2 days remaining',
    daysClass: 'text-amber-700',
    due: '04 Oct 2026 • 17:00 IST',
    ctaClass: 'bg-primary hover:bg-secondary text-on-primary',
  },
  {
    ref: 'CPCL/PROC/2026/039',
    category: 'it',
    status: 'open',
    barColor: 'bg-[#138A4B]',
    tags: [
      { label: 'Global Bidding (ICB)', tone: 'neutral' },
      { label: 'Item-Rate Contract', tone: 'neutral' },
      { label: 'Class-III DSC Required', tone: 'highlight' },
    ],
    title: 'Industrial Network Security Equipment (OT Next-Gen Firewalls)',
    authority: 'Chennai Petroleum Corporation Limited • Refinery SCADA & Cyber Unit',
    categoryIcon: 'lan',
    categoryLabel: 'IT / Technology • Cyber Security',
    indicator: {
      icon: 'verified',
      iconClass: 'text-emerald-700',
      bg: 'bg-emerald-50 text-emerald-800',
      content: (
        <span className="font-label-sm text-label-sm">
          Bid Submitted on <strong>28 Sep</strong> • Encrypted in Digital Tender Vault (ID: #4092)
        </span>
      ),
    },
    value: '₹78.00 Lakhs',
    emd: 'EMD: ₹1,56,000',
    statusLabel: 'OPEN',
    statusClass: 'bg-emerald-50 text-emerald-800',
    statusDot: 'bg-emerald-600',
    daysLabel: '6 days remaining',
    daysClass: 'text-on-surface-variant font-medium',
    due: '08 Oct 2026 • 15:00 IST',
    bookmarked: true,
    ctaClass: 'bg-surface-container hover:bg-surface-container-high text-primary',
  },
  {
    ref: 'CPCL/PROC/2026/037',
    category: 'equipment',
    status: 'open',
    barColor: 'bg-[#138A4B]',
    tags: [
      { label: 'Two-Cover System', tone: 'neutral' },
      { label: 'Turnkey Execution', tone: 'neutral' },
      { label: 'Technical Evaluation', tone: 'highlight' },
    ],
    title: 'Control Room Display Systems (Ultra-High Brightness Video Wall)',
    authority: 'Chennai Petroleum Corporation Limited • Plant Electrical & Instrumentation',
    categoryIcon: 'tv',
    categoryLabel: 'Equipment • Display Systems',
    indicator: {
      icon: 'campaign',
      iconClass: 'text-secondary',
      bg: 'bg-surface-container-low text-on-surface',
      content: (
        <span className="font-body-sm text-body-sm">
          Pre-bid meeting completed on <strong>22 Sep</strong>. Corrigendum-1 issued with revised port clearances.
        </span>
      ),
    },
    value: '₹29.80 Lakhs',
    emd: 'EMD: ₹60,000',
    statusLabel: 'OPEN',
    statusClass: 'bg-emerald-50 text-emerald-800',
    statusDot: 'bg-emerald-600',
    daysLabel: '10 days remaining',
    daysClass: 'text-on-surface-variant font-medium',
    due: '12 Oct 2026 • 12:00 IST',
    ctaClass: 'bg-primary hover:bg-secondary text-on-primary',
  },
  {
    ref: 'CPCL/PROC/2026/035',
    category: 'safety',
    status: 'closing',
    barColor: 'bg-error',
    tags: [
      { label: 'Two-Cover System', tone: 'neutral' },
      { label: 'Critical Replacement', tone: 'error' as 'highlight' },
      { label: 'Class-III DSC Required', tone: 'highlight' },
    ],
    title: 'Industrial Safety Monitoring & Gas Detection Sensor Array',
    authority: 'Chennai Petroleum Corporation Limited • Safety & Environmental Protection',
    categoryIcon: 'sensors',
    categoryLabel: 'Equipment • Safety & Instrumentation',
    indicator: {
      icon: 'warning',
      iconClass: 'text-amber-700',
      bg: 'bg-amber-50 text-amber-900 border-l-2 border-amber-600',
      content: (
        <span className="font-label-sm text-label-sm font-semibold">
          Submissions close this evening at 17:00 IST. Ensure digital tokens are signed prior to 16:30.
        </span>
      ),
    },
    value: '₹36.20 Lakhs',
    emd: 'EMD: ₹72,400',
    statusLabel: 'CLOSING SOON',
    statusClass: 'bg-error-container text-on-error-container',
    statusDot: 'bg-error animate-ping',
    daysLabel: 'Closing in 14 hours',
    daysClass: 'text-error font-bold',
    due: '02 Oct 2026 • 17:00 IST',
    ctaClass: 'bg-primary hover:bg-secondary text-on-primary',
  },
  {
    ref: 'CPCL/PROC/2026/033',
    category: 'services',
    status: 'open',
    barColor: 'bg-[#138A4B]',
    tags: [
      { label: 'Annual Service Contract', tone: 'neutral' },
      { label: 'ICB Global', tone: 'neutral' },
      { label: 'Technical Experience Required', tone: 'highlight' },
    ],
    title: 'Annual Maintenance Contract for Heavy-Duty Gas Turbine Generators',
    authority: 'Chennai Petroleum Corporation Limited • Captive Power Plant (CPP-II)',
    categoryIcon: 'build',
    categoryLabel: 'Services & Maintenance',
    indicator: {
      icon: 'info',
      iconClass: 'text-secondary',
      bg: 'bg-surface-container-low text-on-surface-variant',
      content: (
        <span className="font-body-sm text-body-sm">
          Strict OEM certification / equivalent specialized power turbine experience mandatory.
        </span>
      ),
    },
    value: '₹115.00 Lakhs',
    emd: 'EMD: ₹2,30,000',
    statusLabel: 'OPEN',
    statusClass: 'bg-emerald-50 text-emerald-800',
    statusDot: 'bg-emerald-600',
    daysLabel: '13 days left',
    daysClass: 'text-on-surface-variant font-medium',
    due: '15 Oct 2026 • 16:30 IST',
    ctaClass: 'bg-primary hover:bg-secondary text-on-primary',
  },
  {
    ref: 'CPCL/PROC/2026/030',
    category: 'infrastructure',
    status: 'open',
    barColor: 'bg-[#138A4B]',
    tags: [
      { label: 'Two-Cover System', tone: 'neutral' },
      { label: 'EPC Turnkey', tone: 'neutral' },
      { label: 'Technical Eligibility Required', tone: 'highlight' },
    ],
    title: 'Revamping of Effluent Treatment Plant (ETP) Instrumentation',
    authority: 'Chennai Petroleum Corporation Limited • Environmental Operations Wing',
    categoryIcon: 'nature',
    categoryLabel: 'Infrastructure & Civil • Environmental',
    indicator: {
      icon: 'event_note',
      iconClass: 'text-secondary',
      bg: 'bg-surface-container-low text-on-surface-variant',
      content: (
        <span className="font-body-sm text-body-sm">
          Mandatory site inspection window: <strong>05 Oct – 07 Oct</strong> prior to technical proposal cut-off.
        </span>
      ),
    },
    value: '₹64.20 Lakhs',
    emd: 'EMD: ₹1,28,400',
    statusLabel: 'OPEN',
    statusClass: 'bg-emerald-50 text-emerald-800',
    statusDot: 'bg-emerald-600',
    daysLabel: '16 days left',
    daysClass: 'text-on-surface-variant font-medium',
    due: '18 Oct 2026 • 14:15 IST',
    ctaClass: 'bg-primary hover:bg-secondary text-on-primary',
  },
];

const TABS: { id: TabId; label: string; count: string; tone?: 'closing' }[] = [
  { id: 'all', label: 'All', count: '48' },
  { id: 'open', label: 'Open', count: '42' },
  { id: 'closing', label: 'Closing Soon', count: '6', tone: 'closing' },
  { id: 'closed', label: 'Closed / Under Eval', count: '129' },
];

export function TenderListingPage() {
  const [simState, setSimState] = useState<SimState>('all');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function copyRef(ref: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ref).catch(() => undefined);
    }
    showToast(`Reference number ${ref} copied to clipboard`);
  }

  function selectTab(tab: TabId) {
    setActiveTab(tab);
    setQuery('');
    if (tab === 'closing') setSimState('closing');
    else if (tab === 'closed') setSimState('empty');
    else setSimState('all');
  }

  const visibleRows = useMemo(() => {
    if (simState === 'empty' || simState === 'skeleton') return [];
    const base = simState === 'closing' ? TENDER_ROWS.filter((r) => r.status === 'closing') : TENDER_ROWS;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) => `${r.title} ${r.ref} ${r.authority} ${r.categoryLabel}`.toLowerCase().includes(q));
  }, [simState, query]);

  const showEmpty = simState === 'empty' || (simState !== 'skeleton' && query.trim() !== '' && visibleRows.length === 0);
  const showSkeleton = simState === 'skeleton';

  const subtitle = showSkeleton
    ? 'Loading synchronized tenders from database...'
    : showEmpty
      ? '0 active procurement opportunities located'
      : query.trim()
        ? `Showing ${visibleRows.length} matching procurement opportunities`
        : simState === 'closing'
          ? 'Showing 2 of 6 tenders closing within critical window'
          : `Showing 1–${visibleRows.length} of 48 active procurement opportunities`;

  return (
    <BidderPortalShell>
      <div className="flex flex-col w-full">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-space-sm bg-primary text-on-primary px-space-md py-space-sm rounded-lg shadow-xl transition-all">
            <span className="material-symbols-outlined text-[18px] text-secondary-fixed">content_copy</span>
            <span className="font-label-md text-label-md">{toast}</span>
          </div>
        )}

        {/* 1. TOP VIEW CONTROLLER / PROTOTYPE STATE SIMULATOR */}
        <div className="w-full bg-surface-container-low px-space-lg py-2.5 flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-container text-secondary">
              <span className="material-symbols-outlined text-[14px]">science</span>
            </span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Interactive State Simulator</span>
            <span className="text-outline-variant font-body-sm hidden sm:inline">•</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant hidden sm:inline">Click states to audit production edge cases &amp; UI resilience</span>
          </div>
          <div className="inline-flex rounded-lg p-0.5 bg-surface-container-lowest shadow-sm gap-0.5" role="group">
            {(
              [
                ['all', 'All Active (48)'],
                ['closing', 'Closing Soon (6)'],
                ['empty', 'Empty Search State'],
                ['skeleton', 'Skeleton Loading'],
              ] as [SimState, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setSimState(id);
                  setActiveTab('all');
                  setQuery('');
                }}
                className={
                  'px-3 py-1 text-label-sm font-label-lg rounded transition-all ' +
                  (simState === id ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface')
                }
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. PAGE HEADER */}
        <div className="px-space-lg pt-space-lg pb-space-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div>
              <div className="flex items-center gap-space-sm mb-1">
                <span className="font-headline-lg text-headline-lg text-primary tracking-tight">Tenders</span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-secondary font-label-sm text-[11px] font-bold uppercase tracking-wider">Public Sector Open</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                Find and participate in procurement opportunities across Chennai Petroleum Corporation Limited.
              </p>
            </div>
            <div className="flex items-center gap-space-sm self-start lg:self-auto">
              <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest text-on-surface font-label-md text-label-md rounded-lg shadow-sm hover:bg-surface-container-low transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px] text-secondary">bookmark</span>
                <span>Saved Tenders</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface font-label-sm text-[11px]">3</span>
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest text-on-surface font-label-md text-label-md rounded-lg shadow-sm hover:bg-surface-container-low transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">download_for_offline</span>
                <span>Tender Archive (ZIP)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. SEARCH CONTAINER */}
        <div className="px-space-lg mb-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
            <div className="flex flex-col md:flex-row gap-space-sm items-stretch">
              <div className="relative flex-1 flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[22px] text-on-surface-variant pointer-events-none">search</span>
                <input
                  className="w-full h-11 pl-11 pr-24 rounded-lg bg-surface-container-low text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest transition-colors"
                  placeholder="Search tenders, NIT numbers, item categories, keywords..."
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSimState(e.target.value.trim() ? 'all' : simState === 'skeleton' ? 'all' : simState);
                  }}
                />
                <div className="absolute right-3 flex items-center gap-1 pointer-events-none">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest font-label-sm text-[10px] text-on-surface-variant font-semibold">Ctrl + K</kbd>
                </div>
              </div>
              <button className="h-11 px-6 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px]">manage_search</span>
                <span>Search Bids</span>
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-space-sm pt-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#138A4B]"></span>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold tracking-wide">48 Active Opportunities</span>
                <span className="text-outline-variant text-[12px]">•</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">CVC Compliant Open Bidding Workflow</span>
              </div>
              <button className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary hover:text-primary transition-colors" type="button">
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Advanced Search Parameters</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. RESULT STATUS TABS */}
        <div className="px-space-lg mb-space-sm">
          <div className="flex items-center space-x-6 bg-surface-container-lowest px-space-md rounded-lg shadow-sm overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={
                  'py-3.5 inline-flex items-center gap-2 font-label-md text-label-md relative ' +
                  (activeTab === tab.id
                    ? "text-primary font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-secondary"
                    : 'text-on-surface-variant hover:text-on-surface')
                }
                type="button"
              >
                <span>{tab.label}</span>
                {tab.tone === 'closing' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> {tab.count}
                  </span>
                ) : (
                  <span
                    className={
                      'px-1.5 py-0.2 rounded-full text-[11px] font-bold ' +
                      (activeTab === tab.id ? 'bg-surface-container text-on-surface' : 'bg-surface-container-low text-on-surface-variant')
                    }
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 5. FILTER TOOLBAR & ACTIVE CHIPS */}
        <div className="px-space-lg mb-space-md">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <FilterSelect label="Category" options={['All Categories', 'Equipment & Hardware', 'Services & Maintenance', 'Infrastructure & Civil', 'IT & Cyber Security', 'Safety & Environmental']} />
              <FilterSelect label="Tender Type" options={['All Types', 'Two-Cover System', 'Single Cover', 'ICB Global Bidding', 'Item-Rate Contract', 'Turnkey Execution']} />
              <FilterSelect label="Closing Window" options={['Any date', 'Within 24 Hours', 'Within 7 Days', 'Within 30 Days', 'Custom Date Range']} />
              <FilterSelect label="Vendor Eligibility" options={['All Tenders', 'Class-3 Verified Match', 'MSE Exemption Applicable', 'Startup Recognized']} />
              <FilterSelect label="Estimated Value" options={['Any Value', '< ₹50.00 Lakhs', '₹50.00L - ₹1.00 Cr', '> ₹1.00 Crore']} />
              <div>
                <label className="block font-label-sm text-[11px] text-on-surface-variant mb-1 font-semibold">View Density</label>
                <div className="h-9 flex items-center justify-between px-2 bg-surface-container-low rounded">
                  <span className="font-body-sm text-[12px] text-on-surface-variant">Structured</span>
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-lowest text-secondary shadow-sm" title="Expanded List" type="button">
                      <span className="material-symbols-outlined text-[16px]">view_agenda</span>
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface" title="Compact Table" type="button">
                      <span className="material-symbols-outlined text-[16px]">table_rows</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-2 bg-surface-container-low p-2 rounded-lg">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Active Filters:</span>
                {['Status: Open (All)', 'Category: All Divisions', 'Vendor Match: Class-3 Verified'].map((chip) => {
                  const [k, v] = chip.split(': ');
                  return (
                    <div key={chip} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-lowest text-on-surface text-label-sm font-label-sm shadow-sm">
                      <span>
                        {k}: <strong>{v}</strong>
                      </span>
                      <button className="hover:text-error flex items-center" type="button">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  );
                })}
                <button className="font-label-sm text-label-sm text-secondary hover:underline ml-1" type="button">
                  Clear all filters
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-[12px]">
                <span className="material-symbols-outlined text-[14px] text-secondary">sync</span>
                <span>Synced with CPCL SAP-ERP 2 mins ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. RESULT HEADER & SORTING */}
        <div className="px-space-lg mb-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div>
            <div className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">Available Tenders</div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Sort by:</span>
            <select
              className="h-9 px-3 rounded-lg bg-surface-container-lowest text-body-sm font-label-md text-on-surface shadow-sm focus:outline-none"
              onChange={(e) => showToast('Reordered list by ' + e.target.value.replace('_', ' '))}
            >
              <option value="closing_earliest">Closing Date (Earliest first)</option>
              <option value="newest">Newest First</option>
              <option value="val_high">Estimated Value (High to Low)</option>
              <option value="val_low">Estimated Value (Low to High)</option>
              <option value="relevance">Relevance Score</option>
            </select>
          </div>
        </div>

        {/* 7. TENDER RESULT LIST CONTAINER */}
        <div className="px-space-lg mb-space-lg">
          {showSkeleton ? (
            <div className="flex flex-col gap-space-sm animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm h-36 flex flex-col justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-28 h-5 bg-surface-container-high rounded"></div>
                    <div className="w-32 h-5 bg-surface-container rounded"></div>
                  </div>
                  <div className="w-3/4 h-7 bg-surface-container-high rounded my-2"></div>
                  <div className="flex items-center justify-between">
                    <div className="w-1/2 h-4 bg-surface-container rounded"></div>
                    <div className="w-24 h-9 bg-surface-container-high rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : showEmpty ? (
            <div className="bg-surface-container-lowest rounded-xl p-space-xl text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-surface-container-low text-on-surface-variant mx-auto flex items-center justify-center mb-space-md">
                <span className="material-symbols-outlined text-[32px]">manage_search</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">No procurement tenders match your search criteria</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto mb-space-md">
                We could not locate active tenders matching the specified query or applied filters. Try relaxing filter criteria or searching by general item category.
              </p>
              <div className="flex items-center justify-center gap-space-sm">
                <button
                  className="px-4 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:bg-secondary transition-colors"
                  onClick={() => {
                    setSimState('all');
                    setActiveTab('all');
                    setQuery('');
                  }}
                  type="button"
                >
                  Reset All Filters &amp; Search
                </button>
                <button className="px-4 py-2 bg-surface-container text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-high transition-colors" type="button">
                  Subscribe to Tender Alerts
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-space-sm transition-all duration-300">
              {visibleRows.map((row) => (
                <article key={row.ref} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${row.barColor}`}></div>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pl-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-low font-mono font-label-sm text-[11px] text-primary">
                          <span>{row.ref}</span>
                          <button className="text-on-surface-variant hover:text-secondary flex items-center" onClick={() => copyRef(row.ref)} title="Copy Reference" type="button">
                            <span className="material-symbols-outlined text-[13px]">content_copy</span>
                          </button>
                        </div>
                        {row.tags.map((tag) => (
                          <span
                            key={tag.label}
                            className={
                              'px-2 py-0.5 rounded font-label-sm text-[11px] ' +
                              (tag.tone === 'highlight'
                                ? 'bg-surface-container-low text-secondary'
                                : (tag.tone as string) === 'error'
                                  ? 'bg-error-container text-on-error-container font-bold'
                                  : 'bg-surface-container text-on-surface-variant')
                            }
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                      <Link
                        to={`/tenders/${encodeURIComponent(row.ref)}`}
                        className="block font-headline-sm text-headline-sm font-semibold text-primary hover:text-secondary cursor-pointer transition-colors leading-snug mb-1"
                      >
                        {row.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant font-body-sm text-body-sm mb-2.5">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-on-surface-variant">apartment</span>
                          <span>{row.authority}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-on-surface-variant">{row.categoryIcon}</span>
                          <span>{row.categoryLabel}</span>
                        </div>
                      </div>
                      <div className={`inline-flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-lg ${row.indicator.bg}`}>
                        <span className={`material-symbols-outlined text-[15px] ${row.indicator.iconClass}`}>{row.indicator.icon}</span>
                        {row.indicator.content}
                      </div>
                    </div>

                    <div className="flex flex-row lg:flex-col justify-between lg:items-end gap-3 min-w-[200px] border-t lg:border-t-0 pt-2 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <div className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Estimated Value</div>
                        <div className="font-label-lg text-label-lg font-bold text-primary">{row.value}</div>
                        <div className="font-body-sm text-[11px] text-on-surface-variant">{row.emd}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 mb-0.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-[11px] font-bold ${row.statusClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${row.statusDot}`}></span>
                            {row.statusLabel}
                          </span>
                          <span className={`font-label-sm text-[11px] ${row.daysClass}`}>{row.daysLabel}</span>
                        </div>
                        <div className="font-body-sm text-[12px] text-on-surface-variant">
                          Due: <strong>{row.due}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center lg:flex-col justify-end gap-2 border-t lg:border-t-0 pt-2 lg:pt-0">
                      <button
                        className={
                          'w-9 h-9 rounded-lg flex items-center justify-center transition-colors ' +
                          (row.bookmarked ? 'bg-surface-container-low hover:bg-surface-container text-secondary' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary')
                        }
                        title={row.bookmarked ? 'Remove Bookmark' : 'Bookmark Tender'}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[19px]">{row.bookmarked ? 'bookmark' : 'bookmark_border'}</span>
                      </button>
                      <Link
                        to={`/tenders/${encodeURIComponent(row.ref)}`}
                        className={`flex-1 lg:flex-none px-4 py-2 font-label-md text-label-md rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shadow-sm ${row.ctaClass}`}
                      >
                        <span>View Tender</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* 8. PAGINATION CONTROLS */}
        {!showEmpty && !showSkeleton && (
          <div className="px-space-lg mb-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Showing 1–6 of 48 tenders</span>
              <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                <span>Show:</span>
                <select className="h-8 px-2 rounded bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-sm focus:outline-none" defaultValue="6">
                  <option>6</option>
                  <option>12</option>
                  <option>24</option>
                  <option>48</option>
                </select>
                <span>per page</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container shadow-sm flex items-center justify-center disabled:opacity-40" disabled type="button">
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center shadow-sm" type="button">1</button>
              {[2, 3, 4].map((n) => (
                <button key={n} className="w-8 h-8 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm font-label-md text-label-md flex items-center justify-center" type="button">
                  {n}
                </button>
              ))}
              <span className="w-6 text-center text-on-surface-variant font-label-sm">...</span>
              <button className="w-8 h-8 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm font-label-md text-label-md flex items-center justify-center" type="button">8</button>
              <button className="w-8 h-8 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm flex items-center justify-center" type="button">
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}

        {/* 9. STATUTORY COMPLIANCE FOOTNOTE */}
        <div className="px-space-lg pb-space-xl">
          <div className="bg-surface-container-low rounded-xl p-space-md flex items-start gap-space-md">
            <span className="material-symbols-outlined text-[20px] text-secondary mt-0.5">verified_user</span>
            <div className="flex-1">
              <div className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold mb-1">BIDDER DISCOVERY &amp; TRANSPARENCY NOTICE</div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                All published procurement opportunities conform strictly to Central Vigilance Commission (CVC) statutory disclosure standards. Bids
                submitted electronically are cryptographically encrypted via 2048-bit PKI with hardware-token timestamps and remain zero-visibility
                sealed until the scheduled public electronic opening.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BidderPortalShell>
  );
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <label className="block font-label-sm text-[11px] text-on-surface-variant mb-1 font-semibold">{label}</label>
      <select className="w-full h-9 px-2.5 rounded bg-surface-container-low text-body-sm font-body-sm text-on-surface focus:outline-none focus:bg-surface-container">
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
