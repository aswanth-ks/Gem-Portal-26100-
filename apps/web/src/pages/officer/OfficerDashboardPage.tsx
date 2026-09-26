// Procurement Officer Dashboard — ported from Stitch screen "O02 —
// Procurement Officer Dashboard" (project 6921642772921774119, screen
// 2173ac07350244139546f4ca83233df0), built on the shared PortalShell and
// design-system primitives so it matches the bidder dashboard.
//
// Keeps the prototype's "Simulate zero-queue" toggle and the My Tenders
// status tabs as React state.
//
// TODO: replace mock data with officer APIs (tenders, review queue,
// verification findings, audit feed) once the gateway exposes them.

import { useMemo, useState } from 'react';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import {
  Button,
  Callout,
  Card,
  CardHeader,
  CellStack,
  EmptyState,
  Icon,
  PageHeader,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  Tag,
  type Status,
} from '@/components/primitives';
import { cn } from '@/utils/cn';

const KPIS: { label: string; value: string; hint: string; icon: string; tone: 'info' | 'neutral' | 'success' | 'warning'; action: string; to: string }[] = [
  { label: 'Active tenders', value: '12', hint: '4 closing within 48h', icon: 'assignment', tone: 'info', action: 'Filter portfolio', to: '/officer/tenders' },
  { label: 'Draft tenders', value: '3', hint: '1 awaiting review approval', icon: 'edit_document', tone: 'neutral', action: 'Review specifications', to: '/officer/tenders/new' },
  { label: 'Submission open', value: '5', hint: 'Bids sealed in sovereign vault', icon: 'lock_clock', tone: 'success', action: 'Monitor intake', to: '/officer/bids' },
  { label: 'Under evaluation', value: '2', hint: 'Ready for committee scoring', icon: 'rate_review', tone: 'warning', action: 'View assessment logs', to: '/officer/bids' },
];

const ACTIONS: { icon: string; tone: 'info' | 'warning' | 'danger'; kind: string; ref: string; stage: string; stageTone: 'info' | 'warning' | 'danger'; title: string; body: string; cta: string; to: string }[] = [
  {
    icon: 'assignment_late',
    tone: 'info',
    kind: 'Tender publication awaiting review',
    ref: 'CPCL/PROC/2026/044',
    stage: 'Draft · ready for review',
    stageTone: 'info',
    title: 'Industrial Safety Equipment Procurement (Turnkey Delivery)',
    body: 'Specifications drafted by Materials Management; verify eligibility criteria before gazette publication and NIC portal release.',
    cta: 'Review tender',
    to: '/officer/tenders',
  },
  {
    icon: 'fact_check',
    tone: 'info',
    kind: 'Bids awaiting officer review',
    ref: 'CPCL/PROC/2026/041',
    stage: 'Submission closed · evaluation',
    stageTone: 'info',
    title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
    body: '8 bids vaulted; 3 automated format validations need human-in-the-loop sign-off before the Technical Evaluation Committee meets.',
    cta: 'Review bids',
    to: '/officer/bids?tender=CPCL-PROC-2026-041',
  },
  {
    icon: 'warning',
    tone: 'danger',
    kind: 'Verification conflict detected',
    ref: 'BID-2026-00411',
    stage: 'Data conflict flagged',
    stageTone: 'danger',
    title: 'Industrial Network Security Equipment · ABC Telecom Integrators Pvt Ltd',
    body: 'GST legal name in the GSTN master directory does not match the submitted Certificate of Incorporation. Clarification or show-cause notice required (CVC rule 4.3).',
    cta: 'Review finding',
    to: '/officer/verification',
  },
  {
    icon: 'timer',
    tone: 'warning',
    kind: 'Tender closing soon',
    ref: 'CPCL/PROC/2026/035',
    stage: 'Closes 02 Oct · 17:00 IST (3h 15m)',
    stageTone: 'warning',
    title: 'Industrial Safety Monitoring & Gas Detection Sensor Array',
    body: '6 bids received and vaulted. Unsealing needs DSC validation from both the primary officer and the finance vigilance member.',
    cta: 'Manage tender',
    to: '/officer/tenders',
  },
];

type TenderStatus = 'open' | 'draft' | 'closing' | 'evaluation' | 'closed';

