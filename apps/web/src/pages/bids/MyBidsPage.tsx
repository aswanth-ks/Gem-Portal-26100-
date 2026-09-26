// My Bids — ported from Stitch screen "CPCL Bidder Portal - My Bids"
// (project 6921642772921774119, screen 25bc481f794f425b9c3c02d025350e47),
// rebuilt on the shared design system. Tab filter, live search and empty
// state are React state.
//
// TODO: replace BID_ROWS with GET /api/bids; resume drafts at the bidder's
// real last-completed step instead of step 1.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import {
  Button,
  Callout,
  Card,
  EmptyState,
  Icon,
  IconButton,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  Tag,
  Toast,
  type Status,
} from '@/components/primitives';

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
  dateTime: string;
  dateNote: string;
  dateNoteIcon: string;
  closing: string;
  closingNote: string;
  urgent?: boolean;
  search: string;
}

const BID_ROWS: BidRow[] = [
  {
    icon: 'videocam',
    title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
    tags: ['Manali Refinery Operations', 'Surveillance & perimeter security'],
    ref: 'CPCL/PROC/2026/041',
    bidId: 'BID-2026-00418',
    status: 'submitted',
    justSubmitted: true,
    dateLabel: 'Submitted',
    dateValue: '04 Oct 2026',
    dateTime: '16:42:09 IST',
    dateNote: 'Signed via DSC',
    dateNoteIcon: 'lock',
    closing: '04 Oct 2026, 17:00 IST',
    closingNote: 'Window closing soon',
    urgent: true,
    search: 'supply of cctv cameras for public safety infrastructure manali refinery operations surveillance cpcl/proc/2026/041 bid-2026-00418',
  },
  {
    icon: 'security',
    title: 'Industrial Network Security Equipment',
    tags: ['IT & Communications Division', 'Firewalls & core switches'],
    ref: 'CPCL/PROC/2026/039',
    bidId: 'BID-2026-00392',
    status: 'processing',
    dateLabel: 'Submitted',
    dateValue: '28 Sep 2026',
    dateTime: '14:18:40 IST',
    dateNote: 'Signed via DSC',
    dateNoteIcon: 'lock',
    closing: '08 Oct 2026, 15:00 IST',
    closingNote: '4 days remaining',
    search: 'industrial network security equipment it & communications division firewalls core switches cpcl/proc/2026/039 bid-2026-00392',
  },
  {
    icon: 'monitor',
    title: 'Control Room Display Systems',
    tags: ['Process Automation & SCADA'],
    ref: 'CPCL/PROC/2026/037',
    bidId: 'BID-2026-00371',
    status: 'submitted',
    dateLabel: 'Submitted',
    dateValue: '22 Sep 2026',
    dateTime: '11:32:15 IST',
    dateNote: 'Signed via DSC',
    dateNoteIcon: 'lock',
    closing: '12 Oct 2026, 12:00 IST',
    closingNote: '8 days remaining',
    search: 'control room display systems process automation scada infrastructure cpcl/proc/2026/037 bid-2026-00371',
  },
  {
    icon: 'bolt',
    title: 'AMC Heavy-Duty Gas Turbine Generators',
    tags: ['Mechanical & Power Auxiliary Maintenance'],
    ref: 'CPCL/PROC/2026/033',
    bidId: 'BID-DRAFT-2026-00334',
    status: 'draft',
    dateLabel: 'Last saved',
    dateValue: '30 Sep 2026',
    dateTime: '18:20:11 IST',
    dateNote: 'Auto-saved',
    dateNoteIcon: 'save',
    closing: '15 Oct 2026, 16:30 IST',
    closingNote: '11 days remaining',
    search: 'amc heavy-duty gas turbine generators mechanical & power auxiliary maintenance cpcl/proc/2026/033 bid-draft-2026-00334',
  },
];

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'processing', label: 'Under processing' },
  { id: 'closed', label: 'Closed' },
];

const STATUS_DEFS: { status: Status; label: string; body: string }[] = [
  { status: 'draft', label: 'Draft', body: 'Saved in your workspace. Not visible to the CPCL tender committee; editable until the deadline.' },
  { status: 'submitted', label: 'Submitted', body: 'Encrypted, signed with your Class-3 token and acknowledged in the sovereign ledger.' },
  { status: 'processing', label: 'Under processing', body: 'Envelope verification, integrity checks and fee reconciliation before technical opening.' },
  { status: 'closed', label: 'Closed', body: 'Window closed or evaluated. Archived for statutory audit for 7 years.' },
];

