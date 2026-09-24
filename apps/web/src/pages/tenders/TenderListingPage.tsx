// Tender Listing & Search — ported from Stitch screen "CPCL Bidder Portal -
// Tender Listing & Search" (project 6921642772921774119, screen
// 8e3086035020499ebc5cdef3cbe2e1c1), rebuilt on the shared design system.
// The Stitch prototype's inline script (state simulator, tabs, live search,
// copy-to-clipboard toast) is implemented as React state.
//
// TODO: replace TENDER_ROWS with GET /api/tenders (filters/sort/pagination)
// via features/tenders/api; wire filter selects and sort to query params.

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  IconButton,
  PageHeader,
  SearchInput,
  Select,
  Skeleton,
  StatusBadge,
  Tabs,
  Tag,
  Toast,
} from '@/components/primitives';
import { cn } from '@/utils/cn';

type SimState = 'all' | 'closing' | 'empty' | 'skeleton';
type TabId = 'all' | 'open' | 'closing' | 'closed';
type Urgency = 'normal' | 'soon' | 'critical';

interface TenderRow {
  ref: string;
  status: 'open' | 'closing';
  urgency: Urgency;
  tags: { label: string; tone: 'neutral' | 'highlight' | 'danger' }[];
  title: string;
  authority: string;
  categoryIcon: string;
  categoryLabel: string;
  indicator: { icon: string; tone: 'info' | 'success' | 'warning' | 'neutral'; content: ReactNode; progress?: number };
  value: string;
  emd: string;
  daysLabel: string;
  due: string;
  bookmarked?: boolean;
}