const TENDERS: { title: string; ref: string; category: string; status: TenderStatus; bids: string; vault?: string; deadline: string; deadlineNote: string; activity: string; cta: string }[] = [
  { title: 'Supply of CCTV Cameras for Public Safety Infrastructure', ref: 'CPCL/PROC/2026/041', category: 'Equipment / Surveillance', status: 'open', bids: '8 bids received', vault: 'Sealed in vault', deadline: '04 Oct 2026, 17:00', deadlineNote: '2 days remaining', activity: 'Document intake validated · 10m ago', cta: 'Manage' },
  { title: 'Industrial Network Security Equipment', ref: 'CPCL/PROC/2026/039', category: 'Telecom / IT infrastructure', status: 'open', bids: '5 bids received', vault: 'Sealed in vault', deadline: '08 Oct 2026, 15:00', deadlineNote: '6 days remaining', activity: 'Addendum #01 issued · 2 days ago', cta: 'Manage' },
  { title: 'Control Room Display Systems', ref: 'CPCL/PROC/2026/037', category: 'Instrumentation & controls', status: 'draft', bids: '—', deadline: '12 Oct 2026, 12:00', deadlineNote: 'Target publication', activity: 'Draft updated by officer · today', cta: 'Continue' },
  { title: 'Industrial Safety Monitoring & Gas Detection Sensor Array', ref: 'CPCL/PROC/2026/035', category: 'Refinery safety hardware', status: 'closing', bids: '6 bids received', vault: 'Dual-key scheduled', deadline: '02 Oct 2026, 17:00', deadlineNote: '3h 15m remaining', activity: 'Bid intake sealed · 1h ago', cta: 'Manage' },
  { title: 'AMC Heavy-Duty Gas Turbine Generators', ref: 'CPCL/PROC/2026/033', category: 'Mechanical maintenance', status: 'evaluation', bids: '7 bids unsealed', vault: 'Committee evaluation', deadline: 'Closed 30 Sep', deadlineNote: 'Evaluation day 2 of 5', activity: 'Technical scoring in progress', cta: 'Review' },
];

const STATUS_BADGE: Record<TenderStatus, { status: Status; label: string }> = {
  open: { status: 'open', label: 'Submission open' },
  draft: { status: 'draft', label: 'Draft' },
  closing: { status: 'closing-soon', label: 'Closing soon' },
  evaluation: { status: 'under-evaluation', label: 'Under evaluation' },
  closed: { status: 'closed', label: 'Closed' },
};

type TabId = 'all' | 'open' | 'evaluation' | 'draft' | 'closed';

const PIPELINE = [
  { label: 'Draft', value: 3 },
  { label: 'Review', value: 1 },
  { label: 'Published', value: 1 },
  { label: 'Sub. open', value: 5 },
  { label: 'Sub. closed', value: 0 },
  { label: 'Evaluation', value: 2 },
  { label: 'Completed', value: 7 },
];

const AUDIT = [
  { time: '10:42', text: 'Tender requirements updated', ref: 'CPCL/PROC/2026/044', actor: 'Officer' },
  { time: '10:31', text: 'Bid assessment generated', ref: 'BID-2026-00418', actor: 'System' },
  { time: '10:18', text: 'Verification conflict detected', ref: 'CPCL/PROC/2026/039', actor: 'System' },
  { time: '09:56', text: 'Tender submission window closed', ref: 'CPCL/PROC/2026/033', actor: 'System' },
  { time: '09:41', text: 'Tender document uploaded', ref: 'CPCL/PROC/2026/044', actor: 'Officer' },
];

const ICON_CHIP = {
  info: 'bg-info-container text-secondary',
  warning: 'bg-warning-container text-warning-on-container',
  danger: 'bg-danger-container text-danger',
};

