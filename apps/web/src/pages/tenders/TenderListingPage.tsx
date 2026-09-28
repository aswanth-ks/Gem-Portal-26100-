// Tender Listing & Search — ported from Stitch screen "CPCL Bidder Portal -
// Tender Listing & Search" (project 6921642772921774119, screen
// 8e3086035020499ebc5cdef3cbe2e1c1), rebuilt on the shared design system.
//
// Real data: GET /api/tenders (published tenders only — see apps/gateway).
// The row card keeps its original shape; fields the real Tender model
// doesn't carry (bidder-facing category tags, EMD amount, bookmarks) are
// filled with honest generic text rather than fabricated numbers — see
// toTenderRow() below. The old "prototype states" simulator strip is gone
// now that loading/empty are real, not simulated.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { api, ApiError } from '@/lib/api';
import type { ApiTender } from '@/lib/types';

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

function toTenderRow(t: ApiTender): TenderRow {
  const deadline = new Date(t.submissionDeadline);
  const hoursLeft = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
  const urgency: Urgency = hoursLeft <= 24 ? 'critical' : hoursLeft <= 72 ? 'soon' : 'normal';
  const daysLeft = Math.max(0, Math.ceil(hoursLeft / 24));
  return {
    ref: t.tenderNumber,
    status: hoursLeft <= 72 ? 'closing' : 'open',
    urgency,
    tags: [{ label: 'Published tender', tone: 'neutral' }],
    title: t.title,
    authority: t.department,
    categoryIcon: 'assignment',
    categoryLabel: 'Procurement',
    indicator: {
      icon: 'checklist',
      tone: 'info',
      content: (
        <>
          <strong>{t.eligibilityCriteria.length}</strong> eligibility criteria · <strong>{t.requiredDocuments.length}</strong> documents required
        </>
      ),
    },
    value: t.value,
    emd: 'EMD as specified in the tender document',
    daysLabel: hoursLeft <= 0 ? 'Closed' : hoursLeft <= 24 ? `Closes in ${Math.max(1, Math.round(hoursLeft))}h` : `${daysLeft} days left`,
    due: deadline.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', ' ·'),
  };
}


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
  const [tenders, setTenders] = useState<ApiTender[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ApiTender[]>('/tenders')
      .then((data) => !cancelled && setTenders(data))
      .catch((err) => !cancelled && setLoadError(err instanceof ApiError ? err.message : 'Could not load tenders.'));
    return () => {
      cancelled = true;
    };
  }, []);

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
  }

  function resetAll() {
    setActiveTab('all');
    setQuery('');
  }

  const rows = useMemo(() => (tenders ?? []).map(toTenderRow), [tenders]);

  const visibleRows = useMemo(() => {
    const base = activeTab === 'closing' ? rows.filter((r) => r.status === 'closing') : activeTab === 'open' ? rows.filter((r) => r.status === 'open') : activeTab === 'closed' ? [] : rows;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) => `${r.title} ${r.ref} ${r.authority} ${r.categoryLabel}`.toLowerCase().includes(q));
  }, [rows, activeTab, query]);

  const showSkeleton = tenders === null && !loadError;
  const showEmpty = !showSkeleton && !loadError && visibleRows.length === 0;

  const subtitle = showSkeleton
    ? 'Loading published tenders…'
    : loadError
      ? loadError
      : showEmpty
        ? 'No procurement opportunities located'
        : query.trim()
          ? `${visibleRows.length} matching opportunities`
          : `Showing ${visibleRows.length} of ${rows.length} active opportunities`;

  return (
    <BidderPortalShell>
      {toast && <Toast message={toast} icon="content_copy" />}

      <div className="flex flex-col gap-6">
        {loadError && (
          <Card padding="sm" className="border-danger-border bg-danger-container/40">
            <p className="flex items-center gap-2 text-body-sm text-danger-on-container">
              <Icon name="error" size="sm" />
              {loadError}
            </p>
          </Card>
        )}

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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, NIT number, division or category…"
              aria-label="Search tenders"
              onSubmitSearch={() => undefined}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                <strong className="font-semibold text-on-surface num">{rows.length}</strong> active opportunities · CVC-compliant open bidding
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
                { id: 'all', label: 'All', count: rows.length },
                { id: 'open', label: 'Open', count: rows.filter((r) => r.status === 'open').length },
                { id: 'closing', label: 'Closing soon', count: rows.filter((r) => r.status === 'closing').length, countTone: 'warning' },
                { id: 'closed', label: 'Closed / under evaluation', count: 0 },
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
                <span>Showing {visibleRows.length} of {rows.length}</span>
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
