// Procurement Officer — Bids workspace (sidebar "Bids"). Real data only:
//   LEFT    real tenders (officerApi GET /tenders), published/closed only
//   CENTER  real bids for the selected tender (officerApi GET
//           /tenders/:id/bids) — sealed until the submission deadline
//           passes, exactly like the sealed-bid rule enforced for bidders.
//
// There is no compliance scoring/PASS-FAIL/risk engine yet (a later phase) —
// this shows exactly what the backend actually knows: who submitted, when,
// how many documents, and a link to the real submission.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Card, Callout, Icon, PageHeader, SearchInput, StatusBadge } from '@/components/primitives';
import { cn } from '@/utils/cn';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiOfficerBidRow, ApiOfficerBidsForTender, ApiTender } from '@/lib/types';

export function BidAssessmentWorkspacePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [tenders, setTenders] = useState<ApiTender[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tenderRef, setTenderRef] = useState<string | null>(params.get('tender'));
  const [tenderQuery, setTenderQuery] = useState('');
  const [bidQuery, setBidQuery] = useState('');

  const [bidsData, setBidsData] = useState<ApiOfficerBidsForTender | null>(null);
  const [bidsError, setBidsError] = useState<string | null>(null);

  useEffect(() => {
    officerApi
      .get<ApiTender[]>('/tenders')
      .then((all) => {
        const eligible = all.filter((t) => t.status !== 'draft');
        setTenders(eligible);
        if (!tenderRef && eligible.length > 0) setTenderRef(eligible[0].tenderNumber);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load tenders.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tender = tenders?.find((t) => t.tenderNumber === tenderRef) ?? null;

  useEffect(() => {
    if (!tender) return;
    setBidsData(null);
    setBidsError(null);
    officerApi
      .get<ApiOfficerBidsForTender>(`/tenders/${tender._id}/bids`)
      .then(setBidsData)
      .catch((err) => setBidsError(err instanceof ApiError ? err.message : 'Could not load bids.'));
  }, [tender]);

  function selectTender(ref: string) {
    setTenderRef(ref);
    setBidQuery('');
    setParams({ tender: ref });
  }

  const tenderRows = useMemo(() => {
    const q = tenderQuery.trim().toLowerCase();
    return (tenders ?? []).filter((t) => !q || t.title.toLowerCase().includes(q) || t.tenderNumber.toLowerCase().includes(q));
  }, [tenders, tenderQuery]);

  const bidRows = useMemo(() => {
    const q = bidQuery.trim().toLowerCase();
    return (bidsData?.bids ?? []).filter((b) => !q || b.organizationName.toLowerCase().includes(q) || (b.bidReference ?? '').toLowerCase().includes(q));
  }, [bidsData, bidQuery]);

  if (loadError) {
    return (
      <OfficerPortalShell breadcrumb="Bids">
        <Callout tone="danger" title="Could not load tenders">
          {loadError}
        </Callout>
      </OfficerPortalShell>
    );
  }

  if (!tenders) {
    return (
      <OfficerPortalShell breadcrumb="Bids">
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </OfficerPortalShell>
    );
  }

  return (
    <OfficerPortalShell breadcrumb="Bids">
      <div className="flex flex-col gap-6">
        <PageHeader breadcrumbs={[{ label: 'Workspace', to: '/officer/dashboard' }, { label: 'Bids' }]} title="Bids" description="Real bidder submissions. Compliance evaluation is not implemented yet — this shows submission data only." />

        {tenders.length === 0 ? (
          <Card padding="lg">
            <p className="text-body-sm text-on-surface-variant">No published tenders yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,26fr)_minmax(0,74fr)]">
            {/* LEFT — tenders */}
            <Card padding="none" className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-outline-variant px-4 py-4">
                <h2 className="text-[15px] font-semibold text-on-surface">Tenders</h2>
                <SearchInput size="md" shortcut={false} value={tenderQuery} onChange={(e) => setTenderQuery(e.target.value)} placeholder="Search tenders…" aria-label="Search tenders" />
              </div>
              <ul className="divide-y divide-outline-variant">
                {tenderRows.map((t) => {
                  const active = t.tenderNumber === tenderRef;
                  return (
                    <li key={t._id}>
                      <button
                        type="button"
                        onClick={() => selectTender(t.tenderNumber)}
                        aria-current={active || undefined}
                        className={cn('relative flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors', active ? 'bg-info-container/50' : 'hover:bg-surface-container-low')}
                      >
                        {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-secondary" />}
                        <span className={cn('text-[14px] leading-snug text-on-surface', active ? 'font-semibold' : 'font-medium')}>{t.title}</span>
                        <span className="font-mono text-[11px] text-on-surface-variant">{t.tenderNumber}</span>
                        <StatusBadge status={t.status === 'closed' ? 'closed' : 'open'} />
                      </button>
                    </li>
                  );
                })}
                {tenderRows.length === 0 && <li className="px-4 py-6 text-center text-body-sm text-on-surface-variant">No tenders match.</li>}
              </ul>
            </Card>

            {/* CENTER — bids */}
            <Card padding="none" className="min-w-0 overflow-hidden">
              {tender && (
                <div className="flex flex-col gap-1 border-b border-outline-variant px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={tender.status === 'closed' ? 'closed' : 'open'} />
                    <span className="font-mono text-[12px] text-on-surface-variant">{tender.tenderNumber}</span>
                  </div>
                  <h2 className="text-headline-sm font-semibold text-on-surface">{tender.title}</h2>
                  <span className="text-body-sm text-on-surface-variant">Deadline {new Date(tender.submissionDeadline).toLocaleString('en-IN')}</span>
                </div>
              )}

              {bidsError && (
                <Callout tone="danger" title="Could not load bids" className="m-5">
                  {bidsError}
                </Callout>
              )}

              {!bidsError && !bidsData && (
                <div className="flex h-40 items-center justify-center text-on-surface-variant">
                  <Icon name="progress_activity" className="animate-spin" size="lg" />
                </div>
              )}

              {bidsData?.sealed && (
                <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
                    <Icon name="lock" size="xl" />
                  </span>
                  <h3 className="text-headline-sm font-semibold text-on-surface">Bids sealed until closing</h3>
                  <p className="max-w-md text-body-md text-on-surface-variant">Bidder identities and submissions stay sealed until the submission window closes on {new Date(bidsData.deadline).toLocaleString('en-IN')}.</p>
                </div>
              )}

              {bidsData && !bidsData.sealed && (
                <>
                  <div className="flex flex-col gap-3 px-5 py-3">
                    <SearchInput size="md" shortcut={false} value={bidQuery} onChange={(e) => setBidQuery(e.target.value)} placeholder="Search bidder or bid reference…" aria-label="Search bids" className="max-w-md" />
                    <span className="text-body-sm text-on-surface-variant">{bidsData.bids.length} bid{bidsData.bids.length === 1 ? '' : 's'} submitted</span>
                  </div>

                  <div className="overflow-x-auto scroll-thin">
                    <table className="w-full min-w-[600px] border-collapse text-left">
                      <thead>
                        <tr className="border-y border-outline-variant bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">
                          <th className="px-5 py-2.5">Bid reference</th>
                          <th className="px-3 py-2.5">Company</th>
                          <th className="px-3 py-2.5">Documents</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Submitted</th>
                          <th className="px-5 py-2.5 text-right">
                            <span className="sr-only">Action</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bidRows.map((b) => (
                          <tr key={b._id} className="border-b border-outline-variant/70 transition-colors hover:bg-surface-container-low">
                            <td className="whitespace-nowrap px-5 py-3 font-mono text-[13px] font-semibold text-on-surface">{b.bidReference ?? '—'}</td>
                            <td className="min-w-[170px] px-3 py-3 text-[14px] font-semibold text-on-surface">{b.organizationName}</td>
                            <td className="num px-3 py-3 text-[14px] text-on-surface-variant">{b.documentCount}</td>
                            <td className="px-3 py-3">
                              <StatusBadge status={b.status} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-body-sm text-on-surface-variant">{b.submittedAt ? new Date(b.submittedAt).toLocaleString('en-IN') : '—'}</td>
                            <td className="py-3 pl-2 pr-5 text-right">
                              <button
                                type="button"
                                onClick={() => navigate(`/officer/bids/${b._id}`)}
                                className="inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-secondary hover:underline"
                              >
                                View bid <Icon name="arrow_forward" size="xs" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {bidRows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-10 text-center text-body-sm text-on-surface-variant">
                              No bids match this search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="px-5 py-3 text-[12px] text-on-surface-variant">Compliance evaluation is not implemented yet — no scores, risk levels or PASS/FAIL results exist.</p>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </OfficerPortalShell>
  );
}
