// Procurement Officer — Bids workspace (sidebar "Bids"). Three zones:
//   LEFT    tender list (select a tender)
//   CENTER  bids for the selected tender (filter / sort, no ranking labels)
//   RIGHT   preview of the selected bid — summary + top findings, with
//           "Open full assessment" going to the evidence-review page.
// Tenders still open are sealed: bid count only, no bidder data.
// ?tender=<slug> preselects a tender (used by "Back" from the bid page).

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Card, Icon, IconButton, PageHeader, ResultBadge, RiskBadge, SearchInput, Select, StatusBadge, Tabs } from '@/components/primitives';
import { cn } from '@/utils/cn';
import { BIDS, STAGE, TENDERS, assessmentPath, slugToRef, type Bid, type Result, type Risk } from './assessmentData';

export { ResultBadge, RiskBadge };

const RISK_ORDER: Record<Risk, number> = { low: 0, medium: 1, high: 2 };

export function BidAssessmentWorkspacePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRef = TENDERS.find((t) => t.ref === slugToRef(params.get('tender') ?? ''))?.ref ?? TENDERS[0].ref;
  const [tenderRef, setTenderRef] = useState(initialRef);
  const [tenderQuery, setTenderQuery] = useState('');
  const [bidQuery, setBidQuery] = useState('');
  const [resultTab, setResultTab] = useState<'all' | Result>('all');
  const [risk, setRisk] = useState('');
  const [review, setReview] = useState('');
  const [sortKey, setSortKey] = useState<'score' | 'risk' | 'time'>('time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const tender = TENDERS.find((t) => t.ref === tenderRef)!;
  const sealed = tender.stage === 'open';
  const allBids = BIDS[tenderRef] ?? [];

  const tenders = TENDERS.filter((t) => {
    const q = tenderQuery.trim().toLowerCase();
    return !q || t.title.toLowerCase().includes(q) || t.ref.toLowerCase().includes(q);
  });

  const bids = useMemo(() => {
    const q = bidQuery.trim().toLowerCase();
    const rows = allBids
      .filter((b) => !q || b.company.toLowerCase().includes(q) || b.id.toLowerCase().includes(q))
      .filter((b) => resultTab === 'all' || b.result === resultTab)
      .filter((b) => !risk || b.risk === risk)
      .filter((b) => !review || b.review === review);
    const val = (b: Bid) => (sortKey === 'score' ? b.score : sortKey === 'risk' ? RISK_ORDER[b.risk] : b.ts);
    return [...rows].sort((a, b) => (sortDir === 'asc' ? val(a) - val(b) : val(b) - val(a)));
  }, [allBids, bidQuery, resultTab, risk, review, sortKey, sortDir]);

  function selectTender(ref: string) {
    setTenderRef(ref);
    setBidQuery('');
    setResultTab('all');
    setRisk('');
    setReview('');
    setPreviewId(null);
  }

  const counts = (r: 'all' | Result) => allBids.filter((b) => r === 'all' || b.result === r).length;
  const openFull = (b: Bid) => navigate(assessmentPath(tenderRef, b.id));
  const preview = allBids.find((b) => b.id === previewId) ?? null;

  return (
    <OfficerPortalShell breadcrumb="Bids">
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: 'Workspace', to: '/officer/dashboard' }, { label: 'Bids' }]}
          title="Bids"
          description="Review bidder submissions, compliance results, and automated assessment findings."
        />

        <div className={cn('grid grid-cols-1 items-start gap-5', preview ? 'xl:grid-cols-[minmax(0,21fr)_minmax(0,46fr)_minmax(0,33fr)]' : 'xl:grid-cols-[minmax(0,26fr)_minmax(0,74fr)]')}>
          {/* LEFT — tenders */}
          <Card padding="none" className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-outline-variant px-4 py-4">
              <h2 className="text-[15px] font-semibold text-on-surface">Tenders</h2>
              <SearchInput size="md" shortcut={false} value={tenderQuery} onChange={(e) => setTenderQuery(e.target.value)} placeholder="Search tenders…" aria-label="Search tenders" />
            </div>
            <ul className="divide-y divide-outline-variant">
              {tenders.map((t) => {
                const active = t.ref === tenderRef;
                return (
                  <li key={t.ref}>
                    <button
                      type="button"
                      onClick={() => selectTender(t.ref)}
                      aria-current={active || undefined}
                      className={cn('relative flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors', active ? 'bg-info-container/50' : 'hover:bg-surface-container-low')}
                    >
                      {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-secondary" />}
                      <span className={cn('text-[14px] leading-snug text-on-surface', active ? 'font-semibold' : 'font-medium')}>{t.title}</span>
                      <span className="font-mono text-[11px] text-on-surface-variant">{t.ref}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={STAGE[t.stage].tone}>{STAGE[t.stage].label}</StatusBadge>
                        <span className="num text-[12px] text-on-surface-variant">{t.bids} bids</span>
                      </span>
                      {t.stage === 'open' && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-on-surface-variant">
                          <Icon name="lock" size="xs" /> Assessments sealed until closing
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {tenders.length === 0 && <li className="px-4 py-6 text-center text-body-sm text-on-surface-variant">No tenders match.</li>}
            </ul>
          </Card>

          {/* RIGHT — bids */}
          <Card padding="none" className="min-w-0 overflow-hidden">
            <div className="flex flex-col gap-1 border-b border-outline-variant px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={STAGE[tender.stage].tone}>{STAGE[tender.stage].label}</StatusBadge>
                <span className="font-mono text-[12px] text-on-surface-variant">{tender.ref}</span>
              </div>
              <h2 className="text-headline-sm font-semibold text-on-surface">{tender.title}</h2>
              <div className="flex flex-wrap gap-x-3 text-body-sm text-on-surface-variant">
                <span className="num">
                  <strong className="font-semibold text-on-surface">{tender.bids}</strong> bids received
                </span>
                <span aria-hidden="true">·</span>
                <span>Deadline {tender.deadline}</span>
              </div>
            </div>

            {sealed ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
                  <Icon name="lock" size="xl" />
                </span>
                <h3 className="text-headline-sm font-semibold text-on-surface">Assessments sealed until closing</h3>
                <p className="max-w-md text-body-md text-on-surface-variant">
                  {tender.bids} bids received. Company names, scores, risk, findings and documents stay sealed until the submission window closes on {tender.deadline}.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 px-5 pt-3">
                  <Tabs
                    variant="pills"
                    ariaLabel="Result"
                    value={resultTab}
                    onChange={(id) => setResultTab(id as 'all' | Result)}
                    items={[
                      { id: 'all', label: `${allBids.length} bids` },
                      { id: 'pass', label: 'PASS', count: counts('pass') },
                      { id: 'review', label: 'REVIEW', count: counts('review') },
                      { id: 'fail', label: 'FAIL', count: counts('fail') },
                    ]}
                  />
                  <div className="grid grid-cols-2 gap-2 pb-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto]">
                    <SearchInput size="md" shortcut={false} value={bidQuery} onChange={(e) => setBidQuery(e.target.value)} placeholder="Search bidder or bid ID…" aria-label="Search bids" className="col-span-2 lg:col-span-1" />
                    <Select size="sm" aria-label="Risk" value={risk} onChange={(e) => setRisk(e.target.value)}>
                      <option value="">Any risk</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </Select>
                    <Select size="sm" aria-label="Assessment status" value={review} onChange={(e) => setReview(e.target.value)}>
                      <option value="">Any status</option>
                      <option value="ready">Ready for review</option>
                      <option value="reviewed">Officer reviewed</option>
                      <option value="attention">Needs attention</option>
                    </Select>
                    <Select size="sm" aria-label="Sort by" value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)}>
                      <option value="time">Sort: Submission time</option>
                      <option value="score">Sort: Compliance score</option>
                      <option value="risk">Sort: Risk</option>
                    </Select>
                    <IconButton icon={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'} aria-label={sortDir === 'asc' ? 'Ascending — switch to descending' : 'Descending — switch to ascending'} onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} />
                  </div>
                </div>

                <div className="overflow-x-auto scroll-thin">
                  <table className="w-full min-w-[600px] border-collapse text-left">
                    <thead>
                      <tr className="border-y border-outline-variant bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">
                        <th className="px-5 py-2.5">Bid ID</th>
                        <th className="px-3 py-2.5">Company</th>
                        <th className="px-3 py-2.5 text-right">Compliance</th>
                        <th className="px-3 py-2.5">Risk</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="hidden px-3 py-2.5 min-[1400px]:table-cell">Submitted</th>
                        <th className="px-5 py-2.5 text-right">
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bids.map((b) => (
                        <tr
                          key={b.id}
                          onClick={() => setPreviewId(b.id === previewId ? null : b.id)}
                          aria-selected={b.id === previewId}
                          className={cn('cursor-pointer border-b border-outline-variant/70 transition-colors hover:bg-surface-container-low', b.id === previewId && 'bg-info-container/40')}
                        >
                          <td className="whitespace-nowrap px-5 py-3 font-mono text-[13px] font-semibold text-on-surface">{b.id}</td>
                          <td className="min-w-[170px] px-3 py-3">
                            <div className="text-[14px] font-semibold text-on-surface">{b.company}</div>
                            <div className="text-[12px] text-on-surface-variant min-[1400px]:hidden">{b.submitted}</div>
                            {b.review === 'reviewed' && (
                              <span className="inline-flex items-center gap-0.5 text-[12px] text-success-on-container">
                                <Icon name="task_alt" size="xs" /> Officer reviewed
                              </span>
                            )}
                          </td>
                          <td className="num px-3 py-3 text-right text-[14px] font-semibold text-on-surface">
                            {b.score}
                            <span className="font-normal text-on-surface-variant"> / 100</span>
                          </td>
                          <td className="px-3 py-3">
                            <RiskBadge r={b.risk} />
                          </td>
                          <td className="px-3 py-3">
                            <ResultBadge r={b.result} />
                          </td>
                          <td className="hidden whitespace-nowrap px-3 py-3 text-body-sm text-on-surface-variant min-[1400px]:table-cell">{b.submitted}</td>
                          <td className="py-3 pl-2 pr-5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFull(b);
                              }}
                              className="inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-secondary hover:underline"
                            >
                              View result <Icon name="arrow_forward" size="xs" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {bids.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-10 text-center text-body-sm text-on-surface-variant">
                            No bids match these filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="px-5 py-3 text-[12px] text-on-surface-variant">Sorting and filtering only — bids are not ranked. Scores are illustrative decision support, not a qualification decision.</p>
              </>
            )}
          </Card>

          {/* RIGHT — preview of the selected bid */}
          {preview && (
            <Card padding="none" className="overflow-hidden xl:sticky xl:top-24">
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold text-on-surface">{preview.id}</span>
                    <ResultBadge r={preview.result} />
                  </div>
                  <h3 className="mt-0.5 truncate text-headline-sm font-semibold text-on-surface">{preview.company}</h3>
                </div>
                <IconButton icon="close" aria-label="Close preview" onClick={() => setPreviewId(null)} />
              </div>

              <dl className="grid grid-cols-2 gap-3 border-b border-outline-variant px-5 py-4">
                <div>
                  <dt className="text-[12px] text-on-surface-variant">Compliance</dt>
                  <dd className="num text-[16px] font-semibold text-on-surface">{preview.score} / 100</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-on-surface-variant">Risk</dt>
                  <dd className="mt-0.5">
                    <RiskBadge r={preview.risk} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-on-surface-variant">Requirements</dt>
                  <dd className="num text-[16px] font-semibold text-on-surface">{preview.passed} / 14</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-on-surface-variant">Needs review</dt>
                  <dd className={cn('num text-[16px] font-semibold', preview.needsReview ? 'text-warning-on-container' : 'text-on-surface')}>{preview.needsReview}</dd>
                </div>
              </dl>

              <div className="border-b border-outline-variant px-5 py-4">
                <div className="mb-1.5 text-[13px] font-semibold text-on-surface">Submission</div>
                <div className="text-body-sm text-on-surface-variant">Submitted {preview.submitted}</div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                  {preview.review === 'reviewed' ? (
                    <>
                      <Icon name="task_alt" size="xs" className="text-success" /> Officer reviewed
                    </>
                  ) : preview.review === 'attention' ? (
                    <>
                      <Icon name="flag" size="xs" className="text-warning" /> Needs officer attention
                    </>
                  ) : (
                    <>
                      <Icon name="schedule" size="xs" /> Ready for review
                    </>
                  )}
                </div>
              </div>

              <div className="px-5 py-4">
                <Button fullWidth rightIcon="arrow_forward" onClick={() => openFull(preview)}>
                  Open full assessment
                </Button>
                <p className="mt-2 text-[12px] text-on-surface-variant">Full evidence, verification and the officer decision are recorded on the assessment page.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </OfficerPortalShell>
  );
}
