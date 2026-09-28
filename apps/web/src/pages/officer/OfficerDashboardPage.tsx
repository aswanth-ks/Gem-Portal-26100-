// Procurement Officer Dashboard — real data only.
//
// KPIs come from GET /api/officer/dashboard/summary (a minimal real MongoDB
// aggregation — see apps/gateway/src/routes/officer/dashboard.routes.ts).
// "My tenders" is the real GET /api/officer/tenders list. The action queue
// is the real GET /api/officer/reviews list (documents that failed automatic
// processing) — there is no compliance-evaluation engine yet, so there is no
// PASS/FAIL/score/risk anywhere on this page. The prototype's fabricated
// action queue, pipeline chart and audit feed were removed rather than wired
// to fake numbers.

import { useEffect, useMemo, useState } from 'react';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Callout, Card, CardHeader, CellStack, EmptyState, Icon, PageHeader, StatusBadge, Table, TBody, Td, Th, THead, Tr, Tabs, Tag, type Status } from '@/components/primitives';
import { cn } from '@/utils/cn';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiOfficerDashboardSummary, ApiOfficerReviewRow, ApiTender } from '@/lib/types';

type TabId = 'all' | 'draft' | 'published' | 'closed';

const STATUS_BADGE: Record<ApiTender['status'], { status: Status; label: string }> = {
  draft: { status: 'draft', label: 'Draft' },
  published: { status: 'active', label: 'Published' },
  closed: { status: 'closed', label: 'Closed' },
};

