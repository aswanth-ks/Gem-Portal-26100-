// Bidder Home — public, pre-login entrance to the portal. Ported from Stitch
// screen "CPCL e-Procurement Portal - Bidder Home" (project
// 6921642772921774119, screen 50ec89d921c5415885c3dca23f411bdb) and aligned
// with the shared design system while keeping the government identity cues
// (tricolour strip, ministry bar, statutory footer).
//
// TODO: replace static tenders/notices/counters with features/tenders data
// via services/api once GET /api/tenders exists.

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardHeader, CellStack, Icon, SearchInput, Select, StatusBadge, Table, TBody, Td, Th, THead, Tr, Tabs, Tag } from '@/components/primitives';
import { cn } from '@/utils/cn';
import { PublicFooter, PublicHeader } from './PublicChrome';

const TENDER_ROWS = [
  { tag: 'Goods', subTag: 'Two cover', title: 'Supply of CCTV Cameras for Public Safety Infrastructure', location: 'Manali Refinery perimeter & admin block', refId: 'CPCL/PROC/2026/041', internalId: '2026_CPCL_89210_1', value: '₹42.50 L', emd: '₹85,000', deadlineDate: '04 Oct 2026', daysLeft: '5 days left', deadlineTime: '17:00 IST', urgent: true },
  { tag: 'IT hardware', subTag: 'ICB', title: 'Industrial Network Security & Firewall Equipment', location: 'Next-gen OT firewalls & IPS modules', refId: 'CPCL/PROC/2026/039', internalId: '2026_CPCL_88942_1', value: '₹78.00 L', emd: '₹1,56,000', deadlineDate: '08 Oct 2026', daysLeft: '9 days left', deadlineTime: '15:00 IST', urgent: true },
  { tag: 'Goods', subTag: 'Domestic', title: 'Supply of Control Room Displays & Video Wall Units', location: 'Ultra-high brightness 4K panels, central operations', refId: 'CPCL/PROC/2026/037', internalId: '2026_CPCL_87611_1', value: '₹29.80 L', emd: '₹60,000', deadlineDate: '12 Oct 2026', daysLeft: null, deadlineTime: '12:00 IST', urgent: false },
  { tag: 'Services', subTag: 'AMC', title: 'Annual Maintenance Contract for Gas Turbine Generators', location: 'Captive Power Plant (CPP-II) overhaul support', refId: 'CPCL/PROC/2026/035', internalId: '2026_CPCL_86500_1', value: '₹115.00 L', emd: '₹2,30,000', deadlineDate: '15 Oct 2026', daysLeft: null, deadlineTime: '16:30 IST', urgent: false },
  { tag: 'Works', subTag: 'Turnkey', title: 'Revamping of Effluent Treatment Plant Online Instrumentation', location: 'Supply, erection & commissioning of analyzers', refId: 'CPCL/PROC/2026/031', internalId: '2026_CPCL_85412_1', value: '₹64.20 L', emd: '₹1,28,400', deadlineDate: '18 Oct 2026', daysLeft: null, deadlineTime: '14:00 IST', urgent: false },
];

const GUIDELINE_LINKS = [
  { label: 'DSC PKI signing utility (v2.4 Win/Linux)', icon: 'terminal', trailingIcon: 'download' },
  { label: 'Hassle-free bid submission SOP', icon: 'description', trailingIcon: 'download' },
  { label: 'Bidder manual & step-by-step video', icon: 'smart_display', trailingIcon: 'open_in_new' },
  { label: 'JRE compatibility & browser prerequisites', icon: 'memory', trailingIcon: 'download' },
  { label: 'Frequently asked questions', icon: 'quiz', trailingIcon: 'chevron_right' },
];

