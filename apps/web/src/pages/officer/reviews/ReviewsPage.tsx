// Procurement Officer — Reviews. The prototype version of this page listed
// bids needing attention based on fabricated PASS/REVIEW/FAIL findings and
// verification conflicts — none of which exist for real, because there is no
// compliance-evaluation engine yet (a later phase). The only real signal
// available today is a bidder document that failed automatic AI processing
// (GET /api/officer/reviews, a real MongoDB query) — shown honestly when it
// exists, with a real empty state when it doesn't.

import { useEffect, useState } from 'react';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Callout, Card, EmptyState, Icon, PageHeader, Tag } from '@/components/primitives';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiOfficerReviewRow } from '@/lib/types';

export function ReviewsPage() {
  const [rows, setRows] = useState<ApiOfficerReviewRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    officerApi
      .get<ApiOfficerReviewRow[]>('/reviews')
      .then(setRows)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load reviews.'));
  }, []);

  return (
    <OfficerPortalShell breadcrumb="Reviews">
      <div className="flex flex-col gap-8">
        <PageHeader breadcrumbs={[{ label: 'Workspace', to: '/officer/dashboard' }, { label: 'Reviews' }]} title="Reviews" description="Compliance evaluation is not implemented yet — this shows real document-processing failures only." />

        {loadError && (
          <Callout tone="danger" title="Could not load reviews">
            {loadError}
          </Callout>
        )}

        {!loadError && rows === null && (
          <div className="flex h-40 items-center justify-center text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin" size="lg" />
          </div>
        )}

        {rows !== null && rows.length === 0 && (
          <Card padding="lg">
            <EmptyState icon="rule" title="No officer reviews pending" description="No submitted bidder document has failed automatic processing. There is also no compliance-evaluation engine yet — that would be the other source of a real review queue, in a later phase." />
          </Card>
        )}

        {rows !== null && rows.length > 0 && (
          <Card padding="none" className="overflow-hidden">
            <ul className="divide-y divide-outline-variant">
              {rows.map((r) => (
                <li key={r.documentId} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
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
          </Card>
        )}
      </div>
    </OfficerPortalShell>
  );
}