export function OfficerDashboardPage() {
  const [zeroQueue, setZeroQueue] = useState(false);
  const [tab, setTab] = useState<TabId>('all');

  const rows = useMemo(() => {
    if (tab === 'all') return TENDERS;
    if (tab === 'open') return TENDERS.filter((t) => t.status === 'open' || t.status === 'closing');
    return TENDERS.filter((t) => t.status === tab);
  }, [tab]);

  const maxPipeline = Math.max(...PIPELINE.map((p) => p.value));

  return (
    <OfficerPortalShell>
      <div className="flex flex-col gap-10">
        <PageHeader
          eyebrow={
            <>
              <StatusBadge tone="info" icon="shield_person">
                Authorized procurement desk
              </StatusBadge>
              <StatusBadge status="verified">CVC guidelines 2024</StatusBadge>
            </>
          }
          title="Good morning, Procurement Officer"
          description="Manage tenders, monitor sealed bid intake and review statutory procurement governance from your workspace."
          meta={
            <>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="badge" size="sm" /> <span className="font-mono text-on-surface">CPCL-OFF-4092</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="factory" size="sm" /> Manali Refinery Directorate (Refinery-III)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="lock" size="sm" className="text-success" /> Session secured · TLS 1.3 / DSC L3
              </span>
            </>
          }
          actions={
            <>
              <Button variant="secondary" leftIcon="tune" onClick={() => setZeroQueue((z) => !z)}>
                {zeroQueue ? 'Restore 4 items' : 'Simulate zero-queue'}
              </Button>
              <Button variant="secondary" leftIcon="download">
                Export summary
              </Button>
              <Button leftIcon="add" to="/officer/tenders/new">Create tender</Button>
            </>
          }
        />

        {/* KPIs */}
        <section aria-label="Summary" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((k) => (
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
                {k.action}
              </Button>
            </Card>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          <div className="flex flex-col gap-6 xl:col-span-8">
            {/* Action queue */}
            <Card padding="lg">
              <CardHeader
                icon="pending_actions"
                title="Action required"
                description="Tasks needing officer review, dual sign-off or statutory approval."
                actions={zeroQueue ? <StatusBadge status="verified">0 pending</StatusBadge> : <StatusBadge tone="warning">4 pending</StatusBadge>}
              />
              {zeroQueue ? (
                <EmptyState
                  tone="success"
                  icon="task_alt"
                  title="You're all caught up"
                  description="No pending statutory reviews, compliance checks or tender expiries need your action right now."
                  className="!py-10"
                >
                  <p className="text-[12px] text-outline">Last queue check today at 13:45 IST · CVC queue heartbeat active</p>
                </EmptyState>
              ) : (
                <ul className="flex flex-col gap-4">
                  {ACTIONS.map((a) => (
                    <li key={a.ref} className={cn('flex flex-col gap-4 rounded-card border p-5 sm:flex-row sm:items-start', a.tone === 'danger' ? 'border-danger-border bg-danger-container/30' : 'border-outline-variant/80 bg-surface-container-lowest')}>
                      <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control', ICON_CHIP[a.tone])}>
                        <Icon name={a.icon} size="lg" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-on-surface-variant">
                          <span className="font-semibold uppercase tracking-[0.05em]">{a.kind}</span>
                          <Tag mono>{a.ref}</Tag>
                        </div>
                        <h3 className="mt-1.5 text-[15.5px] font-semibold leading-snug text-on-surface">{a.title}</h3>
                        <p className="mt-1 text-body-sm text-on-surface-variant">{a.body}</p>
                        <div className="mt-3">
                          <StatusBadge tone={a.stageTone}>{a.stage}</StatusBadge>
                        </div>
                      </div>
                      <Button size="sm" variant={a.tone === 'danger' ? 'danger' : 'secondary'} rightIcon="arrow_forward" className="shrink-0 self-start" to={a.to}>
                        {a.cta}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* My tenders */}
            <Card padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
                <div>
                  <h2 className="text-headline-md text-on-surface">My tenders</h2>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">Active, draft and in-evaluation files assigned to your desk.</p>
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
                    { id: 'all', label: 'All', count: 12 },
                    { id: 'open', label: 'Submission open', count: 5 },
                    { id: 'evaluation', label: 'Under evaluation', count: 2 },
                    { id: 'draft', label: 'Drafts', count: 3 },
                    { id: 'closed', label: 'Closed', count: 2 },
                  ]}
                />
              </div>
              {rows.length > 0 ? (
                <Table minWidth={760}>
                  <THead>
                    <tr>
                      <Th className="pl-6">Tender</Th>
                      <Th>Status</Th>
                      <Th>Bids</Th>
                      <Th>Deadline</Th>
                      <Th align="right" className="pr-6">
                        <span className="sr-only">Actions</span>
                      </Th>
                    </tr>
                  </THead>
                  <TBody>
                    {rows.map((t) => (
                      <Tr key={t.ref}>
                        <Td className="pl-6 !py-5">
                          <CellStack
                            primary={t.title}
                            secondary={
                              <>
                                <span className="font-mono text-[12px]">{t.ref}</span> · {t.category}
                                <span className="mt-0.5 flex items-center gap-1 text-[12px] text-outline">
                                  <Icon name="history" size="xs" />
                                  {t.activity}
                                </span>
                              </>
                            }
                          />
                        </Td>
                        <Td>
                          <StatusBadge status={STATUS_BADGE[t.status].status}>{STATUS_BADGE[t.status].label}</StatusBadge>
                        </Td>
                        <Td>
                          <CellStack primary={<span className="whitespace-nowrap">{t.bids}</span>} secondary={t.vault && <span className="inline-flex items-center gap-1 whitespace-nowrap"><Icon name="lock" size="xs" className="text-success" />{t.vault}</span>} />
                        </Td>
                        <Td>
                          <CellStack primary={<span className="whitespace-nowrap num">{t.deadline}</span>} secondary={<span className={cn(t.status === 'closing' && 'font-medium text-danger-on-container')}>{t.deadlineNote}</span>} />
                        </Td>
                        <Td align="right" className="pr-6">
                          <Button size="sm" variant={t.status === 'closing' ? 'primary' : 'secondary'} to={t.status === 'draft' ? '/officer/tenders/new' : '/officer/tenders'}>
                            {t.cta}
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <EmptyState icon="folder_off" title="No tenders in this view" description="There are no files in this lifecycle stage on your desk." actions={<Button variant="secondary" onClick={() => setTab('all')}>Show all tenders</Button>} />
              )}
              <div className="border-t border-outline-variant bg-surface-container-low/60 px-6 py-4">
                <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
                  <Icon name="lock" size="sm" className="mt-0.5 text-secondary" />
                  <span>
                    <strong className="font-semibold text-on-surface">Strict CVC sealed-bid protocol.</strong> While a window is open, bidder identities, quotes and technical files stay encrypted on the NIC server. Pre-checks run on blind hashes; decryption keys are released only after the deadline via dual-key officer credentials.
                  </span>
                </p>
              </div>
            </Card>

            {/* Pipeline */}
            <Card padding="lg">
              <CardHeader icon="insights" title="Procurement lifecycle distribution" description="19 assigned records by statutory lifecycle stage" actions={<Tag>9 in flight · 7 completed</Tag>} />
              <div className="grid grid-cols-7 items-end gap-3" style={{ height: 160 }}>
                {PIPELINE.map((p) => (
                  <div key={p.label} className="flex h-full flex-col items-center justify-end gap-2">
                    <span className="text-[13px] font-semibold text-on-surface num">{p.value}</span>
                    <div
                      className={cn('w-full max-w-[44px] rounded-t-md transition-all', p.label === 'Evaluation' ? 'bg-secondary' : p.label === 'Completed' ? 'bg-success/70' : 'bg-secondary/25')}
                      style={{ height: `${Math.max(p.value / maxPipeline, 0.03) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-3 border-t border-outline-variant pt-2">
                {PIPELINE.map((p) => (
                  <span key={p.label} className="truncate text-center text-[11px] font-medium text-on-surface-variant">
                    {p.label}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
                <span>Filter your workspace to files in the evaluation stage.</span>
                <Button size="sm" variant="secondary" leftIcon="filter_list" onClick={() => setTab('evaluation')}>
                  Filter (2 files)
                </Button>
              </div>
            </Card>
          </div>

          <aside className="flex flex-col gap-6 xl:col-span-4">
            <Card>
              <CardHeader icon="gavel" title="Bid reviews summary" className="mb-4" />
              <div className="flex flex-col divide-y divide-outline-variant/70">
                {[
                  { label: 'Pending review', value: '3 bids', sub: 'Human-in-the-loop', tone: 'info' as const },
                  { label: 'Findings', value: '2 conflicts', sub: 'GSTN / PAN mismatch', tone: 'danger' as const },
                  { label: 'Document audits', value: '4 files', sub: 'MSME / EMD verify', tone: 'warning' as const },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="text-[14px] font-medium text-on-surface">{r.label}</div>
                      <div className="text-[12px] text-on-surface-variant">{r.sub}</div>
                    </div>
                    <StatusBadge tone={r.tone}>{r.value}</StatusBadge>
                  </div>
                ))}
              </div>
              <Button variant="brand" fullWidth rightIcon="arrow_forward" className="mt-4" to="/officer/reviews">
                Open review queue
              </Button>
            </Card>

            <Card>
              <CardHeader icon="history_edu" title="Recent audit activity" actions={<Tag>NIC log</Tag>} className="mb-5" />
              <ol className="relative flex flex-col gap-5 pl-6 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-outline-variant">
                {AUDIT.map((a) => (
                  <li key={a.time + a.text} className="relative">
                    <span className={cn('absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-[3px] border-surface-container-lowest', a.actor === 'Officer' ? 'bg-secondary' : 'bg-outline-variant')} aria-hidden="true" />
                    <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                      <span className="num">{a.time}</span>
                      <span>·</span>
                      <span>{a.actor}</span>
                    </div>
                    <div className="mt-0.5 text-[14px] font-medium text-on-surface">{a.text}</div>
                    <div className="font-mono text-[12px] text-on-surface-variant">{a.ref}</div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-outline-variant pt-4">
                <StatusBadge status="verified">SHA-256 digest valid</StatusBadge>
                <Button variant="link" size="sm" rightIcon="arrow_forward" to="/officer/audit">
                  Audit trail
                </Button>
              </div>
            </Card>

            <Callout tone="info" icon="balance" title="Human-in-the-loop">
              AI assists with document understanding and compliance checks. Every disqualification and award decision stays with you.
            </Callout>
          </aside>
        </div>
      </div>
    </OfficerPortalShell>
  );
}
