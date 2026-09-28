// Enterprise Dashboard — authenticated bidder landing page after login.
// Ported from Stitch screen "CPCL Bidder Portal - Enterprise Dashboard"
// (project 6921642772921774119, screen 580e1bf595b940e88a6765985d9e6e8e) and
// rebuilt on the shared design-system primitives.
//
// Real data: GET /api/profile (via AuthContext), GET /api/tenders,
// GET /api/bids. Metrics, the "continue draft" card and "recent submissions"
// are all derived from these responses — nothing here is invented. Backend
// states are limited to draft | submitted | closed; fabricated pipeline
// states from the prototype (OCR, vault stages, DSC signing, activity feed)
// are removed since none of that exists server-side yet.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import { Button, Callout, Card, CardHeader, CellStack, EmptyState, Icon, PageHeader, Skeleton, StatCard, StatusBadge, Table, TBody, Td, Th, THead, Tr, Tag } from '@/components/primitives';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { ApiBid, ApiTender } from '@/lib/types';

function tenderOf(bid: ApiBid): ApiTender | null {
  return typeof bid.tenderId === 'string' ? null : bid.tenderId;
}

export function DashboardPage() {
  const { profile } = useAuth();
  const [tenders, setTenders] = useState<ApiTender[] | null>(null);
  const [bids, setBids] = useState<ApiBid[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    setTenders(null);
    setBids(null);
    Promise.all([api.get<ApiTender[]>('/tenders'), api.get<ApiBid[]>('/bids')])
      .then(([t, b]) => {
        setTenders(t);
        setBids(b);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load dashboard data.'));
  }

  useEffect(load, []);

  if (loadError) {
    return (
      <BidderPortalShell>
        <Card padding="lg">
          <EmptyState
            icon="error"
            tone="danger"
            title="Could not load your dashboard"
            description={loadError}
            actions={
              <Button variant="secondary" onClick={load}>
                Retry
              </Button>
            }
          />
        </Card>
      </BidderPortalShell>
    );
  }

  if (!tenders || !bids) {
    return (
      <BidderPortalShell>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </BidderPortalShell>
    );
  }

  const now = Date.now();
  const openTenders = tenders.filter((t) => t.status === 'published' && new Date(t.submissionDeadline).getTime() > now);
  const closingSoon = openTenders.filter((t) => new Date(t.submissionDeadline).getTime() - now < 7 * 86_400_000);
  const submittedBids = bids.filter((b) => b.status === 'submitted' || b.status === 'closed');
  const draftBids = bids.filter((b) => b.status === 'draft');
  const activeDraft = draftBids[0] ?? null;
  const activeDraftTender = activeDraft ? tenderOf(activeDraft) : null;

  const recent = [...bids]
    .filter((b) => b.status === 'submitted' || b.status === 'closed')
    .sort((a, b) => new Date(b.submittedAt ?? b.updatedAt).getTime() - new Date(a.submittedAt ?? a.updatedAt).getTime())
    .slice(0, 5);

  const orgName = profile?.organizationName ?? 'your organization';

  return (
    <BidderPortalShell>
      <div className="flex flex-col gap-10">
        <PageHeader
          eyebrow={profile ? <Tag mono>{profile.registrationNumber}</Tag> : undefined}
          title={`Welcome, ${orgName}`}
          description="Your bidding activity at a glance."
          actions={
            <Button to="/tenders" leftIcon="add">
              Browse tenders
            </Button>
          }
        />

        {/* KPIs */}
        <section aria-label="Summary" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Open tenders" value={String(openTenders.length)} hint="Currently accepting bids" icon="folder_open" tone="info" />
          <StatCard label="Submitted" value={String(submittedBids.length)} hint="Recorded by the server" icon="verified" tone="success" />
          <StatCard label="Drafts" value={String(draftBids.length)} hint="Needs completion" icon="edit_note" tone="neutral" />
          <StatCard label="Closing soon" value={String(closingSoon.length)} hint="Within next 7 days" icon="timer" tone="warning" />
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          {/* MAIN COLUMN */}
          <div className="flex flex-col gap-6 xl:col-span-8">
            {activeDraft && activeDraftTender ? (
              <Card padding="none" className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-secondary via-secondary to-saffron" aria-hidden="true" />
                <div className="flex flex-col gap-6 p-6 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status="draft">In-progress draft</StatusBadge>
                      <Tag mono>{activeDraftTender.tenderNumber}</Tag>
                    </div>
                    <span className="text-body-sm text-on-surface-variant">Last updated {new Date(activeDraft.updatedAt).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h2 className="text-headline-lg text-on-surface">{activeDraftTender.title}</h2>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm text-on-surface-variant">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="factory" size="sm" />
                        {activeDraftTender.department}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-danger-on-container">
                        <Icon name="schedule" size="sm" />
                        Closes {new Date(activeDraftTender.submissionDeadline).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2.5">
                      <Button size="lg" rightIcon="arrow_forward" to={`/tenders/${encodeURIComponent(activeDraftTender.tenderNumber)}/bid/1`}>
                        Continue draft
                      </Button>
                      <Button size="lg" variant="secondary" leftIcon="description" to={`/tenders/${encodeURIComponent(activeDraftTender.tenderNumber)}`}>
                        View tender
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card padding="lg">
                <EmptyState
                  icon="edit_note"
                  title="No draft in progress"
                  description="Start a bid from any open tender to see it here."
                  actions={
                    <Button to="/tenders" leftIcon="travel_explore">
                      Browse tenders
                    </Button>
                  }
                />
              </Card>
            )}

            {/* Recent submissions */}
            <Card padding="none">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-headline-md text-on-surface">Recent submissions</h2>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">{recent.length} record{recent.length === 1 ? '' : 's'}</p>
                </div>
                <Button variant="ghost" size="sm" rightIcon="arrow_forward" to="/my-bids">
                  All my bids
                </Button>
              </div>
              {recent.length > 0 ? (
                <Table minWidth={640}>
                  <THead>
                    <tr>
                      <Th className="pl-6">Tender</Th>
                      <Th>Submitted</Th>
                      <Th>Status</Th>
                      <Th align="right" className="pr-6">
                        <span className="sr-only">Action</span>
                      </Th>
                    </tr>
                  </THead>
                  <TBody>
                    {recent.map((bid) => {
                      const t = tenderOf(bid);
                      return (
                        <Tr key={bid._id}>
                          <Td className="pl-6">
                            <CellStack primary={t?.title ?? 'Unknown tender'} secondary={<span className="font-mono text-[12px]">{bid.bidReference ?? bid._id} · {t?.tenderNumber}</span>} />
                          </Td>
                          <Td className="text-body-sm text-on-surface-variant">{bid.submittedAt ? new Date(bid.submittedAt).toLocaleString('en-IN') : '—'}</Td>
                          <Td>
                            <StatusBadge status={bid.status} />
                          </Td>
                          <Td align="right" className="pr-6">
                            <Button variant="ghost" size="sm" rightIcon="chevron_right" to={`/my-bids/${bid._id}`}>
                              View
                            </Button>
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              ) : (
                <div className="px-6 pb-6">
                  <EmptyState icon="inbox" title="No submissions yet" description="Submitted bids will appear here." />
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT RAIL */}
          <aside className="flex flex-col gap-6 xl:col-span-4">
            <Card>
              <CardHeader title="Quick actions" className="mb-3" />
              <div className="-mx-2 flex flex-col">
                <Link to="/tenders" className="group focus-ring flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-container-low">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-surface-container-low text-on-surface-variant transition-colors group-hover:bg-info-container group-hover:text-secondary">
                    <Icon name="travel_explore" size="md" />
                  </span>
                  <span className="flex-1 text-[14px] font-medium text-on-surface">Search public tenders</span>
                  <Icon name="chevron_right" size="md" className="text-outline transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link to="/my-bids" className="group focus-ring flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-container-low">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-surface-container-low text-on-surface-variant transition-colors group-hover:bg-info-container group-hover:text-secondary">
                    <Icon name="mark_email_read" size="md" />
                  </span>
                  <span className="flex-1 text-[14px] font-medium text-on-surface">View my bid envelopes</span>
                  <Icon name="chevron_right" size="md" className="text-outline transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </Card>

            {closingSoon.length > 0 && (
              <Card>
                <CardHeader title="Closing soon" actions={<StatusBadge tone="warning">{closingSoon.length}</StatusBadge>} className="mb-4" />
                <div className="flex flex-col gap-3">
                  {closingSoon.slice(0, 3).map((t) => (
                    <Callout key={t._id} tone="warning" title={t.tenderNumber}>
                      {t.title} closes {new Date(t.submissionDeadline).toLocaleString('en-IN')}.
                    </Callout>
                  ))}
                </div>
              </Card>
            )}

            <Card tone="subtle">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-container-lowest text-secondary shadow-xs">
                  <Icon name="support_agent" size="lg" />
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-on-surface">Bidder help</div>
                  <div className="mt-0.5 text-body-sm text-on-surface-variant">Technical desk <strong className="text-on-surface num">1800-425-7800</strong> · 09:00–18:00 IST</div>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </BidderPortalShell>
  );
}
