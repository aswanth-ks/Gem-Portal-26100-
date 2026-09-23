// Enterprise Dashboard page — ported from the Stitch screen
// "CPCL Bidder Portal - Enterprise Dashboard" (project: GeM Portal).
//
// Source of truth: Stitch project 6921642772921774119, screen
// 580e1bf595b940e88a6765985d9e6e8e. Ported as closely as possible to the
// generated HTML/Tailwind markup (Material-style semantic tokens — see
// tailwind.config.ts). This is the authenticated bidder landing page after
// login.
//
// Sidebar/header chrome now comes from the shared BidderPortalShell layout
// (see layouts/BidderPortalShell.tsx) instead of this page's own markup, so
// it stays visually identical to the Tenders/Tender Details pages.
//
// TODO: replace all mock content (metrics, active submission, recent
// submissions table, alerts, activity feed) with data from
// features/dashboard, features/tenders and features/documents via
// services/api once the gateway exposes the relevant endpoints. TODO: wire
// remaining sidebar nav items (My Bids, Documents, Notifications) to real
// routes as their pages are implemented.

import { Link } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';

const METRICS: {
  label: string;
  value: string;
  hint: string;
  icon: string;
  accent: 'default' | 'warning';
  pulse?: boolean;
}[] = [
  { label: 'Open Tenders', value: '18', hint: 'Currently accepting bids', icon: 'folder_open', accent: 'default' },
  { label: 'Submitted', value: '4', hint: 'Active sealed bids', icon: 'verified', accent: 'default' },
  { label: 'Drafts', value: '1', hint: 'Needs completion', icon: 'edit_note', accent: 'default' },
  { label: 'Closing Soon', value: '2', hint: 'Within next 7 days', icon: 'timer', accent: 'warning', pulse: true },
];

const PROGRESS_STEPS = [
  { step: 1, label: 'Tender Details', status: 'Completed', state: 'done' as const },
  { step: 2, label: 'Eligibility Check', status: 'Completed', state: 'done' as const },
  { step: 3, label: 'Mandatory Docs', status: 'Uploading UDIN CA', state: 'active' as const },
  { step: 4, label: 'Technical Bid', status: 'Pending', state: 'pending' as const },
  { step: 5, label: 'Financial BoQ', status: 'Pending', state: 'pending' as const },
  { step: 6, label: 'DSC Sign', status: 'Pending', state: 'locked' as const },
];

const SUBMISSIONS = [
  {
    title: 'Supply of CCTV Cameras (Security Phase I)',
    ref: 'CPCL/PROC/2026/041',
    submissionId: 'BID-2026-00418',
    submittedOn: '02 Oct 2026 · 14:32 IST',
    status: 'Submitted',
    statusIcon: 'check_circle',
    statusClass: 'bg-surface-container-high text-secondary',
    actionLabel: 'View Envelope',
  },
  {
    title: 'Industrial Network Security Equipment (OT Firewall)',
    ref: 'CPCL/PROC/2026/039',
    submissionId: 'BID-2026-00402',
    submittedOn: '28 Sep 2026 · 11:10 IST',
    status: 'Processing',
    statusIcon: 'refresh',
    statusIconSpin: true,
    statusClass: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    actionLabel: 'View Status',
  },
  {
    title: 'Control Room Display Systems (Ultra-High Brightness)',
    ref: 'CPCL/PROC/2026/037',
    submissionId: 'BID-2026-00391',
    submittedOn: '20 Sep 2026 · 09:42 IST',
    status: 'Draft (11/14)',
    statusIcon: 'draft',
    statusClass: 'bg-tertiary-fixed text-on-tertiary-container',
    actionLabel: 'Continue',
  },
];

const VAULT_STAGES = [
  { label: '01. Submitted', meta: '02 Oct, 14:32 IST', sub: 'Digital Timestamped', state: 'done' as const },
  { label: '02. Documents', meta: 'OCR & PAN/GSTIN', sub: 'Automated Match', state: 'done' as const },
  { label: '03. Matrix Stored', meta: 'Deterministic Proof', sub: 'Compliance Logged', state: 'done' as const },
  { label: '04. Sealed Vault', meta: '2048-bit AES Encr.', sub: 'Tamper-Proof Block', state: 'done' as const },
  { label: '05. Locked State', meta: 'Inactive to Officers', sub: 'Opens 04 Oct 17:00', state: 'locked' as const },
];

