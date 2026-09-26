// Procurement Officer — Bids workspace (queue). First screen of the
// post-publication evaluation flow. Tenders still open show only a bid count
// with assessments sealed; closed tenders offer "Review bids". Same shell,
// tabs, filters and table as Tender Management.

import { useMemo, useState } from 'react';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Card, EmptyState, Icon, PageHeader, SearchInput, Select, StatusBadge, Table, TBody, Td, Th, THead, Tabs, Tr } from '@/components/primitives';
import { ASSESSMENT_LABEL, BID_TENDERS, STAGE_LABEL, refToSlug, type Assessment, type BidTender, type TenderStage } from './bidsData';

type TabId = 'all' | 'open' | 'ready' | 'under_review' | 'findings' | 'completed';

const TAB_MATCH: Record<TabId, (t: BidTender) => boolean> = {
  all: () => true,
  open: (t) => t.stage === 'open',
  ready: (t) => t.assessment === 'ready',
  under_review: (t) => t.assessment === 'under_review',
  findings: (t) => t.assessment === 'findings',
  completed: (t) => t.assessment === 'completed',
};

export function StageBadge({ stage }: { stage: TenderStage }) {
  const tone = { open: 'info', closed: 'warning', evaluation: 'info', completed: 'success' } as const;
  return <StatusBadge tone={tone[stage]}>{STAGE_LABEL[stage]}</StatusBadge>;
}

export function AssessmentBadge({ a }: { a: Assessment }) {
  if (a === 'sealed')
    return (
      <StatusBadge tone="neutral" icon="lock">
        {ASSESSMENT_LABEL[a]}
      </StatusBadge>
    );
  const tone = { ready: 'success', under_review: 'info', findings: 'warning', completed: 'neutral' } as const;
  return <StatusBadge tone={tone[a]}>{ASSESSMENT_LABEL[a]}</StatusBadge>;
}

const NOW = new Date('2026-09-26T14:35');

export function OfficerBidsPage() {
  const [tab, setTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assessment, setAssessment] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BID_TENDERS.filter(TAB_MATCH[tab])
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.ref.toLowerCase().includes(q))
      .filter((t) => !stage || t.stage === stage)
      .filter((t) => !assessment || t.assessment === assessment)
      .filter((t) => {
        if (!deadline) return true;
        const d = new Date(t.deadlineISO).getTime();
        const days = (d - NOW.getTime()) / 86_400_000;
        return deadline === 'upcoming' ? days >= 0 && days <= 14 : days < 0;
      });
  }, [tab, query, stage, deadline, assessment]);

  const filtersOn = query || stage || deadline || assessment;
  const clear = () => {
    setQuery('');
    setStage('');
    setDeadline('');
    setAssessment('');
  };

  return (
    <OfficerPortalShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: 'Workspace', to: '/officer/dashboard' }, { label: 'Bids' }]}
          title="Bids"
          description="Review submitted bids and access automated compliance assessments after the submission window closes."
        />

        <Card padding="none" className="overflow-hidden">
          <div className="px-5 pt-3 sm:px-6">
            <Tabs
              ariaLabel="Bid status"
              value={tab}
              onChange={(id) => setTab(id as TabId)}
              items={(
                [
                  ['all', 'All'],
                  ['open', 'Submission open'],
                  ['ready', 'Ready for review'],
                  ['under_review', 'Under review'],
                  ['findings', 'Verification findings'],
                  ['completed', 'Completed'],
                ] as [TabId, string][]
              ).map(([id, label]) => ({ id, label, count: BID_TENDERS.filter(TAB_MATCH[id]).length, countTone: id === 'findings' ? 'warning' : undefined }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 border-y border-outline-variant bg-surface-container-low/60 px-5 py-4 sm:px-6 md:grid-cols-12 md:items-center">
            <SearchInput size="md" shortcut={false} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by tender reference or title…" aria-label="Search bids" className="md:col-span-4" />
            <div className="md:col-span-2">
              <Select size="sm" aria-label="Tender status" value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="">All tender statuses</option>
                {Object.entries(STAGE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Select size="sm" aria-label="Submission deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)}>
                <option value="">Any deadline</option>
                <option value="upcoming">Next 14 days</option>
                <option value="passed">Deadline passed</option>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Select size="sm" aria-label="Evaluation status" value={assessment} onChange={(e) => setAssessment(e.target.value)}>
                <option value="">All evaluation statuses</option>
                {Object.entries(ASSESSMENT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-1 md:text-right">
              <Button size="sm" variant="ghost" disabled={!filtersOn} onClick={clear}>
                Clear
              </Button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState icon="search_off" title="No tenders match" description="Try a different tab or clear the filters." actions={<Button variant="secondary" onClick={clear}>Clear filters</Button>} />
            </div>
          ) : (
            <Table minWidth={900}>
              <THead>
                <tr>
                  <Th>Tender</Th>
                  <Th>Submission deadline</Th>
                  <Th>Bids received</Th>
                  <Th>Tender status</Th>
                  <Th>Assessment</Th>
                  <Th align="right">
                    <span className="sr-only">Action</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {rows.map((t) => {
                  const sealed = t.stage === 'open';
                  return (
                    <Tr key={t.ref}>
                      <Td className="max-w-[300px]">
                        <div className="font-semibold text-on-surface">{t.title}</div>
                        <div className="font-mono text-[12px] text-on-surface-variant">{t.ref}</div>
                      </Td>
                      <Td className="whitespace-nowrap">{t.deadline}</Td>
                      <Td className="num whitespace-nowrap">
                        {t.bids} bids
                        {sealed && (
                          <div className="flex items-center gap-1 text-[12px] text-on-surface-variant">
                            <Icon name="lock" size="xs" /> Identities sealed
                          </div>
                        )}
                      </Td>
                      <Td>
                        <StageBadge stage={t.stage} />
                      </Td>
                      <Td>
                        <AssessmentBadge a={t.assessment} />
                      </Td>
                      <Td align="right">
                        {sealed ? (
                          <Button size="sm" variant="secondary" to={`/officer/bids/${refToSlug(t.ref)}`}>
                            View tender
                          </Button>
                        ) : (
                          <Button size="sm" variant={t.assessment === 'completed' ? 'secondary' : 'primary'} rightIcon="arrow_forward" to={`/officer/bids/${refToSlug(t.ref)}`}>
                            {t.assessment === 'completed' ? 'View bids' : 'Review bids'}
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>

        <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Icon name="lock" size="sm" className="text-outline" />
          While a submission window is open, only the bid count is visible. Bidder identities, documents and assessments unlock after the deadline.
        </p>
      </div>
    </OfficerPortalShell>
  );
}