const TENDER_ROWS: TenderRow[] = [
  {
    ref: 'CPCL/PROC/2026/041',
    status: 'closing',
    urgency: 'soon',
    tags: [
      { label: 'Two-cover (Tech + Fin)', tone: 'neutral' },
      { label: 'NCB National', tone: 'neutral' },
      { label: 'MSE exemption', tone: 'highlight' },
    ],
    title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
    authority: 'Manali Refinery (Zone 4)',
    categoryIcon: 'category',
    categoryLabel: 'Equipment & Hardware',
    indicator: { icon: 'edit_note', tone: 'info', content: <>Draft in progress · <strong>Technical specs uploaded</strong> (step 3 of 6)</>, progress: 50 },
    value: '₹42.50 L',
    emd: 'EMD ₹85,000 · exemptible',
    daysLabel: '2 days left',
    due: '04 Oct 2026 · 17:00 IST',
  },
  {
    ref: 'CPCL/PROC/2026/039',
    status: 'open',
    urgency: 'normal',
    tags: [
      { label: 'Global bidding (ICB)', tone: 'neutral' },
      { label: 'Item-rate contract', tone: 'neutral' },
      { label: 'Class-III DSC required', tone: 'highlight' },
    ],
    title: 'Industrial Network Security Equipment (OT Next-Gen Firewalls)',
    authority: 'Refinery SCADA & Cyber Unit',
    categoryIcon: 'lan',
    categoryLabel: 'IT · Cyber Security',
    indicator: { icon: 'verified', tone: 'success', content: <>Bid submitted on <strong>28 Sep</strong> · sealed in vault (#4092)</> },
    value: '₹78.00 L',
    emd: 'EMD ₹1,56,000',
    daysLabel: '6 days left',
    due: '08 Oct 2026 · 15:00 IST',
    bookmarked: true,
  },
  {
    ref: 'CPCL/PROC/2026/037',
    status: 'open',
    urgency: 'normal',
    tags: [
      { label: 'Two-cover system', tone: 'neutral' },
      { label: 'Turnkey execution', tone: 'neutral' },
      { label: 'Technical evaluation', tone: 'highlight' },
    ],
    title: 'Control Room Display Systems (Ultra-High Brightness Video Wall)',
    authority: 'Plant Electrical & Instrumentation',
    categoryIcon: 'tv',
    categoryLabel: 'Equipment · Display Systems',
    indicator: { icon: 'campaign', tone: 'neutral', content: <>Pre-bid meeting held <strong>22 Sep</strong>. Corrigendum-1 issued with revised port clearances.</> },
    value: '₹29.80 L',
    emd: 'EMD ₹60,000',
    daysLabel: '10 days left',
    due: '12 Oct 2026 · 12:00 IST',
  },
  {
    ref: 'CPCL/PROC/2026/035',
    status: 'closing',
    urgency: 'critical',
    tags: [
      { label: 'Two-cover system', tone: 'neutral' },
      { label: 'Critical replacement', tone: 'danger' },
      { label: 'Class-III DSC required', tone: 'highlight' },
    ],
    title: 'Industrial Safety Monitoring & Gas Detection Sensor Array',
    authority: 'Safety & Environmental Protection',
    categoryIcon: 'sensors',
    categoryLabel: 'Equipment · Safety & Instrumentation',
    indicator: { icon: 'warning', tone: 'warning', content: <>Submissions close <strong>this evening at 17:00 IST</strong>. Sign digital tokens before 16:30.</> },
    value: '₹36.20 L',
    emd: 'EMD ₹72,400',
    daysLabel: 'Closes in 14 h',
    due: '02 Oct 2026 · 17:00 IST',
  },
  {
    ref: 'CPCL/PROC/2026/033',
    status: 'open',
    urgency: 'normal',
    tags: [
      { label: 'Annual service contract', tone: 'neutral' },
      { label: 'ICB global', tone: 'neutral' },
      { label: 'Experience required', tone: 'highlight' },
    ],
    title: 'Annual Maintenance Contract for Heavy-Duty Gas Turbine Generators',
    authority: 'Captive Power Plant (CPP-II)',
    categoryIcon: 'build',
    categoryLabel: 'Services & Maintenance',
    indicator: { icon: 'info', tone: 'neutral', content: <>OEM certification or equivalent power-turbine experience is mandatory.</> },
    value: '₹115.00 L',
    emd: 'EMD ₹2,30,000',
    daysLabel: '13 days left',
    due: '15 Oct 2026 · 16:30 IST',
  },
  {
    ref: 'CPCL/PROC/2026/030',
    status: 'open',
    urgency: 'normal',
    tags: [
      { label: 'Two-cover system', tone: 'neutral' },
      { label: 'EPC turnkey', tone: 'neutral' },
      { label: 'Technical eligibility', tone: 'highlight' },
    ],
    title: 'Revamping of Effluent Treatment Plant (ETP) Instrumentation',
    authority: 'Environmental Operations Wing',
    categoryIcon: 'nature',
    categoryLabel: 'Infrastructure & Civil',
    indicator: { icon: 'event_note', tone: 'neutral', content: <>Mandatory site inspection <strong>05–07 Oct</strong> before technical cut-off.</> },
    value: '₹64.20 L',
    emd: 'EMD ₹1,28,400',
    daysLabel: '16 days left',
    due: '18 Oct 2026 · 14:15 IST',
  },
];

const FILTERS: { label: string; options: string[] }[] = [
  { label: 'Category', options: ['All categories', 'Equipment & Hardware', 'Services & Maintenance', 'Infrastructure & Civil', 'IT & Cyber Security', 'Safety & Environmental'] },
  { label: 'Tender type', options: ['All types', 'Two-cover system', 'Single cover', 'ICB global bidding', 'Item-rate contract', 'Turnkey execution'] },
  { label: 'Closing window', options: ['Any date', 'Within 24 hours', 'Within 7 days', 'Within 30 days', 'Custom range'] },
  { label: 'Vendor eligibility', options: ['All tenders', 'Class-3 verified match', 'MSE exemption applicable', 'Startup recognized'] },
  { label: 'Estimated value', options: ['Any value', '< ₹50 Lakhs', '₹50 L – ₹1 Cr', '> ₹1 Crore'] },
];

const INITIAL_CHIPS = [
  { key: 'Status', value: 'Open (all)' },
  { key: 'Category', value: 'All divisions' },
  { key: 'Vendor match', value: 'Class-3 verified' },
];

const INDICATOR_TONE = {
  info: 'bg-info-container/70 text-info-on-container',
  success: 'bg-success-container text-success-on-container',
  warning: 'bg-warning-container text-warning-on-container',
  neutral: 'bg-surface-container-low text-on-surface-variant',
};

export function TenderListingPage() {
  const [simState, setSimState] = useState<SimState>('all');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function copyRef(ref: string) {
    if (navigator.clipboard) navigator.clipboard.writeText(ref).catch(() => undefined);
    showToast(`Reference ${ref} copied to clipboard`);
  }

  function selectTab(tab: TabId) {
    setActiveTab(tab);
    setQuery('');
    if (tab === 'closing') setSimState('closing');
    else if (tab === 'closed') setSimState('empty');
    else setSimState('all');
  }

  function resetAll() {
    setSimState('all');
    setActiveTab('all');
    setQuery('');
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
    ? 'Loading synchronized tenders…'
    : showEmpty
      ? 'No procurement opportunities located'
      : query.trim()
        ? `${visibleRows.length} matching opportunities`
        : simState === 'closing'
          ? '2 of 6 tenders closing within the critical window'
          : `Showing 1–${visibleRows.length} of 48 active opportunities`;

  return (
    <BidderPortalShell>
      {toast && <Toast message={toast} icon="content_copy" />}

      <div className="flex flex-col gap-8">
        {/* Demo state simulator — deliberately quiet */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-outline-variant bg-surface-container-lowest/60 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-on-surface-variant">
            <Icon name="science" size="sm" className="text-outline" />
            Prototype states
          </span>
          <Tabs
            variant="pills"
            ariaLabel="Prototype state"
            value={simState}
            onChange={(id) => {
              setSimState(id);
              setActiveTab('all');
              setQuery('');
            }}
            items={[
              { id: 'all', label: 'All active' },
              { id: 'closing', label: 'Closing soon' },
              { id: 'empty', label: 'Empty' },
              { id: 'skeleton', label: 'Loading' },
            ]}
          />
        </div>

        <PageHeader
          eyebrow={<StatusBadge status="open">Public sector · open bidding</StatusBadge>}
          title="Tenders"
          description="Find and participate in procurement opportunities across Chennai Petroleum Corporation Limited."
          actions={
            <>
              <Button variant="secondary" leftIcon="bookmark">
                Saved <span className="ml-1 rounded-full bg-surface-container px-1.5 text-[11px] num">3</span>
              </Button>
              <Button variant="secondary" leftIcon="download">
                Archive (ZIP)
              </Button>
            </>
          }
        />

        {/* Search + filters */}
        <Card padding="none">
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <SearchInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSimState(e.target.value.trim() ? 'all' : simState === 'skeleton' ? 'all' : simState);
              }}
              placeholder="Search by title, NIT number, division or category…"
              aria-label="Search tenders"
              onSubmitSearch={() => undefined}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                <strong className="font-semibold text-on-surface num">48</strong> active opportunities · CVC-compliant open bidding
              </span>
              <Button variant="ghost" size="sm" leftIcon="tune" className="md:hidden" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
                {filtersOpen ? 'Hide filters' : 'Filters'}
              </Button>
            </div>
          </div>

          <div className={cn('border-t border-outline-variant bg-surface-container-low/60 p-5 sm:p-6', !filtersOpen && 'hidden md:block')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {FILTERS.map((f) => (
                <label key={f.label} className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-on-surface-variant">{f.label}</span>
                  <Select size="sm" aria-label={f.label}>
                    {f.options.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-medium text-on-surface-variant">Active:</span>
                {chips.length === 0 && <span className="text-[12px] text-outline">No filters applied</span>}
                {chips.map((chip) => (
                  <span key={chip.key} className="inline-flex h-7 items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest pl-3 pr-1 text-[12.5px] text-on-surface shadow-xs">
                    <span className="text-on-surface-variant">{chip.key}:</span>
                    <span className="font-medium">{chip.value}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${chip.key} filter`}
                      onClick={() => setChips((c) => c.filter((x) => x.key !== chip.key))}
                      className="focus-ring ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-outline hover:bg-surface-container hover:text-danger"
                    >
                      <Icon name="close" size="xs" />
                    </button>
                  </span>
                ))}
                {chips.length > 0 && (
                  <Button variant="link" size="sm" className="ml-1 text-[12.5px]" onClick={() => setChips([])}>
                    Clear all
                  </Button>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-on-surface-variant">
                <Icon name="sync" size="xs" className="text-secondary" />
                Synced with CPCL SAP-ERP 2 min ago
              </span>
            </div>
          </div>
        </Card>

        {/* Results */}
        <section className="flex flex-col gap-5" aria-label="Tender results">
          <div className="flex flex-col gap-4">
            <Tabs
              ariaLabel="Tender status"
              value={activeTab}
              onChange={selectTab}
              items={[
                { id: 'all', label: 'All', count: 48 },
                { id: 'open', label: 'Open', count: 42 },
                { id: 'closing', label: 'Closing soon', count: 6, countTone: 'warning' },
                { id: 'closed', label: 'Closed / under evaluation', count: 129 },
              ]}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body-md text-on-surface-variant" aria-live="polite">
                {subtitle}
              </p>
              <label className="flex items-center gap-2">
                <span className="text-[13px] text-on-surface-variant whitespace-nowrap">Sort by</span>
                <Select size="sm" className="!w-60" onChange={(e) => showToast('Reordered by ' + e.target.value.replace('_', ' '))}>
                  <option value="closing_earliest">Closing date (earliest)</option>
                  <option value="newest">Newest first</option>
                  <option value="val_high">Value (high → low)</option>
                  <option value="val_low">Value (low → high)</option>
                  <option value="relevance">Relevance</option>
                </Select>
              </label>
            </div>
          </div>

          {showSkeleton ? (
            <div className="flex flex-col gap-5" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <Card key={i}>
                  <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
                    <div className="flex flex-1 flex-col gap-3">
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-36" />
                        <Skeleton className="h-6 w-28" />
                      </div>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-10 w-2/3" />
                    </div>
                    <div className="flex w-56 flex-col gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : showEmpty ? (
            <Card>
              <EmptyState
                icon="manage_search"
                title="No tenders match your search"
                description="We couldn't find active tenders for this query or filter combination. Try relaxing the filters or searching by a broader category."
                actions={
                  <>
                    <Button variant="secondary" leftIcon="notifications">
                      Subscribe to alerts
                    </Button>
                    <Button leftIcon="restart_alt" onClick={resetAll}>
                      Reset filters & search
                    </Button>
                  </>
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-5">
              {visibleRows.map((row) => {
                const detailsTo = `/tenders/${encodeURIComponent(row.ref)}`;
                return (
                  <Card key={row.ref} as="article" padding="none" interactive className="relative overflow-hidden">
                    {row.urgency !== 'normal' && (
                      <span className={cn('absolute inset-y-0 left-0 w-1', row.urgency === 'critical' ? 'bg-danger' : 'bg-warning')} aria-hidden="true" />
                    )}
                    <div className="flex flex-col lg:flex-row">
                      {/* Left: identity & context */}
                      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 sm:p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-6 items-center gap-1 rounded-md bg-navy/[0.06] pl-2 pr-1 font-mono text-[12px] font-medium text-navy">
                            {row.ref}
                            <button type="button" onClick={() => copyRef(row.ref)} aria-label={`Copy reference ${row.ref}`} className="focus-ring inline-flex h-5 w-5 items-center justify-center rounded text-outline hover:bg-surface-container hover:text-secondary">
                              <Icon name="content_copy" size="xs" />
                            </button>
                          </span>
                          {row.tags.map((t) =>
                            t.tone === 'highlight' ? (
                              <StatusBadge key={t.label} tone="info" icon="verified_user">
                                {t.label}
                              </StatusBadge>
                            ) : t.tone === 'danger' ? (
                              <StatusBadge key={t.label} tone="danger" icon="priority_high">
                                {t.label}
                              </StatusBadge>
                            ) : (
                              <Tag key={t.label}>{t.label}</Tag>
                            ),
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Link to={detailsTo} className="focus-ring rounded text-[18px] font-semibold leading-snug tracking-[-0.01em] text-on-surface transition-colors hover:text-secondary">
                            {row.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="apartment" size="sm" className="text-outline" />
                              CPCL · {row.authority}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name={row.categoryIcon} size="sm" className="text-outline" />
                              {row.categoryLabel}
                            </span>
                          </div>
                        </div>

                        <div className={cn('flex items-start gap-2.5 rounded-control px-3 py-2.5 text-body-sm', INDICATOR_TONE[row.indicator.tone])}>
                          <Icon name={row.indicator.icon} size="sm" className="mt-0.5" />
                          <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2 [&_strong]:font-semibold">
                            <span>{row.indicator.content}</span>
                            {row.indicator.progress !== undefined && (
                              <span className="inline-flex h-1.5 w-20 overflow-hidden rounded-full bg-secondary/15" role="progressbar" aria-valuenow={row.indicator.progress} aria-valuemin={0} aria-valuemax={100}>
                                <span className="h-full rounded-full bg-secondary" style={{ width: `${row.indicator.progress}%` }} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: value, deadline, action */}
                      <div className="flex flex-col justify-between gap-5 border-t border-outline-variant/70 bg-surface-container-low/50 p-5 sm:p-6 lg:w-[360px] lg:border-l lg:border-t-0">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-[12px] font-medium text-on-surface-variant">Closes</div>
                            <div className={cn('mt-0.5 text-[15px] font-semibold num', row.urgency === 'critical' ? 'text-danger-on-container' : row.urgency === 'soon' ? 'text-warning-on-container' : 'text-on-surface')}>
                              {row.due}
                            </div>
                            <div className="mt-1.5">
                              <StatusBadge status={row.status === 'closing' ? 'closing-soon' : 'open'} tone={row.urgency === 'critical' ? 'danger' : undefined}>
                                {row.daysLabel}
                              </StatusBadge>
                            </div>
                          </div>
                          <div>
                            <div className="text-[12px] font-medium text-on-surface-variant">Estimated value</div>
                            <div className="mt-0.5 text-[15px] font-semibold text-on-surface num">{row.value}</div>
                            <div className="text-[12px] text-on-surface-variant">{row.emd}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button to={detailsTo} rightIcon="arrow_forward" fullWidth variant={row.bookmarked ? 'secondary' : 'primary'}>
                            View tender
                          </Button>
                          <IconButton
                            variant="secondary"
                            icon={row.bookmarked ? 'bookmark' : 'bookmark_add'}
                            active={row.bookmarked}
                            aria-label={row.bookmarked ? 'Remove bookmark' : 'Bookmark tender'}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!showEmpty && !showSkeleton && (
            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-body-sm text-on-surface-variant">
                <span>Showing 1–6 of 48</span>
                <label className="flex items-center gap-2">
                  <span>Per page</span>
                  <Select size="sm" defaultValue="6" className="!w-20">
                    <option>6</option>
                    <option>12</option>
                    <option>24</option>
                    <option>48</option>
                  </Select>
                </label>
              </div>
              <nav className="flex items-center gap-1" aria-label="Pagination">
                <IconButton icon="chevron_left" aria-label="Previous page" variant="secondary" size="sm" disabled />
                {['1', '2', '3', '4', '…', '8'].map((n) =>
                  n === '…' ? (
                    <span key={n} className="w-8 text-center text-outline">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      aria-current={n === '1' ? 'page' : undefined}
                      className={cn(
                        'focus-ring h-8 min-w-8 rounded-control px-2 text-[13px] font-medium num transition-colors',
                        n === '1' ? 'bg-navy text-white' : 'text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface',
                      )}
                    >
                      {n}
                    </button>
                  ),
                )}
                <IconButton icon="chevron_right" aria-label="Next page" variant="secondary" size="sm" />
              </nav>
            </div>
          )}
        </section>

        <Card tone="subtle" padding="sm" className="flex items-start gap-3">
          <Icon name="verified_user" size="lg" className="mt-0.5 text-secondary" />
          <p className="text-body-sm text-on-surface-variant">
            <strong className="font-semibold text-on-surface">Bidder discovery & transparency notice.</strong> All published opportunities conform to CVC statutory disclosure standards. Bids are encrypted with 2048-bit PKI and hardware-token timestamps, and remain sealed until the scheduled public electronic opening.
          </p>
        </Card>
      </div>
    </BidderPortalShell>
  );
}
