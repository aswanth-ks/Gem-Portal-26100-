// My Bids — ported from Stitch screen "CPCL Bidder Portal - My Bids"
// (project 6921642772921774119, screen 25bc481f794f425b9c3c02d025350e47),
// rebuilt on the shared design system.
//
// Real GET /api/bids. Status values are only the ones the gateway actually
// has (draft | submitted | closed) — no "processing" state exists server-side
// yet, so that tab/status is dropped rather than faked. "Discard draft" is
// removed: there is no DELETE /api/bids/:id route on the gateway.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import { Button, Card, EmptyState, Icon, PageHeader, SearchInput, StatusBadge, Table, TBody, Td, Th, THead, Tr, Tabs, Tag, type Status } from '@/components/primitives';
import { api, ApiError } from '@/lib/api';
import type { ApiBid, ApiTender } from '@/lib/types';

type TabId = 'all' | 'draft' | 'submitted' | 'closed';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'closed', label: 'Closed' },
];

const STATUS_DEFS: { status: Status; label: string; body: string }[] = [
  { status: 'draft', label: 'Draft', body: 'Saved in your workspace. Editable until the tender deadline.' },
  { status: 'submitted', label: 'Submitted', body: 'Recorded by the server. No longer editable.' },
  { status: 'closed', label: 'Closed', body: 'The tender window has closed.' },
];

function tenderOf(bid: ApiBid): ApiTender | null {
  return typeof bid.tenderId === 'string' ? null : bid.tenderId;
}

export function MyBidsPage() {
  const [bids, setBids] = useState<ApiBid[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get<ApiBid[]>('/bids')
      .then((data) => {
        if (!cancelled) setBids(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : 'Could not load your bids.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { all: bids?.length ?? 0, draft: 0, submitted: 0, closed: 0 };
    (bids ?? []).forEach((b) => {
      if (b.status === 'draft' || b.status === 'submitted' || b.status === 'closed') c[b.status]++;
    });
    return c;
  }, [bids]);

  const rows = useMemo(() => {
    const q = query.toLowerCase().trim();
    return (bids ?? []).filter((b) => {
      if (tab !== 'all' && b.status !== tab) return false;
      if (!q) return true;
      const t = tenderOf(b);
      const haystack = `${t?.title ?? ''} ${t?.tenderNumber ?? ''} ${b.bidReference ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [bids, tab, query]);

  return (
    <BidderPortalShell breadcrumb="My Bids">
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={<Tag>Bid registry</Tag>}
          title="My bids"
          description="Track every bid you've drafted or submitted."
          actions={
            <Button to="/tenders" leftIcon="travel_explore">
              Browse tenders
            </Button>
          }
        />

        {loadError && (
          <Card padding="lg">
            <EmptyState icon="error" tone="danger" title="Could not load your bids" description={loadError} />
          </Card>
        )}

        {bids !== null && !loadError && (
          <Card padding="none" className="overflow-hidden">
            <div className="px-5 sm:px-6">
              <Tabs ariaLabel="Bid status" value={tab} onChange={setTab} items={TABS.map((t) => ({ id: t.id, label: t.label, count: counts[t.id] }))} />
            </div>
            <div className="flex flex-col gap-3 border-b border-outline-variant bg-surface-container-low/60 px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
              <SearchInput size="md" shortcut={false} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by tender title or reference…" aria-label="Search bids" className="md:max-w-md md:flex-1" />
              <span className="text-body-sm text-on-surface-variant" aria-live="polite">
                <strong className="font-semibold text-on-surface num">{rows.length}</strong> {rows.length === 1 ? 'bid' : 'bids'}
              </span>
            </div>

            {rows.length > 0 ? (
              <Table minWidth={780}>
                <THead>
                  <tr>
                    <Th className="pl-6">Tender</Th>
                    <Th>Reference</Th>
                    <Th>Updated</Th>
                    <Th>Status</Th>
                    <Th align="right" className="pr-6">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((bid) => {
                    const t = tenderOf(bid);
                    const isDraft = bid.status === 'draft';
                    const tenderRef = t?.tenderNumber ?? '';
                    const detailTo = `/my-bids/${bid._id}`;
                    return (
                      <Tr key={bid._id} className="group">
                        <Td className="pl-6 !py-5">
                          <div className="flex items-start gap-3.5">
                            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-container-low text-on-surface-variant transition-colors group-hover:bg-info-container group-hover:text-secondary">
                              <Icon name="description" size="lg" />
                            </span>
                            <div className="min-w-0">
                              <Link to={isDraft ? `/tenders/${encodeURIComponent(tenderRef)}/bid/1` : detailTo} className="focus-ring rounded text-[15px] font-semibold leading-snug text-on-surface hover:text-secondary">
                                {t?.title ?? 'Unknown tender'}
                              </Link>
                              <div className="mt-1 text-body-sm text-on-surface-variant">{t?.department}</div>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-[12.5px] text-on-surface">{tenderRef}</span>
                            {bid.bidReference && <span className="font-mono text-[12.5px] text-on-surface-variant">{bid.bidReference}</span>}
                          </div>
                        </Td>
                        <Td className="text-[13px] text-on-surface-variant whitespace-nowrap">{new Date(bid.updatedAt).toLocaleString('en-IN')}</Td>
                        <Td>
                          <StatusBadge status={bid.status} />
                        </Td>
                        <Td align="right" className="pr-6">
                          {isDraft ? (
                            <Button size="sm" variant="brand" rightIcon="edit" to={`/tenders/${encodeURIComponent(tenderRef)}/bid/1`}>
                              Continue
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" rightIcon="arrow_forward" to={detailTo}>
                              View bid
                            </Button>
                          )}
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
                description="No bids match your search or the selected status."
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
        )}

        <section className="flex flex-col gap-4" aria-label="Status definitions">
          <h2 className="text-headline-sm text-on-surface">What each status means</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STATUS_DEFS.map((def) => (
              <Card key={def.label} padding="sm" className="flex flex-col items-start gap-2.5">
                <StatusBadge status={def.status}>{def.label}</StatusBadge>
                <p className="text-body-sm text-on-surface-variant">{def.body}</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </BidderPortalShell>
  );
}