export function OfficerDashboardPage() {
  const [summary, setSummary] = useState<ApiOfficerDashboardSummary | null>(null);
  const [tenders, setTenders] = useState<ApiTender[] | null>(null);
  const [reviews, setReviews] = useState<ApiOfficerReviewRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('all');

  useEffect(() => {
    Promise.all([officerApi.get<ApiOfficerDashboardSummary>('/dashboard/summary'), officerApi.get<ApiTender[]>('/tenders'), officerApi.get<ApiOfficerReviewRow[]>('/reviews')])
      .then(([s, t, r]) => {
        setSummary(s);
        setTenders(t);
        setReviews(r);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load the dashboard.'));
  }, []);

  const rows = useMemo(() => {
    if (!tenders) return [];
    if (tab === 'all') return tenders;
    return tenders.filter((t) => t.status === tab);
  }, [tenders, tab]);

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { all: tenders?.length ?? 0, draft: 0, published: 0, closed: 0 };
    (tenders ?? []).forEach((t) => c[t.status]++);
    return c;
  }, [tenders]);

  if (loadError) {
    return (
      <OfficerPortalShell>
        <Callout tone="danger" title="Could not load the dashboard">
          {loadError}
        </Callout>
      </OfficerPortalShell>
    );
  }

  if (!summary || !tenders || !reviews) {
    return (
      <OfficerPortalShell>
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </OfficerPortalShell>
    );
  }

  const kpis = [
    { label: 'Published tenders', value: summary.publishedTenders, hint: `${summary.submissionOpen} with submission open`, icon: 'assignment', tone: 'info' as const, to: '/officer/tenders' },
    { label: 'Draft tenders', value: summary.draftTenders, hint: 'Not yet published', icon: 'edit_document', tone: 'neutral' as const, to: '/officer/tenders' },
    { label: 'Submission open', value: summary.submissionOpen, hint: 'Bids sealed until deadline', icon: 'lock_clock', tone: 'success' as const, to: '/officer/bids' },
    { label: 'Total bids submitted', value: summary.totalBids, hint: 'Across all tenders', icon: 'gavel', tone: 'warning' as const, to: '/officer/bids' },
  ];

  return (
    <OfficerPortalShell>
      <div className="flex flex-col gap-10">
        <PageHeader
          eyebrow={
            <StatusBadge tone="info" icon="shield_person">
              Authorized procurement desk
            </StatusBadge>
          }
          title="Officer workspace"
          description="Real tenders, submissions and document-processing status from the database."
          actions={<Button leftIcon="add" to="/officer/tenders/new">Create tender</Button>}
        />

        <section aria-label="Summary" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">{k.label}</span>
                <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-control', k.tone === 'info' && 'bg-info-container text-secondary', k.tone === 'neutral' && 'bg-neutral-container text-neutral', k.tone === 'success' && 'bg-success-container text-success-on-container', k.tone === 'warning' && 'bg-warning-container text-warning-on-container')}>
                  <Icon name={k.icon} size="md" />
                </span>
              </div>
              <div className="text-[26px] font-semibold leading-8 tracking-tight text-on-surface num">{k.value}</div>
              <div className="text-body-sm text-on-surface-variant">{k.hint}</div>
              <Button variant="link" size="sm" rightIcon="arrow_forward" className="mt-1 w-fit text-[13px]" to={k.to}>
                View
              </Button>
            </Card>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          <div className="flex flex-col gap-6 xl:col-span-8">
            <Card padding="lg">
              <CardHeader
                icon="pending_actions"
                title="Documents needing attention"
                description="Bidder documents that failed automatic processing and could not be extracted."
                actions={<StatusBadge tone={reviews.length > 0 ? 'warning' : 'neutral'}>{reviews.length} pending</StatusBadge>}
              />
              {reviews.length === 0 ? (
                <EmptyState tone="success" icon="task_alt" title="Nothing needs attention" description="No submitted document has failed automatic processing." className="!py-10" />
              ) : (
                <ul className="flex flex-col gap-3">
                  {reviews.map((r) => (
                    <li key={r.documentId} className="flex flex-col gap-2 rounded-card border border-warning-border bg-warning-container/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-on-surface-variant">
                          <Tag mono>{r.tenderNumber}</Tag>
                          {r.bidReference && <Tag mono>{r.bidReference}</Tag>}
                        </div>
                        <p className="mt-1 text-[14px] font-medium text-on-surface">{r.organizationName} — {r.filename}</p>
                        <p className="text-body-sm text-on-surface-variant">{r.error ?? 'Could not be processed automatically.'}</p>
                      </div>
                      <Button size="sm" variant="secondary" rightIcon="arrow_forward" to={`/officer/bids/${r.bidId}`}>
                        View bid
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
                <div>
                  <h2 className="text-headline-md text-on-surface">My tenders</h2>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">Real tender records from the database.</p>
                </div>
                <Button variant="ghost" size="sm" rightIcon="arrow_forward" to="/officer/tenders">
                  View all tenders
                </Button>
              </div>
              <div className="mt-2 px-6">
                <Tabs
                  ariaLabel="Tender status"
                  value={tab}
                  onChange={setTab}
                  items={[
                    { id: 'all', label: 'All', count: counts.all },
                    { id: 'draft', label: 'Drafts', count: counts.draft },
                    { id: 'published', label: 'Published', count: counts.published },
                    { id: 'closed', label: 'Closed', count: counts.closed },
                  ]}
                />
              </div>
              {rows.length > 0 ? (
                <Table minWidth={760}>
                  <THead>
                    <tr>
                      <Th className="pl-6">Tender</Th>
                      <Th>Status</Th>
                      <Th>Deadline</Th>
                      <Th align="right" className="pr-6">
                        <span className="sr-only">Actions</span>
                      </Th>
                    </tr>
                  </THead>
                  <TBody>
                    {rows.map((t) => (
                      <Tr key={t._id}>
                        <Td className="pl-6 !py-5">
                          <CellStack primary={t.title || 'Untitled tender'} secondary={<span className="font-mono text-[12px]">{t.tenderNumber}</span>} />
                        </Td>
                        <Td>
                          <StatusBadge status={STATUS_BADGE[t.status].status}>{STATUS_BADGE[t.status].label}</StatusBadge>
                        </Td>
                        <Td className="whitespace-nowrap num">{new Date(t.submissionDeadline).toLocaleString('en-IN')}</Td>
                        <Td align="right" className="pr-6">
                          <Button size="sm" variant="secondary" to={t.status === 'draft' ? '/officer/tenders/new' : `/officer/tenders/${encodeURIComponent(t.tenderNumber)}`}>
                            {t.status === 'draft' ? 'Continue' : 'View'}
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <EmptyState icon="folder_off" title="No tenders in this view" description="There are no tenders in this lifecycle stage." actions={<Button variant="secondary" onClick={() => setTab('all')}>Show all tenders</Button>} />
              )}
            </Card>
          </div>

          <aside className="flex flex-col gap-6 xl:col-span-4">
            <Card>
              <CardHeader icon="insights" title="Tender lifecycle" className="mb-4" />
              <div className="flex flex-col divide-y divide-outline-variant/70">
                {[
                  { label: 'Draft', value: summary.draftTenders },
                  { label: 'Published', value: summary.publishedTenders },
                  { label: 'Submission open', value: summary.submissionOpen },
                  { label: 'Submission closed', value: summary.submissionClosed },
                  { label: 'Closed', value: summary.closedTenders },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-[14px] font-medium text-on-surface">{r.label}</span>
                    <span className="num text-[14px] font-semibold text-on-surface">{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Callout tone="info" icon="balance" title="Human-in-the-loop">
              AI assists with document understanding and evidence extraction. Compliance evaluation and award decisions are a later phase — every disqualification and award decision stays with the officer.
            </Callout>
          </aside>
        </div>
      </div>
    </OfficerPortalShell>
  );
}
