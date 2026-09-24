// Enterprise Dashboard — authenticated bidder landing page after login.
// Ported from Stitch screen "CPCL Bidder Portal - Enterprise Dashboard"
// (project 6921642772921774119, screen 580e1bf595b940e88a6765985d9e6e8e) and
// rebuilt on the shared design-system primitives.
//
// TODO: replace all mock content (metrics, active submission, recent
// submissions, alerts, activity) with data from features/dashboard,
// features/tenders and features/documents via services/api once the gateway
// exposes the relevant endpoints.

import { Link } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import {
  Button,
  Callout,
  Card,
  CardHeader,
  CellStack,
  Icon,
  PageHeader,
  StatCard,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tag,
  type Status,
} from '@/components/primitives';
import { cn } from '@/utils/cn';

const ACTIVE_TENDER = 'CPCL%2FPROC%2F2026%2F041';

const METRICS: { label: string; value: string; hint: string; icon: string; tone: 'info' | 'success' | 'neutral' | 'warning' }[] = [
  { label: 'Open tenders', value: '18', hint: 'Currently accepting bids', icon: 'folder_open', tone: 'info' },
  { label: 'Submitted', value: '4', hint: 'Active sealed bids', icon: 'verified', tone: 'success' },
  { label: 'Drafts', value: '1', hint: 'Needs completion', icon: 'edit_note', tone: 'neutral' },
  { label: 'Closing soon', value: '2', hint: 'Within next 7 days', icon: 'timer', tone: 'warning' },
];

const PROGRESS_STEPS = [
  { step: 1, label: 'Tender details', status: 'Completed', state: 'done' as const },
  { step: 2, label: 'Eligibility check', status: 'Completed', state: 'done' as const },
  { step: 3, label: 'Mandatory docs', status: 'Uploading UDIN CA', state: 'active' as const },
  { step: 4, label: 'Technical bid', status: 'Pending', state: 'pending' as const },
  { step: 5, label: 'Financial BoQ', status: 'Pending', state: 'pending' as const },
  { step: 6, label: 'DSC sign', status: 'Pending', state: 'locked' as const },
];

const SUBMISSIONS: { title: string; ref: string; submissionId: string; submittedOn: string; status: Status; statusLabel?: string; actionLabel: string; to: string }[] = [
  {
    title: 'Supply of CCTV Cameras (Security Phase I)',
    ref: 'CPCL/PROC/2026/041',
    submissionId: 'BID-2026-00418',
    submittedOn: '02 Oct 2026 · 14:32 IST',
    status: 'submitted',
    actionLabel: 'View envelope',
    to: '/my-bids/BID-2026-00418',
  },
  {
    title: 'Industrial Network Security Equipment (OT Firewall)',
    ref: 'CPCL/PROC/2026/039',
    submissionId: 'BID-2026-00402',
    submittedOn: '28 Sep 2026 · 11:10 IST',
    status: 'processing',
    actionLabel: 'View status',
    to: '/my-bids/BID-2026-00402',
  },
  {
    title: 'Control Room Display Systems (Ultra-High Brightness)',
    ref: 'CPCL/PROC/2026/037',
    submissionId: 'BID-2026-00391',
    submittedOn: '20 Sep 2026 · 09:42 IST',
    status: 'draft',
    statusLabel: 'Draft · 11/14',
    actionLabel: 'Continue',
    to: '/tenders/CPCL%2FPROC%2F2026%2F037/bid/1',
  },
];

const VAULT_STAGES = [
  { label: 'Submitted', meta: '02 Oct, 14:32 IST', sub: 'Digital timestamped', state: 'done' as const },
  { label: 'Documents', meta: 'OCR & PAN/GSTIN', sub: 'Automated match', state: 'done' as const },
  { label: 'Matrix stored', meta: 'Deterministic proof', sub: 'Compliance logged', state: 'done' as const },
  { label: 'Sealed vault', meta: '2048-bit AES', sub: 'Tamper-proof block', state: 'done' as const },
  { label: 'Locked', meta: 'Inactive to officers', sub: 'Opens 04 Oct 17:00', state: 'locked' as const },
];

const QUICK_ACTIONS: { icon: string; label: string; to?: string; badge?: string }[] = [
  { icon: 'travel_explore', label: 'Search public tenders', to: '/tenders' },
  { icon: 'mark_email_read', label: 'View my bid envelopes', to: '/my-bids' },
  { icon: 'vpn_key', label: 'Manage DSC & certificates' },
  { icon: 'feed', label: 'Check corrigenda & notices', badge: 'New' },
];

const ALERTS = [
  {
    tone: 'warning' as const,
    label: 'Closing soon',
    body: (
      <>
        Tender <strong>CPCL/PROC/2026/041</strong> closes in 48 hours. Ensure your Class-3 DSC USB token is inserted for final signing.
      </>
    ),
  },
  {
    tone: 'info' as const,
    label: 'Action required',
    body: (
      <>
        Complete draft <strong>BID-2026-00391</strong> (Control Room Displays) before 12 Oct 2026 to prevent auto-cancellation.
      </>
    ),
  },
];