const QUICK_ACTIONS = [
  { icon: 'travel_explore', label: 'Search Public Tenders', to: '/tenders' },
  { icon: 'mark_email_read', label: 'View My Bid Envelopes' },
  { icon: 'vpn_key', label: 'Manage DSC & Certificates' },
  { icon: 'feed', label: 'Check Corrigenda & Notices', badge: 'New' },
];

const ALERTS = [
  {
    icon: 'warning',
    tone: 'warning' as const,
    label: 'Closing Soon',
    body: (
      <>
        Tender <strong>CPCL/PROC/2026/041</strong> closes in 48 hours. Ensure your Class-3 DSC USB token is inserted
        for final signing.
      </>
    ),
  },
  {
    icon: 'info',
    tone: 'secondary' as const,
    label: 'Action Required',
    body: (
      <>
        Complete draft submission <strong>BID-2026-00391</strong> (Control Room Displays) before 12 Oct 2026 to
        prevent auto-cancellation.
      </>
    ),
  },
];

const ACTIVITY_FEED = [
  {
    time: 'Today · 14:34 IST',
    text: 'Automated document verification completed',
    sub: '14/14 statutory credentials valid',
    live: true,
  },
  {
    time: 'Today · 14:32 IST',
    text: 'Bid submitted: Supply of CCTV Cameras',
    sub: 'Envelope BID-2026-00418 sealed',
    live: true,
  },
  {
    time: '28 Sep · 11:10 IST',
    text: 'Bid submitted: OT Firewall & IPS',
    sub: 'Envelope BID-2026-00402',
    live: false,
  },
  {
    time: '20 Sep · 09:42 IST',
    text: 'Draft initiated: Control Room Display',
    sub: 'BoQ template exported',
    live: false,
  },
];

