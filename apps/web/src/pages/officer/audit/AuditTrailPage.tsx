// Procurement Officer — Audit Trail. Phase 8 replaces the previous honest
// empty-only state with the real append-only AuditEvent log
// (GET /api/officer/audit) — every row here is a real, persisted event
// created by the actual action it describes (document view/download,
// evidence view, compliance evaluation run/rerun, officer assessment,
// final decision). Nothing is fabricated; if nothing has happened yet, the
// page still shows an honest empty state.

import { useEffect, useState } from 'react';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Card, EmptyState, Icon, PageHeader, Tag } from '@/components/primitives';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiAuditEvent } from '@/lib/types';

function actionLabel(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function AuditTrailPage() {
  const [events, setEvents] = useState<ApiAuditEvent[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    officerApi
      .get<ApiAuditEvent[]>('/audit')
      .then(setEvents)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load the audit trail.'));
  }, []);

  return (
    <OfficerPortalShell breadcrumb="Audit Trail">
      <div className="flex flex-col gap-6">
        <PageHeader breadcrumbs={[{ label: 'Compliance' }, { label: 'Audit Trail' }]} title="Audit Trail" description="Read-only record of real procurement actions — document access, evidence review, compliance evaluation and officer decisions." />

        {loadError && (
          <Card padding="lg">
            <EmptyState icon="error" tone="danger" title="Could not load the audit trail" description={loadError} />
          </Card>
        )}

        {!loadError && events === null && (
          <div className="flex h-40 items-center justify-center text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin" size="lg" />
          </div>
        )}

        {events !== null && events.length === 0 && (
          <Card padding="lg">
            <EmptyState icon="history_edu" title="No audit events recorded" description="No auditable officer action has happened yet. Events appear here the moment an officer views a document, runs a compliance evaluation, records an assessment, or saves a final decision." />
          </Card>
        )}

        {events !== null && events.length > 0 && (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-outline-variant bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">
                    <th className="px-5 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Officer</th>
                    <th className="px-3 py-2.5">Result</th>
                    <th className="px-3 py-2.5">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e._id} className="border-b border-outline-variant/70">
                      <td className="whitespace-nowrap px-5 py-3 text-[13px] text-on-surface num">{new Date(e.timestamp).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3 text-[13px] font-medium text-on-surface">{actionLabel(e.action)}</td>
                      <td className="px-3 py-3 text-[13px] text-on-surface-variant">{e.officerId}</td>
                      <td className="px-3 py-3">{e.result ? <Tag mono>{e.result}</Tag> : <span className="text-on-surface-variant">—</span>}</td>
                      <td className="px-3 py-3 text-[12px] text-on-surface-variant">{Object.entries(e.context ?? {}).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </OfficerPortalShell>
  );
}