const ACTIVITY_FEED = [
  { time: 'Today · 14:34 IST', text: 'Automated document verification completed', sub: '14/14 statutory credentials valid', live: true },
  { time: 'Today · 14:32 IST', text: 'Bid submitted: Supply of CCTV Cameras', sub: 'Envelope BID-2026-00418 sealed', live: true },
  { time: '28 Sep · 11:10 IST', text: 'Bid submitted: OT Firewall & IPS', sub: 'Envelope BID-2026-00402', live: false },
  { time: '20 Sep · 09:42 IST', text: 'Draft initiated: Control Room Display', sub: 'BoQ template exported', live: false },
];

export function DashboardPage() {
  return (
    <BidderPortalShell>
      <div className="flex flex-col gap-10">
        <PageHeader
          eyebrow={
            <>
              <StatusBadge status="verified">Class-3 DSC active</StatusBadge>
              <Tag mono>BIDDER-00482</Tag>
            </>
          }
          title="Good morning, ABC Engineering"
          description="Your bidding activity, sealed-vault status and pending submissions at a glance."
          actions={
            <>
              <Button variant="secondary" leftIcon="download">
                Activity log
              </Button>
              <Button to="/tenders" leftIcon="add">
                New bid submission
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <section aria-label="Summary" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.map((m) => (
            <StatCard key={m.label} label={m.label} value={m.value} hint={m.hint} icon={m.icon} tone={m.tone} />
          ))}
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          {/* MAIN COLUMN */}
          <div className="flex flex-col gap-8 xl:col-span-8">
            {/* Continue where you left off — the one emphasized card */}
            <Card padding="none" className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-secondary via-secondary to-saffron" aria-hidden="true" />
              <div className="flex flex-col gap-6 p-6 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status="active">In-progress draft</StatusBadge>
                    <Tag mono>CPCL/PROC/2026/041</Tag>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                    <Icon name="cloud_done" size="sm" className="text-success" />
                    Auto-saved 14 min ago
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <h2 className="text-headline-lg text-on-surface">Supply of CCTV Cameras for Public Safety Infrastructure</h2>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm text-on-surface-variant">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="factory" size="sm" />
                      Manali Refinery Operations
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-danger-on-container">
                      <Icon name="schedule" size="sm" />
                      Closes 04 Oct 2026 · 17:00 IST (in 2 days)
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="rounded-card border border-outline-variant/70 bg-surface-container-low p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[14px] font-semibold text-on-surface">Submission progress</span>
                    <span className="text-[13px] font-medium text-secondary num">3 of 6 steps · 50%</span>
                  </div>
                  <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: '50%' }} />
                  </div>
                  <ol className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {PROGRESS_STEPS.map((s) => (
                      <li
                        key={s.step}
                        className={cn(
                          'flex flex-col gap-1 rounded-control border bg-surface-container-lowest p-3',
                          s.state === 'active' ? 'border-secondary/50 shadow-focus' : 'border-outline-variant/70',
                          (s.state === 'pending' || s.state === 'locked') && 'opacity-70',
                        )}
                      >
                        <span className={cn('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]', s.state === 'done' ? 'text-success-on-container' : s.state === 'active' ? 'text-secondary' : 'text-outline')}>
                          <Icon name={s.state === 'done' ? 'check_circle' : s.state === 'active' ? 'radio_button_checked' : s.state === 'locked' ? 'lock' : 'radio_button_unchecked'} size="xs" fill={s.state === 'done'} />
                          Step {s.step}
                        </span>
                        <span className="truncate text-[13px] font-semibold text-on-surface">{s.label}</span>
                        <span className={cn('truncate text-[12px]', s.state === 'active' ? 'text-secondary' : 'text-on-surface-variant')}>{s.status}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2.5">
                    <Button size="lg" rightIcon="arrow_forward" to={`/tenders/${ACTIVE_TENDER}/bid/2`}>
                      Continue submission
                    </Button>
                    <Button size="lg" variant="secondary" leftIcon="description" to={`/tenders/${ACTIVE_TENDER}`}>
                      View specifications
                    </Button>
                  </div>
                  <span className="hidden items-center gap-1.5 text-body-sm text-on-surface-variant md:inline-flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                    UDIN verification engine connected
                  </span>
                </div>
              </div>
            </Card>

            {/* Recent submissions */}
            <Card padding="none">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-headline-md text-on-surface">Recent submissions</h2>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">{SUBMISSIONS.length} records in the last 30 days</p>
                </div>
                <Button variant="ghost" size="sm" rightIcon="arrow_forward" to="/my-bids">
                  All my bids
                </Button>
              </div>
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
                  {SUBMISSIONS.map((row) => (
                    <Tr key={row.submissionId}>
                      <Td className="pl-6">
                        <CellStack primary={row.title} secondary={<span className="font-mono text-[12px]">{row.submissionId} · {row.ref}</span>} />
                      </Td>
                      <Td className="text-body-sm text-on-surface-variant">{row.submittedOn}</Td>
                      <Td>
                        <StatusBadge status={row.status}>{row.statusLabel}</StatusBadge>
                      </Td>
                      <Td align="right" className="pr-6">
                        <Button variant="ghost" size="sm" rightIcon="chevron_right" to={row.to}>
                          {row.actionLabel}
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </Card>

            {/* Vault lifecycle */}
            <Card>
              <CardHeader
                icon="security"
                title="Submission lifecycle & vault guarantee"
                description="Latest sealed envelope and its cryptographic custody chain"
                actions={<Tag mono>BID-2026-00418</Tag>}
              />
              <ol className="grid grid-cols-1 gap-3 md:grid-cols-5">
                {VAULT_STAGES.map((stage, i) => (
                  <li
                    key={stage.label}
                    className={cn(
                      'flex flex-col gap-1.5 rounded-card border p-4',
                      stage.state === 'locked' ? 'border-navy bg-navy text-white' : 'border-outline-variant/70 bg-surface-container-low',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('text-[11px] font-semibold uppercase tracking-[0.06em] num', stage.state === 'locked' ? 'text-saffron' : 'text-on-surface-variant')}>
                        0{i + 1}
                      </span>
                      <Icon name={stage.state === 'locked' ? 'lock' : 'check_circle'} size="sm" fill className={stage.state === 'locked' ? 'text-saffron' : 'text-success'} />
                    </div>
                    <span className={cn('text-[14px] font-semibold', stage.state === 'locked' ? 'text-white' : 'text-on-surface')}>{stage.label}</span>
                    <span className={cn('text-[12px]', stage.state === 'locked' ? 'text-white/70' : 'text-on-surface-variant')}>{stage.meta}</span>
                    <span className={cn('text-[12px] font-medium', stage.state === 'locked' ? 'text-white/90' : 'text-on-surface')}>{stage.sub}</span>
                  </li>
                ))}
              </ol>
              <Callout tone="info" icon="encrypted" title="Zero-officer visibility active" className="mt-5">
                Technical documents are encrypted inside the sovereign vault. Procurement officers and evaluation committees cannot view your bid, compliance scores or financial envelope until the public decryption on{' '}
                <strong>05 Oct 2026</strong>. <span className="font-mono text-[12px]">SHA256-8f9b4c02…a104e</span>
              </Callout>
            </Card>
          </div>

          {/* RIGHT RAIL */}
          <aside className="flex flex-col gap-6 xl:col-span-4">
            <Card>
              <CardHeader title="Quick actions" className="mb-3" />
              <div className="-mx-2 flex flex-col">
                {QUICK_ACTIONS.map((a) => {
                  const inner = (
                    <>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-surface-container-low text-on-surface-variant transition-colors group-hover:bg-info-container group-hover:text-secondary">
                        <Icon name={a.icon} size="md" />
                      </span>
                      <span className="flex-1 text-[14px] font-medium text-on-surface">{a.label}</span>
                      {a.badge ? <StatusBadge tone="warning">{a.badge}</StatusBadge> : <Icon name="chevron_right" size="md" className="text-outline transition-transform group-hover:translate-x-0.5" />}
                    </>
                  );
                  const cls = 'group focus-ring flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-container-low';
                  return a.to ? (
                    <Link key={a.label} to={a.to} className={cls}>
                      {inner}
                    </Link>
                  ) : (
                    <button key={a.label} type="button" className={cn(cls, 'text-left')}>
                      {inner}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHeader title="Important alerts" actions={<StatusBadge tone="danger">{ALERTS.length}</StatusBadge>} className="mb-4" />
              <div className="flex flex-col gap-3">
                {ALERTS.map((a) => (
                  <Callout key={a.label} tone={a.tone} title={a.label}>
                    {a.body}
                  </Callout>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Recent activity" className="mb-5" />
              <ol className="relative flex flex-col gap-5 pl-6 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-outline-variant">
                {ACTIVITY_FEED.map((item) => (
                  <li key={item.time + item.text} className="relative">
                    <span className={cn('absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-[3px] border-surface-container-lowest', item.live ? 'bg-secondary' : 'bg-outline-variant')} aria-hidden="true" />
                    <div className="text-[12px] text-on-surface-variant num">{item.time}</div>
                    <div className="mt-0.5 text-[14px] font-medium text-on-surface">{item.text}</div>
                    <div className="text-body-sm text-on-surface-variant">{item.sub}</div>
                  </li>
                ))}
              </ol>
            </Card>

            <Card tone="subtle">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-container-lowest text-secondary shadow-xs">
                  <Icon name="support_agent" size="lg" />
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-on-surface">Bidder help & DSC diagnostics</div>
                  <div className="mt-0.5 text-body-sm text-on-surface-variant">
                    Technical desk <strong className="text-on-surface num">1800-425-7800</strong> · 09:00–18:00 IST
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                    <Button variant="link" size="sm" leftIcon="download">
                      Signer utility v2.4
                    </Button>
                    <Button variant="link" size="sm" leftIcon="play_circle">
                      Bidding walkthrough
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </BidderPortalShell>
  );
}
