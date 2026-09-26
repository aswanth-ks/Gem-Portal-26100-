// Procurement Officer — Reviews. NOT another Bids list: a lightweight
// attention queue answering "what needs my attention right now?" Every row
// deep-links straight into the relevant Bid Assessment. Read-only grouping —
// no scoring or ranking happens here.
//
// TODO: GET /api/officer/reviews (server-computed queue across tenders).

import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Card, EmptyState, Icon, PageHeader, ResultBadge, RiskBadge, StatusBadge } from '@/components/primitives';
import { BIDS, TENDERS, assessmentPath, type Bid } from '@/pages/officer/bids/assessmentData';

interface QueueRow {
  tenderRef: string;
  tenderTitle: string;
  bid: Bid;
  reason: string;
}

function attentionRows(): QueueRow[] {
  const rows: QueueRow[] = [];
  for (const t of TENDERS) {
    if (t.stage === 'open') continue; // sealed — nothing to review yet
    for (const b of BIDS[t.ref] ?? []) {
      if (b.review !== 'attention') continue;
      const reason = b.result === 'fail' ? 'Requirement failed automated check' : b.needsReview > 1 ? `${b.needsReview} findings need review` : 'Verification gap on this bid';
      rows.push({ tenderRef: t.ref, tenderTitle: t.title, bid: b, reason });
    }
  }
  return rows;
}

// Matches the address-conflict example wired into BidResultPage (CPCL/PROC/2026/041 · BID-002 only).
const CONFLICT_KEY = 'CPCL/PROC/2026/041::BID-002';

function Section({ icon, title, count, description, children }: { icon: string; title: string; count: number; description: string; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-headline-sm font-semibold text-on-surface">
          <Icon name={icon} size="md" className="text-secondary" />
          {title}
          <span className="num rounded-full bg-warning-container px-2 py-0.5 text-[12px] font-semibold text-warning-on-container">{count}</span>
        </h2>
      </div>
      <p className="mb-3 text-body-sm text-on-surface-variant">{description}</p>
      {children}
    </section>
  );
}

function Row({ row }: { row: QueueRow }) {
  return (
    <a
      href={assessmentPath(row.tenderRef, row.bid.id)}
      className="focus-ring flex items-center gap-4 rounded-control border border-outline-variant bg-surface-container-lowest px-4 py-3 transition-colors hover:border-secondary/50 hover:bg-surface-container-low"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] font-semibold text-on-surface">{row.bid.id}</span>
          <span className="text-[14px] text-on-surface">{row.bid.company}</span>
        </div>
        <div className="mt-0.5 truncate text-[12px] text-on-surface-variant">
          {row.tenderTitle} <span className="font-mono">({row.tenderRef})</span> · {row.reason}
        </div>
      </div>
      <RiskBadge r={row.bid.risk} />
      <ResultBadge r={row.bid.result} />
      <Icon name="chevron_right" size="md" className="shrink-0 text-outline" />
    </a>
  );
}

export function ReviewsPage() {
  const attention = attentionRows();
  const pending = attention.filter((r) => r.bid.result === 'review');
  const failed = attention.filter((r) => r.bid.result === 'fail');
  const conflicts = attention.filter((r) => `${r.tenderRef}::${r.bid.id}` === CONFLICT_KEY);
  const total = pending.length + failed.length + conflicts.length;

  return (
    <OfficerPortalShell breadcrumb="Reviews">
      <div className="flex flex-col gap-8">
        <PageHeader
          breadcrumbs={[{ label: 'Workspace', to: '/officer/dashboard' }, { label: 'Reviews' }]}
          title="Reviews"
          description="Everything currently waiting on your attention, across every tender."
          meta={total > 0 ? <span className="num font-semibold text-warning-on-container">{total} items need attention</span> : <span className="inline-flex items-center gap-1 text-success-on-container"><Icon name="check_circle" size="sm" fill />Queue is clear</span>}
        />

        {total === 0 ? (
          <Card padding="lg">
            <EmptyState icon="task_alt" tone="success" title="Nothing needs your attention" description="Assessments pending review, verification conflicts and failed checks will show up here as bids come in." />
          </Card>
        ) : (
          <div className="flex flex-col gap-8">
            <Section icon="rate_review" title="Assessments pending review" count={pending.length} description="System finding is REVIEW — evidence needs a human look before a decision is recorded.">
              <div className="flex flex-col gap-2">
                {pending.map((r) => (
                  <Row key={`${r.tenderRef}-${r.bid.id}`} row={r} />
                ))}
              </div>
            </Section>

            <Section icon="compare_arrows" title="Verification conflicts" count={conflicts.length} description="Cross-source checks disagree (e.g. registered address across documents) and were not resolved automatically.">
              <div className="flex flex-col gap-2">
                {conflicts.map((r) => (
                  <Row key={`c-${r.tenderRef}-${r.bid.id}`} row={r} />
                ))}
              </div>
            </Section>

            <Section icon="error" title="Failed requirement checks" count={failed.length} description="At least one automated check returned FAIL. Confirm the finding before recording a bid decision.">
              <div className="flex flex-col gap-2">
                {failed.map((r) => (
                  <Row key={`f-${r.tenderRef}-${r.bid.id}`} row={r} />
                ))}
              </div>
            </Section>
          </div>
        )}

        <p className="flex items-center gap-2 text-[12px] text-on-surface-variant">
          <StatusBadge tone="neutral" icon="info">Decision support</StatusBadge>
          This queue highlights where evidence needs review. It never ranks bidders or recommends a decision — that stays with you.
        </p>
      </div>
    </OfficerPortalShell>
  );
}