const NOTICES: { date: string; tag: string; tone: 'danger' | 'warning' | 'neutral'; title: string; description: string }[] = [
  { date: '23 Sep 2026', tag: 'Corrigendum', tone: 'danger', title: 'Pre-bid clarification for tender CPCL/PROC/2026/041', description: 'Revised technical compliance sheet uploaded for camera sensor specs.' },
  { date: '22 Sep 2026', tag: 'Advisory', tone: 'warning', title: 'Mandatory UDIN verification for CA certificates', description: 'Applies to all financial turnover submissions from 01 Oct 2026.' },
  { date: '20 Sep 2026', tag: 'System', tone: 'neutral', title: 'Scheduled NIC maintenance (Sunday 02:00–06:00 IST)', description: 'Database synchronization & CCA root certificate upgrades.' },
];

const QUICK_ACTIONS: { icon: string; title: string; sub: string; cta: string; to?: string; primary?: boolean }[] = [
  { icon: 'person_add', title: 'Online bidder enrollment', sub: 'Register company & Class-3 DSC', cta: 'Enroll' },
  { icon: 'login', title: 'Bidder portal login', sub: 'Access live bids & submissions', cta: 'Login', to: '/login', primary: true },
  { icon: 'admin_panel_settings', title: 'Procurement officer login', sub: 'CPCL internal evaluation workspace', cta: 'Sign in', to: '/officer/login' },
  { icon: 'lock_reset', title: 'Generate / reset token PIN', sub: 'DSC authentication recovery', cta: 'Reset' },
  { icon: 'contact_phone', title: 'Find nodal officer', sub: 'Division contact directory', cta: 'Search' },
];

const WORKFLOW = [
  { n: 1, title: 'Enroll & map DSC', sub: 'Register with a Class-3 token', icon: 'how_to_reg' },
  { n: 2, title: 'Download specifications', sub: 'NIT, BoQ & drawings', icon: 'download' },
  { n: 3, title: 'Encrypted bid submission', sub: 'Dual-key locked until opening', icon: 'lock' },
];

type TabId = 'active' | 'closing' | 'closed' | 'corrigenda';

function SideCard({ icon, title, badge, children, footer }: { icon: string; title: string; badge?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader icon={icon} title={title} actions={badge} className="mb-4" />
      </div>
      <div className="px-5 pb-5">{children}</div>
      {footer && <div className="border-t border-outline-variant bg-surface-container-low/60 px-5 py-3">{footer}</div>}
    </Card>
  );
}