export function DashboardPage() {
  return (
    <BidderPortalShell>
      <div className="px-space-lg py-space-lg">
          <div className="flex flex-col w-full">
            {/* Welcome & Context Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-space-lg gap-space-md">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-space-xs">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Good morning, ABC Engineering</h1>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">
                    Class-3 DSC
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Here&apos;s an authoritative overview of your bidding activity, sealed crypt-vault status, and pending submissions.
                </p>
              </div>
              <div className="flex items-center gap-space-sm flex-shrink-0">
                <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest text-on-surface font-label-lg text-label-lg rounded-xl shadow-xs hover:bg-surface-container-low transition-colors" type="button">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">download</span>
                  <span>Download Activity Log</span>
                </button>
                <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-secondary text-on-secondary font-label-lg text-label-lg rounded-xl shadow-sm hover:bg-secondary-container transition-all" type="button">
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>New Bid Submission</span>
                </button>
              </div>
            </div>

            {/* Primary Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg">
              {METRICS.map((metric) => (
                <div
                  key={metric.label}
                  className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs flex items-center justify-between transition-all hover:shadow-sm"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{metric.label}</span>
                      {metric.pulse && <span className="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse"></span>}
                    </div>
                    <span className="font-display-lg-mobile text-display-lg-mobile text-on-surface font-bold mt-1">{metric.value}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{metric.hint}</span>
                  </div>
                  <div
                    className={
                      'w-10 h-10 rounded-xl flex items-center justify-center ' +
                      (metric.accent === 'warning' ? 'bg-tertiary-fixed text-on-tertiary-container' : 'bg-surface-container-low text-secondary')
                    }
                  >
                    <span className="material-symbols-outlined text-[22px]">{metric.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Work Area: 12-Column layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
              {/* LEFT MAIN COLUMN (8 cols) */}
              <div className="xl:col-span-8 flex flex-col gap-space-lg">
                {/* HERO SUBMISSION CARD */}
                <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden transition-all">
                  <div className="h-1.5 bg-gradient-to-r from-secondary via-secondary-container to-secondary-fixed"></div>
                  <div className="p-space-lg">
                    <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm tracking-wide uppercase font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                          In Progress Draft
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">· Ref: CPCL/PROC/2026/041</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[16px]">sync</span>
                        <span>Draft auto-saved 14 mins ago</span>
                      </div>
                    </div>
                    <div className="mb-space-md">
                      <h2 className="font-headline-md text-headline-md text-on-surface">Supply of CCTV Cameras for Public Safety Infrastructure</h2>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-space-md mt-1 text-on-surface-variant font-body-sm text-body-sm">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">factory</span>
                          Division: Manali Refinery Operations
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-error font-medium">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          Submission Deadline: 04 Oct 2026 · 17:00 IST (Closing in 2 days)
                        </span>
                      </div>
                    </div>

                    {/* Multi-Step Progress Tracker */}
                    <div className="bg-surface-container-low/60 rounded-xl p-space-md mb-space-lg">
                      <div className="flex items-center justify-between mb-space-sm">
                        <span className="font-label-lg text-label-lg text-on-surface">Progress Status</span>
                        <span className="font-label-md text-label-md text-secondary font-semibold">3 of 6 steps completed (50%)</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-space-md">
                        <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: '50%' }}></div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                        {PROGRESS_STEPS.map((s) => (
                          <div
                            key={s.step}
                            className={
                              'flex flex-col p-2 rounded ' +
                              (s.state === 'active'
                                ? 'bg-surface-container-lowest shadow-2xs ring-1 ring-secondary'
                                : s.state === 'done'
                                  ? 'bg-surface-container-lowest shadow-2xs'
                                  : 'bg-surface-container-lowest/60 opacity-70')
                            }
                          >
                            <div className={'flex items-center gap-1 mb-1 ' + (s.state === 'pending' || s.state === 'locked' ? 'text-on-surface-variant' : 'text-secondary')}>
                              <span className={'material-symbols-outlined text-[16px]' + (s.state === 'active' ? ' animate-spin' : '')}>
                                {s.state === 'done' ? 'check_circle' : s.state === 'active' ? 'radio_button_checked' : s.state === 'locked' ? 'lock' : 'radio_button_unchecked'}
                              </span>
                              <span className={'font-label-sm text-label-sm ' + (s.state === 'active' ? 'font-bold' : 'font-semibold')}>Step {s.step}</span>
                            </div>
                            <span className={'text-body-sm truncate ' + (s.state === 'active' ? 'font-label-sm text-label-sm text-on-surface font-semibold' : 'font-body-sm text-on-surface font-medium')}>
                              {s.label}
                            </span>
                            <span className={'font-body-sm text-[11px] truncate ' + (s.state === 'active' ? 'text-secondary font-medium' : 'text-on-surface-variant')}>
                              {s.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
                      <div className="flex items-center gap-space-sm">
                        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-on-secondary font-label-lg text-label-lg rounded-xl shadow-xs hover:bg-secondary-container transition-all" type="button">
                          <span>Continue Submission</span>
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                        <button className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-surface-container-low text-on-surface font-label-lg text-label-lg rounded-xl hover:bg-surface-container transition-colors" type="button">
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">description</span>
                          <span>View Specifications</span>
                        </button>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant hidden md:inline">UDIN verification engine connected</span>
                    </div>
                  </div>
                </div>

                {/* RECENT SUBMISSIONS TABLE */}
                <div className="bg-surface-container-lowest rounded-xl shadow-xs overflow-hidden">
                  <div className="px-space-lg py-space-md flex items-center justify-between bg-surface-container-lowest">
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">Recent Submissions</h2>
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                        {SUBMISSIONS.length} Records
                      </span>
                    </div>
                    <a className="font-label-md text-label-md text-secondary hover:underline inline-flex items-center gap-1" href="#">
                      <span>All My Bids</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low/50">
                          <th className="py-3 px-space-lg font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tender</th>
                          <th className="py-3 px-space-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Submission ID</th>
                          <th className="py-3 px-space-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Submitted On</th>
                          <th className="py-3 px-space-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                          <th className="py-3 px-space-lg font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high/40 font-body-md text-body-md">
                        {SUBMISSIONS.map((row) => (
                          <tr key={row.submissionId} className="hover:bg-surface-container-low/40 transition-colors">
                            <td className="py-space-md px-space-lg">
                              <div className="flex flex-col">
                                <span className="font-label-md text-label-md text-on-surface font-semibold">{row.title}</span>
                                <span className="font-body-sm text-body-sm text-on-surface-variant">Ref: {row.ref}</span>
                              </div>
                            </td>
                            <td className="py-space-md px-space-md font-mono text-body-sm text-on-surface">{row.submissionId}</td>
                            <td className="py-space-md px-space-md text-body-sm text-on-surface-variant">{row.submittedOn}</td>
                            <td className="py-space-md px-space-md">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${row.statusClass}`}>
                                <span className={'material-symbols-outlined text-[14px]' + (row.statusIconSpin ? ' animate-spin' : '')}>{row.statusIcon}</span>
                                {row.status}
                              </span>
                            </td>
                            <td className="py-space-md px-space-lg text-right">
                              <a className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary hover:text-secondary-container font-semibold transition-colors" href="#">
                                <span>{row.actionLabel}</span>
                                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SUBMISSION PROCESSING: Vault Lifecycle */}
                <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-lg">
                  <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-md">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">security</span>
                      </div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">Submission Processing Lifecycle &amp; Vault Guarantee</h2>
                    </div>
                    <span className="font-label-sm text-label-sm px-2.5 py-1 rounded bg-surface-container-low text-on-surface-variant font-mono">
                      BID-2026-00418
                    </span>
                  </div>
                  <div className="relative mb-space-lg">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-space-sm relative">
                      {VAULT_STAGES.map((stage) => (
                        <div
                          key={stage.label}
                          className={
                            'p-space-sm rounded-lg flex flex-col gap-1 ' +
                            (stage.state === 'locked' ? 'bg-primary-container text-on-primary shadow-xs' : 'bg-surface-container-low/50')
                          }
                        >
                          <div className="flex items-center justify-between">
                            <span className={'font-label-sm text-label-sm font-semibold ' + (stage.state === 'locked' ? 'text-primary-fixed' : 'text-secondary')}>
                              {stage.label}
                            </span>
                            <span className={'material-symbols-outlined text-[16px] ' + (stage.state === 'locked' ? 'text-secondary-fixed animate-pulse' : 'text-secondary')}>
                              {stage.state === 'locked' ? 'lock' : 'check'}
                            </span>
                          </div>
                          <span className={'text-[11px] ' + (stage.state === 'locked' ? 'text-on-primary-container' : 'text-on-surface-variant')}>{stage.meta}</span>
                          <span className={'font-label-sm text-[11px] font-medium ' + (stage.state === 'locked' ? 'text-primary-fixed' : 'text-on-surface')}>{stage.sub}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col md:flex-row items-start gap-space-md">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-lowest text-secondary flex-shrink-0 flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[24px]">encrypted</span>
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-label-lg text-label-lg text-on-surface font-semibold">Zero-Officer Visibility Active</span>
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-mono">
                          SHA256-8f9b4c02...a104e
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Bid assessments and submitted technical documents are securely encrypted inside the sovereign vault.
                        Internal procurement officers and statutory evaluation committees cannot view your bid documents,
                        compliance scores, or financial envelopes until the public electronic decryption protocol on{' '}
                        <strong>05 Oct 2026</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT CONTEXT SIDEBAR (4 cols) */}
              <div className="xl:col-span-4 flex flex-col gap-space-lg">
                {/* QUICK ACTIONS */}
                <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md">
                  <h2 className="font-label-lg text-label-lg text-on-surface font-semibold mb-space-sm px-1">Quick Actions</h2>
                  <div className="flex flex-col gap-1">
                    {QUICK_ACTIONS.map((action) =>
                      action.to ? (
                        <Link
                          key={action.label}
                          className="flex items-center justify-between p-2.5 rounded-lg text-on-surface hover:bg-surface-container-low transition-colors group"
                          to={action.to}
                        >
                          <div className="flex items-center gap-space-sm">
                            <span className="material-symbols-outlined text-[20px] text-on-surface-variant group-hover:text-secondary transition-colors">{action.icon}</span>
                            <span className="font-label-md text-label-md">{action.label}</span>
                          </div>
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
                        </Link>
                      ) : (
                        <a key={action.label} className="flex items-center justify-between p-2.5 rounded-lg text-on-surface hover:bg-surface-container-low transition-colors group" href="#">
                          <div className="flex items-center gap-space-sm">
                            <span className="material-symbols-outlined text-[20px] text-on-surface-variant group-hover:text-secondary transition-colors">{action.icon}</span>
                            <span className="font-label-md text-label-md">{action.label}</span>
                          </div>
                          {action.badge ? (
                            <span className="font-label-sm text-label-sm px-1.5 py-0.2 rounded bg-tertiary-fixed text-on-tertiary-container font-semibold">{action.badge}</span>
                          ) : (
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
                          )}
                        </a>
                      ),
                    )}
                  </div>
                </div>

                {/* IMPORTANT ALERTS */}
                <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md">
                  <div className="flex items-center justify-between mb-space-sm px-1">
                    <h2 className="font-label-lg text-label-lg text-on-surface font-semibold">Important Alerts</h2>
                    <span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
                  </div>
                  <div className="flex flex-col gap-space-sm">
                    {ALERTS.map((alert) => (
                      <div
                        key={alert.label}
                        className={'p-space-sm rounded-lg bg-surface-container-low border-l-4 ' + (alert.tone === 'warning' ? 'border-l-tertiary-fixed-dim' : 'border-l-secondary')}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={'material-symbols-outlined text-[16px] ' + (alert.tone === 'warning' ? 'text-on-tertiary-container' : 'text-secondary')}>{alert.icon}</span>
                          <span className={'font-label-sm text-label-sm font-semibold uppercase tracking-wide ' + (alert.tone === 'warning' ? 'text-on-tertiary-container' : 'text-secondary')}>
                            {alert.label}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface">{alert.body}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RECENT ACTIVITY TIMELINE */}
                <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md">
                  <h2 className="font-label-lg text-label-lg text-on-surface font-semibold mb-space-md px-1">Recent Activity</h2>
                  <div className="relative pl-5 space-y-space-md before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                    {ACTIVITY_FEED.map((item) => (
                      <div key={item.time + item.text} className="relative">
                        <span className={'absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-surface-container-lowest ' + (item.live ? 'bg-secondary' : 'bg-surface-variant')}></span>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-[11px] text-on-surface-variant">{item.time}</span>
                          <span className="font-body-sm text-body-sm text-on-surface font-medium">{item.text}</span>
                          <span className="font-body-sm text-[11px] text-on-surface-variant">{item.sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NEED HELP? */}
                <div className="bg-surface-container-low rounded-xl p-space-md">
                  <div className="flex items-center gap-space-sm mb-space-xs">
                    <div className="w-8 h-8 rounded bg-surface-container-lowest text-secondary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">contact_support</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">Bidder Help &amp; DSC Diagnostics</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Dedicated e-Proc Support</span>
                    </div>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 mb-space-sm">
                    Technical desk: <strong className="text-on-surface">1800-425-7800</strong> (09:00 - 18:00 IST)
                  </p>
                  <div className="flex flex-col gap-1 pt-space-xs border-t border-surface-container-high/40">
                    <a className="font-label-sm text-label-sm text-secondary hover:underline inline-flex items-center gap-1" href="#">
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      <span>Download Signer Utility v2.4</span>
                    </a>
                    <a className="font-label-sm text-label-sm text-secondary hover:underline inline-flex items-center gap-1" href="#">
                      <span className="material-symbols-outlined text-[14px]">play_circle</span>
                      <span>Step-by-Step Bidding Walkthrough</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </BidderPortalShell>
  );
}