export function MyBidsPage() {
  const [showBanner, setShowBanner] = useState(true);
  const [tab, setTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');
  const [bidRows, setBidRows] = useState(BID_ROWS);
  const [discardRow, setDiscardRow] = useState<BidRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { all: bidRows.length, draft: 0, submitted: 0, processing: 0, closed: 0 };
    bidRows.forEach((r) => c[r.status]++);
    return c;
  }, [bidRows]);

  const rows = useMemo(() => {
    const q = query.toLowerCase().trim();
    return bidRows.filter((r) => (tab === 'all' || r.status === tab) && (!q || r.search.includes(q)));
  }, [bidRows, tab, query]);

  return (
    <BidderPortalShell breadcrumb="My Bids">
      <div className="flex flex-col gap-6">
        {showBanner && (
          <Callout
            tone="success"
            icon="verified"
            title={
              <span className="flex flex-wrap items-center gap-2">
                Bid submitted successfully <StatusBadge status="submitted">Recorded</StatusBadge>
              </span>
            }
            actions={
              <>
                <Button variant="secondary" size="sm" leftIcon="receipt_long" onClick={() => window.print()}>
                  Receipt
                </Button>
                <IconButton icon="close" size="sm" aria-label="Dismiss" onClick={() => setShowBanner(false)} />
              </>
            }
          >
            Tender <strong>CPCL/PROC/2026/041</strong> · acknowledgment <span className="font-mono text-secondary">SR-2026-00418</span> has been sent to the authorized signatory's email.
          </Callout>
        )}

        <PageHeader
          eyebrow={
            <>
              <Tag>Bid registry</Tag>
              <Tag mono>BIDDER-00482</Tag>
            </>
          }
          title="My bids"
          description="Track every bid you've drafted or submitted. All actions are sealed and authenticated with your active Class-3 DSC."
          actions={
            <Button to="/tenders" leftIcon="travel_explore">
              Browse tenders
            </Button>
          }
        />

        <Card padding="none" className="overflow-hidden">
          <div className="px-5 sm:px-6">
            <Tabs ariaLabel="Bid status" value={tab} onChange={setTab} items={TABS.map((t) => ({ id: t.id, label: t.label, count: counts[t.id] }))} />
          </div>
          <div className="flex flex-col gap-3 border-b border-outline-variant bg-surface-container-low/60 px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
            <SearchInput size="md" shortcut={false} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by tender title or reference…" aria-label="Search bids" className="md:max-w-md md:flex-1" />
            <div className="flex items-center justify-between gap-4 md:justify-end">
              <span className="text-body-sm text-on-surface-variant" aria-live="polite">
                <strong className="font-semibold text-on-surface num">{rows.length}</strong> {rows.length === 1 ? 'bid' : 'bids'}
              </span>
              <Select size="sm" className="!w-56" aria-label="Sort bids">
                <option value="recent">Most recent submission</option>
                <option value="deadline">Approaching deadline</option>
              </Select>
            </div>
          </div>

          {rows.length > 0 ? (
            <Table minWidth={820}>
              <THead>
                <tr>
                  <Th className="pl-6">Tender</Th>
                  <Th className="hidden min-[1400px]:table-cell">References</Th>
                  <Th>Timeline</Th>
                  <Th>Closing</Th>
                  <Th>Status</Th>
                  <Th align="right" className="pr-6">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const isDraft = row.status === 'draft';
                  const detailTo = `/my-bids/${encodeURIComponent(row.bidId)}`;
                  return (
                    <Tr key={row.bidId} className="group">
                      <Td className="pl-6 !py-5">
                        <div className="flex items-start gap-3.5">
                          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-container-low text-on-surface-variant transition-colors group-hover:bg-info-container group-hover:text-secondary">
                            <Icon name={row.icon} size="lg" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link to={isDraft ? `/tenders/${encodeURIComponent(row.ref)}/bid/1` : detailTo} className="focus-ring rounded text-[15px] font-semibold leading-snug text-on-surface hover:text-secondary">
                                {row.title}
                              </Link>
                              {row.justSubmitted && <StatusBadge tone="info">Just submitted</StatusBadge>}
                            </div>
                            <div className="mt-1 text-body-sm text-on-surface-variant">{row.tags.join(' · ')}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[12px] text-on-surface-variant min-[1400px]:hidden">
                              <span>{row.ref}</span>
                              <span aria-hidden="true">·</span>
                              <span>{row.bidId}</span>
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td className="hidden min-[1400px]:table-cell">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[12.5px] text-on-surface">{row.ref}</span>
                          <span className="font-mono text-[12.5px] text-on-surface-variant">{row.bidId}</span>
                          {row.status === 'submitted' && (
                            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success-on-container">
                              <Icon name="receipt_long" size="xs" /> Receipt available
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] text-on-surface-variant">{row.dateLabel}</span>
                          <span className="text-[14px] font-medium text-on-surface whitespace-nowrap">{row.dateValue}</span>
                          <span className="inline-flex items-center gap-1 text-[12px] text-on-surface-variant whitespace-nowrap num">
                            <Icon name={row.dateNoteIcon} size="xs" className={row.dateNoteIcon === 'lock' ? 'text-success' : ''} />
                            {row.dateTime}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[14px] font-medium text-on-surface whitespace-nowrap num">{row.closing}</span>
                          {row.urgent ? <StatusBadge status="closing-soon" tone="danger">{row.closingNote}</StatusBadge> : <span className="text-[12px] text-on-surface-variant">{row.closingNote}</span>}
                        </div>
                      </Td>
                      <Td>
                        <StatusBadge status={row.status === 'processing' ? 'processing' : row.status} />
                      </Td>
                      <Td align="right" className="pr-6">
                        <div className="flex flex-col items-end gap-1.5">
                          {isDraft ? (
                            <>
                              <Button size="sm" variant="brand" rightIcon="edit" to={`/tenders/${encodeURIComponent(row.ref)}/bid/1`}>
                                Continue
                              </Button>
                              <Button variant="link" size="sm" className="!text-danger text-[12.5px]" onClick={() => setDiscardRow(row)}>
                                Discard draft
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant={row.justSubmitted ? 'primary' : 'secondary'} rightIcon="arrow_forward" to={detailTo}>
                                View bid
                              </Button>
                              <Button variant="link" size="sm" className="text-[12.5px] !text-on-surface-variant">
                                Download PDF
                              </Button>
                            </>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <EmptyState
              icon="folder_off"
              title="No bids in this view"
              description="No bids match your search or the selected status for vendor BIDDER-00482."
              actions={
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      setTab('all');
                    }}
                  >
                    Clear filters
                  </Button>
                  <Button to="/tenders" leftIcon="travel_explore">
                    Browse live tenders
                  </Button>
                </>
              }
            />
          )}
        </Card>

        <section className="flex flex-col gap-4" aria-label="Status definitions">
          <h2 className="text-headline-sm text-on-surface">What each status means</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STATUS_DEFS.map((def) => (
              <Card key={def.label} padding="sm" className="flex flex-col items-start gap-2.5">
                <StatusBadge status={def.status}>{def.label}</StatusBadge>
                <p className="text-body-sm text-on-surface-variant">{def.body}</p>
              </Card>
            ))}
          </div>
          <div className="flex flex-col gap-2 text-body-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="verified_user" size="sm" className="text-success" />
              Records are strictly isolated to bidder entity <span className="font-mono text-on-surface">BIDDER-00482</span>.
            </span>
            <span>
              Need a retraction or clarification?{' '}
              <Button variant="link" size="sm" className="text-body-sm">
                Raise a query
              </Button>
            </span>
          </div>
        </section>
      </div>

      <Modal
        open={!!discardRow}
        onClose={() => setDiscardRow(null)}
        icon="delete"
        size="md"
        title="Discard this draft?"
        description={discardRow?.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscardRow(null)}>
              Keep draft
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (discardRow) {
                  setBidRows((rows) => rows.filter((r) => r.ref !== discardRow.ref));
                  setToast(`Draft for ${discardRow.title} discarded`);
                }
                setDiscardRow(null);
              }}
            >
              Discard draft
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">This permanently removes the saved draft and any documents attached to it. This cannot be undone.</p>
      </Modal>

      {toast && <Toast message={toast} />}
    </BidderPortalShell>
  );
}
