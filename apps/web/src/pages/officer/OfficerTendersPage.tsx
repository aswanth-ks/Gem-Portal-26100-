// Procurement Officer — Tender Management. Ported from Stitch screen "O03 —
// Procurement Officer Tender Management" (project 6921642772921774119,
// screen 5b3b0740c3374b1388fcd1effdcc73c2) on the shared OfficerPortalShell
// and design-system primitives.
//
// Real data: GET /api/officer/tenders (every tender regardless of status —
// this is the officer's own view, unlike the bidder-facing GET /api/tenders
// which only ever returns published/closed). This page was previously a
// fully hardcoded mock array that never touched the backend at all — that
// was the actual cause of "a tender I just published doesn't show up here."
// Stage tabs are now the real Tender.status values (draft/published/closed)
// — the prototype's extra pseudo-stages (review/open/evaluation/completed)
// have no backend equivalent yet and are dropped rather than faked.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Callout, Card, CellStack, EmptyState, Icon, PageHeader, SearchInput, StatusBadge, Table, TBody, Td, Th, THead, Tr, Tabs, Tag } from '@/components/primitives';
import { CREATE_TENDER_ROUTES, setDraftTenderId } from '@/pages/officer/createTender';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiTender } from '@/lib/types';

type StageTab = 'all' | 'draft' | 'published' | 'closed';

const STAGE_BADGE: Record<ApiTender['status'], { status: 'draft' | 'active' | 'closed'; label: string }> = {
  draft: { status: 'draft', label: 'Draft' },
  published: { status: 'active', label: 'Published' },
  closed: { status: 'closed', label: 'Closed' },
};

export function OfficerTendersPage() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<ApiTender[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<StageTab>('all');
  const [query, setQuery] = useState('');

  function load() {
    setLoadError(null);
    officerApi
      .get<ApiTender[]>('/tenders')
      .then(setTenders)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load tenders.'));
  }

  useEffect(load, []);

  const counts = useMemo(() => {
    const c: Record<StageTab, number> = { all: tenders?.length ?? 0, draft: 0, published: 0, closed: 0 };
    (tenders ?? []).forEach((t) => c[t.status]++);
    return c;
  }, [tenders]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tenders ?? []).filter((t) => (tab === 'all' || t.status === tab) && (!q || `${t.title} ${t.tenderNumber} ${t.department}`.toLowerCase().includes(q)));
  }, [tenders, tab, query]);

  function continueDraft(t: ApiTender) {
    setDraftTenderId(t._id);
    navigate(CREATE_TENDER_ROUTES.info);
  }

  function startNewTender() {
    navigate(CREATE_TENDER_ROUTES.info);
  }

  return (
    <OfficerPortalShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: 'Officer workspace', to: '/officer/dashboard' }, { label: 'Tenders' }]}
          eyebrow={
            <StatusBadge tone="info" icon="account_tree">
              Lifecycle management
            </StatusBadge>
          }
          title="Tenders"
          description="Create, manage and monitor procurement tenders."
          actions={
            <Button leftIcon="add" onClick={startNewTender}>
              Create tender
            </Button>
          }
        />

        {loadError && (
          <Card padding="lg">
            <EmptyState
              icon="error"
              tone="danger"
              title="Could not load tenders"
              description={loadError}
              actions={
                <Button variant="secondary" onClick={load}>
                  Retry
                </Button>
              }
            />
          </Card>
        )}

        {tenders !== null && !loadError && (
          <Card padding="none" className="overflow-hidden">
            <div className="px-5 sm:px-6">
              <Tabs
                ariaLabel="Lifecycle stage"
                value={tab}
                onChange={setTab}
                items={[
                  { id: 'all', label: 'All tenders', count: counts.all },
                  { id: 'draft', label: 'Drafts', count: counts.draft },
                  { id: 'published', label: 'Published', count: counts.published },
                  { id: 'closed', label: 'Closed', count: counts.closed },
                ]}
              />
            </div>

            <div className="border-b border-outline-variant bg-surface-container-low/60 px-5 py-4 sm:px-6">
              <SearchInput size="md" shortcut={false} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, reference or department…" aria-label="Search tenders" className="md:max-w-md" />
            </div>

            {rows.length > 0 ? (
              <Table minWidth={860}>
                <THead>
                  <tr>
                    <Th className="pl-6">Tender</Th>
                    <Th>Status</Th>
                    <Th>Value</Th>
                    <Th>Deadline</Th>
                    <Th align="right" className="pr-6">
                      <span className="sr-only">Action</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((t) => (
                    <Tr key={t._id}>
                      <Td className="pl-6 !py-5 min-w-[240px]">
                        <CellStack primary={t.title || 'Untitled tender'} secondary={<><span className="font-mono text-[12px] text-on-surface">{t.tenderNumber}</span> · {t.department}</>} />
                      </Td>
                      <Td>
                        <StatusBadge status={STAGE_BADGE[t.status].status}>{STAGE_BADGE[t.status].label}</StatusBadge>
                      </Td>
                      <Td className="num whitespace-nowrap">{t.value}</Td>
                      <Td className="whitespace-nowrap num">{new Date(t.submissionDeadline).toLocaleString('en-IN')}</Td>
                      <Td align="right" className="pr-6">
                        {t.status === 'draft' ? (
                          <Button size="sm" leftIcon="edit_note" onClick={() => continueDraft(t)}>
                            Continue draft
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" rightIcon="arrow_forward" to={`/officer/tenders/${encodeURIComponent(t.tenderNumber)}`}>
                            View
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            ) : (
              <EmptyState
                icon="folder_off"
                title="No tenders in this stage"
                description="Nothing matches the selected stage or search."
                actions={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setTab('all');
                      setQuery('');
                    }}
                  >
                    Show all tenders
                  </Button>
                }
              />
            )}
          </Card>
        )}

        <Callout tone="neutral" icon="gavel" title="Draft visibility">
          Drafts are only visible here to officers — the public bidder tender list only ever shows published or closed tenders.
        </Callout>
      </div>
    </OfficerPortalShell>
  );
}