export function HomePage() {
  const [tab, setTab] = useState<TabId>('active');

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-on-surface">
      <PublicHeader active="home" />

      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden bg-navy text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" aria-hidden="true" />
          <div className="relative mx-auto grid w-full max-w-page grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-10 lg:py-16">
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-[12px] font-medium text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-saffron" aria-hidden="true" />
                  Government of India enterprise · Ministry of Petroleum & Natural Gas
                </span>
              </div>
              <h1 className="text-display-lg-mobile sm:text-display-lg text-white">
                Transparent, secure procurement for <span className="text-saffron">CPCL</span> tenders.
              </h1>
              <p className="max-w-xl text-body-lg text-white/70">
                Discover open tenders, prepare compliant bids and submit them into a cryptographically sealed vault — with evidence-linked verification at every step.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="saffron" size="lg" to="/login" leftIcon="vpn_key">
                  Bidder / DSC login
                </Button>
                <Button size="lg" variant="ghost" className="!text-white hover:!bg-white/10" rightIcon="arrow_forward" to="/tenders">
                  Explore active tenders
                </Button>
              </div>
              <Link to="/officer/login" className="focus-ring inline-flex w-fit items-center gap-2 rounded text-body-sm text-white/70 hover:text-white">
                <Icon name="admin_panel_settings" size="md" className="text-saffron" />
                CPCL procurement officer? <span className="font-semibold underline underline-offset-4">Sign in to Procurement Intelligence</span>
              </Link>
              <div className="mt-2 flex flex-wrap gap-x-8 gap-y-3 text-body-sm text-white/65">
                {[
                  ['verified_user', 'STQC certified'],
                  ['enhanced_encryption', '2048-bit PKI'],
                  ['accessible', 'GIGW 3.0 compliant'],
                ].map(([icon, label]) => (
                  <span key={label} className="inline-flex items-center gap-2">
                    <Icon name={icon} size="md" className="text-saffron" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-panel border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60">E-procurement workflow</div>
                <ol className="mt-5 flex flex-col gap-4">
                  {WORKFLOW.map((w) => (
                    <li key={w.n} className="flex items-center gap-4 rounded-card border border-white/10 bg-navy-900/40 p-4">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-white/10 text-saffron">
                        <Icon name={w.icon} size="lg" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold text-white">{w.title}</div>
                        <div className="text-body-sm text-white/60">{w.sub}</div>
                      </div>
                      <span className="text-[13px] font-semibold text-white/40 num">0{w.n}</span>
                    </li>
                  ))}
                </ol>
                <Button variant="link" size="sm" className="mt-4 !text-saffron" rightIcon="arrow_forward">
                  Read the bidder manual
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Advisory strip */}
        <div className="border-b border-warning-border bg-warning-container">
          <div className="mx-auto flex w-full max-w-page items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-10">
            <StatusBadge tone="warning" icon="campaign">
              Advisory
            </StatusBadge>
            <p className="truncate text-body-sm text-warning-on-container">
              Class-3 DSC must be registered 48 hrs before submission · MSE/MSME bidders must enter valid Udyam numbers · Toll-free assistance <strong className="num">1800-425-7800</strong> (Mon–Sat 09:00–18:00 IST)
            </p>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-page grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-10 lg:py-12">
          {/* MAIN */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* Search */}
            <Card padding="lg">
              <CardHeader
                icon="manage_search"
                title="Search public tenders"
                description="Filter by tender ID, keyword, division or procurement classification."
                actions={
                  <Button variant="ghost" size="sm" leftIcon="tune">
                    Advanced
                  </Button>
                }
              />
              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <SearchInput placeholder="e.g. CPCL/PROC/2026/041 or CCTV" aria-label="Tender keyword or reference" shortcut={false} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-semibold text-on-surface-variant">Refinery / division</span>
                    <Select size="sm" defaultValue="">
                      <option value="">All divisions & plants</option>
                      <option value="manali">Manali Refinery – Chennai</option>
                      <option value="cauvery">Cauvery Basin Refinery (CBR)</option>
                      <option value="corporate">Corporate Office – Teynampet</option>
                      <option value="expansion">9 MMTPA Expansion Complex</option>
                    </Select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-semibold text-on-surface-variant">Category</span>
                    <Select size="sm" defaultValue="">
                      <option value="">All categories</option>
                      <option value="goods">Goods & supply</option>
                      <option value="works">Works contracts</option>
                      <option value="services">Services & AMC</option>
                      <option value="it">IT & automation</option>
                    </Select>
                  </label>
                  <div className="flex items-end">
                    <Button type="submit" variant="brand" fullWidth leftIcon="search" className="!h-9">
                      Search tenders
                    </Button>
                  </div>
                </div>
              </form>
            </Card>

            {/* Tenders table */}
            <Card padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-5">
                <Tabs
                  ariaLabel="Tender list"
                  value={tab}
                  onChange={setTab}
                  className="!border-b-0"
                  items={[
                    { id: 'active', label: 'Active', count: 24 },
                    { id: 'closing', label: 'Closing soon', count: 5, countTone: 'warning' },
                    { id: 'closed', label: 'Recently closed', count: 82 },
                    { id: 'corrigenda', label: 'Corrigenda', count: 12 },
                  ]}
                />
                <div className="mb-2 hidden items-center gap-1 sm:flex">
                  <Button variant="ghost" size="sm" leftIcon="table_view" aria-label="Export as Excel">
                    Excel
                  </Button>
                  <Button variant="ghost" size="sm" leftIcon="picture_as_pdf" aria-label="Export as PDF">
                    PDF
                  </Button>
                </div>
              </div>
              <div className="border-t border-outline-variant" />
              <Table minWidth={900}>
                <THead>
                  <tr>
                    <Th className="pl-6">Tender</Th>
                    <Th>Reference</Th>
                    <Th align="right">Value / EMD</Th>
                    <Th>Deadline</Th>
                    <Th align="right" className="pr-6">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {TENDER_ROWS.map((row) => (
                    <Tr key={row.refId}>
                      <Td className="pl-6 !py-5 max-w-sm">
                        <div className="mb-1.5 flex flex-wrap gap-1.5">
                          <Tag>{row.tag}</Tag>
                          <Tag>{row.subTag}</Tag>
                        </div>
                        <Link to="/login" className="focus-ring rounded font-semibold leading-snug text-on-surface hover:text-secondary">
                          {row.title}
                        </Link>
                        <div className="mt-0.5 text-body-sm text-on-surface-variant">{row.location}</div>
                      </Td>
                      <Td>
                        <CellStack primary={<span className="font-mono text-[12.5px]">{row.refId}</span>} secondary={<span className="font-mono text-[11.5px]">{row.internalId}</span>} />
                      </Td>
                      <Td align="right">
                        <CellStack primary={<span className="num">{row.value}</span>} secondary={<span className="num">EMD {row.emd}</span>} />
                      </Td>
                      <Td>
                        <div className="flex flex-col items-start gap-1">
                          <span className={cn('font-medium num whitespace-nowrap', row.urgent ? 'text-danger-on-container' : 'text-on-surface')}>
                            {row.deadlineDate} · {row.deadlineTime}
                          </span>
                          {row.daysLeft ? <StatusBadge status="closing-soon">{row.daysLeft}</StatusBadge> : <StatusBadge status="open" />}
                        </div>
                      </Td>
                      <Td align="right" className="pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="secondary" to="/login">
                            Details
                          </Button>
                          <Button size="sm" variant="ghost" leftIcon="download" aria-label="Download NIT documents" className="!px-2" />
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
              <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface-container-low/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-body-sm text-on-surface-variant">
                  Showing <strong className="text-on-surface">1–5</strong> of <strong className="text-on-surface">24</strong> active listings · CVC reverse-chronological order
                </span>
                <Button variant="link" size="sm" rightIcon="arrow_forward" to="/tenders">
                  View full directory
                </Button>
              </div>
            </Card>

            {/* Trust panels */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card padding="lg" className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <StatusBadge tone="info" icon="fact_check">
                    Automated verification
                  </StatusBadge>
                </div>
                <div>
                  <h3 className="text-headline-sm text-on-surface">Statutory bid compliance checks</h3>
                  <p className="mt-1 text-body-sm text-on-surface-variant">Uploaded bids are checked against statutory qualification benchmarks before tender opening.</p>
                </div>
                <ul className="flex flex-col gap-2.5 text-body-sm text-on-surface">
                  <li className="flex gap-2.5">
                    <Icon name="check_circle" size="md" fill className="text-success" />
                    GSTIN, PAN and Udyam status verified via government API gateways.
                  </li>
                  <li className="flex gap-2.5">
                    <Icon name="check_circle" size="md" fill className="text-success" />
                    Integrity validation of EMD proof, bank guarantees & BoQ templates.
                  </li>
                </ul>
                <div className="mt-auto flex items-center gap-2 border-t border-outline-variant pt-3 text-[12px] text-on-surface-variant">
                  <Icon name="gavel" size="sm" className="text-secondary" />
                  Conforms to Central Vigilance Commission directives
                </div>
              </Card>
              <Card padding="lg" className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <StatusBadge tone="success" icon="lock">
                    PKI vault security
                  </StatusBadge>
                </div>
                <div>
                  <h3 className="text-headline-sm text-on-surface">Dual-key cryptographic storage</h3>
                  <p className="mt-1 text-body-sm text-on-surface-variant">Bids stay locked in tamper-proof vaults from upload until the statutory opening hour.</p>
                </div>
                <div className="rounded-control border border-outline-variant/70 bg-surface-container-low p-3 text-body-sm">
                  <div className="flex items-center gap-2 font-semibold text-on-surface">
                    <Icon name="shield" size="sm" className="text-secondary" />
                    Zero officer visibility before schedule
                  </div>
                  <p className="mt-1 text-on-surface-variant">Covers cannot be decrypted by any official before dual-key authorization by the opening committee.</p>
                </div>
                <div className="mt-auto flex items-center gap-2 border-t border-outline-variant pt-3 text-[12px] text-on-surface-variant">
                  <Icon name="verified" size="sm" className="text-success" />
                  SHA-256 checksums logged in immutable audit logs
                </div>
              </Card>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="flex flex-col gap-6 lg:col-span-4">
            <SideCard icon="badge" title="Bidder quick actions">
              <div className="-mx-1 flex flex-col gap-1">
                {QUICK_ACTIONS.map((a) => (
                  <div key={a.title} className={cn('flex items-center gap-3 rounded-control px-1 py-2.5', a.primary && 'bg-info-container/50 -mx-0 px-2')}>
                    <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control', a.primary ? 'bg-secondary text-white' : 'bg-surface-container-low text-on-surface-variant')}>
                      <Icon name={a.icon} size="md" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-on-surface">{a.title}</div>
                      <div className="text-[12px] text-on-surface-variant">{a.sub}</div>
                    </div>
                    {a.to ? (
                      <Button size="sm" to={a.to}>
                        {a.cta}
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary">
                        {a.cta}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </SideCard>

            <SideCard icon="support_agent" title="Tender helpdesk" badge={<StatusBadge status="open">Toll-free</StatusBadge>}>
              <div className="rounded-card bg-navy p-4 text-white">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">CPCL central helpdesk</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Icon name="phone_in_talk" size="xl" className="text-saffron" />
                  <span className="text-[22px] font-semibold tracking-tight num">1800-425-7800</span>
                </div>
                <div className="mt-1 text-[12px] text-white/60">Mon–Sat · 09:00–18:00 IST (excl. gazetted holidays)</div>
              </div>
              <div className="mt-4 flex flex-col gap-2 text-body-sm">
                <a className="focus-ring inline-flex items-center gap-2 rounded text-secondary hover:underline" href="mailto:eproc-support@cpcl.co.in">
                  <Icon name="mail" size="sm" />
                  <span className="font-mono text-[13px]">eproc-support@cpcl.co.in</span>
                </a>
                <span className="inline-flex items-center gap-2 text-on-surface-variant">
                  <Icon name="call" size="sm" className="text-secondary" />
                  <span className="font-mono text-[13px] text-on-surface">+91 44 2594 4000</span>
                </span>
              </div>
            </SideCard>

            <SideCard icon="folder_special" title="Guidelines & utilities">
              <div className="-mx-2 flex flex-col">
                {GUIDELINE_LINKS.map((item) => (
                  <a key={item.label} href="#" className="focus-ring group flex items-center gap-3 rounded-control px-2 py-2.5 text-[14px] text-on-surface transition-colors hover:bg-surface-container-low hover:text-secondary">
                    <Icon name={item.icon} size="md" className="text-secondary" />
                    <span className="flex-1">{item.label}</span>
                    <Icon name={item.trailingIcon} size="sm" className="text-outline group-hover:text-secondary" />
                  </a>
                ))}
              </div>
            </SideCard>

            <SideCard
              icon="notifications_active"
              title="Notices & corrigenda"
              badge={<StatusBadge tone="danger">Live</StatusBadge>}
              footer={
                <Button variant="link" size="sm" rightIcon="arrow_forward">
                  All notices & circulars (48)
                </Button>
              }
            >
              <div className="flex flex-col gap-3">
                {NOTICES.map((n) => (
                  <a key={n.title} href="#" className="focus-ring group flex flex-col gap-1.5 rounded-card border border-outline-variant/70 p-3.5 transition-colors hover:border-outline/40 hover:bg-surface-container-low">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-on-surface-variant num">{n.date}</span>
                      <StatusBadge tone={n.tone}>{n.tag}</StatusBadge>
                    </div>
                    <span className="text-[14px] font-semibold leading-snug text-on-surface group-hover:text-secondary">{n.title}</span>
                    <span className="text-[12.5px] text-on-surface-variant">{n.description}</span>
                  </a>
                ))}
              </div>
            </SideCard>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
