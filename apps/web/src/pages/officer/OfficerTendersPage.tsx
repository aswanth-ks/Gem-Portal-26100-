// Procurement Officer — Tender Management. Ported from Stitch screen "O03 —
// Procurement Officer Tender Management" (project 6921642772921774119,
// screen 5b3b0740c3374b1388fcd1effdcc73c2) on the shared OfficerPortalShell
// and design-system primitives.
//
// Stage tabs, search, type/category filters, pagination size, the "Create
// tender" modal and the "Workflow preview" modal are React state.
//
// TODO: GET /api/officer/tenders + POST draft creation once the gateway
// exposes them; "Proceed" routes to O04 (/officer/tenders/new).

import { useMemo, useState } from 'react';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import {
  Button,
  Callout,
  Card,
  CellStack,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
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

type Stage = 'draft' | 'review' | 'published' | 'open' | 'closed' | 'evaluation' | 'completed';
type StageTab = 'all' | Stage;

const STAGE_TABS: { id: StageTab; label: string; count: number }[] = [
  { id: 'all', label: 'All tenders', count: 19 },
  { id: 'draft', label: 'Drafts', count: 3 },
  { id: 'review', label: 'Under review', count: 1 },
  { id: 'published', label: 'Published', count: 1 },
  { id: 'open', label: 'Submission open', count: 5 },
  { id: 'closed', label: 'Submission closed', count: 0 },
  { id: 'evaluation', label: 'Under evaluation', count: 2 },
  { id: 'completed', label: 'Completed', count: 7 },
];

const STAGE_BADGE: Record<Stage, { status: Status; label: string }> = {
  draft: { status: 'draft', label: 'Draft' },
  review: { status: 'pending', label: 'Under review' },
  published: { status: 'active', label: 'Published' },
  open: { status: 'open', label: 'Submission open' },
  closed: { status: 'closed', label: 'Submission closed' },
  evaluation: { status: 'under-evaluation', label: 'Under evaluation' },
  completed: { status: 'verified', label: 'Completed' },
};

interface TenderRow {
  title: string;
  category: string;
  unit: string;
  ref: string;
  nature: string;
  stage: Stage;
  bids: string;
  bidNote?: string;
  bidIcon?: string;
  deadline: string;
  deadlineNote: string;
  urgent?: boolean;
  updated: string;
  actor: string;
  cta: string;
  ctaIcon: string;
  primary?: boolean;
}

const TENDERS: TenderRow[] = [
  { title: 'Supply of CCTV Cameras for Public Safety Infrastructure', category: 'Surveillance & IT', unit: 'Refinery Unit-I Security Wing', ref: 'CPCL/PROC/2026/041', nature: 'Open national · 2-envelope', stage: 'open', bids: '8 bids recorded', bidNote: 'Sealed in vault', bidIcon: 'lock', deadline: '04 Oct 2026, 17:00', deadlineNote: 'Closing in 48h', urgent: true, updated: '1h ago', actor: 'Arun Kumar (Officer)', cta: 'Manage', ctaIcon: 'arrow_forward', primary: true },
  { title: 'Industrial Network Security Equipment', category: 'Telecom & networks', unit: 'Central OT Security Cell', ref: 'CPCL/PROC/2026/039', nature: 'Limited EOI · single stage', stage: 'open', bids: '5 bids recorded', bidNote: 'Sealed in vault', bidIcon: 'lock', deadline: '08 Oct 2026, 15:00', deadlineNote: 'Window active (12 days)', updated: 'Today', actor: 'System HSM gateway', cta: 'Manage', ctaIcon: 'arrow_forward' },
  { title: 'Industrial Safety Equipment Procurement (Turnkey Delivery)', category: 'Plant safety / turnkey', unit: 'HSE Directorate Manali', ref: 'CPCL/PROC/2026/044', nature: 'Open tender · turnkey EPC', stage: 'review', bids: '—', bidNote: 'Not accepting bids', deadline: 'Pending gazette pub.', deadlineNote: 'Review by CVO required', updated: '3h ago', actor: 'CVO Office Manali', cta: 'Review specs', ctaIcon: 'visibility' },
  { title: 'Control Room Display Systems & Video Wall Matrix', category: 'Instrumentation', unit: 'Refinery-II Central DCS', ref: 'CPCL/PROC/2026/037', nature: 'National competitive (NCB)', stage: 'draft', bids: '—', bidNote: 'Not published', deadline: 'Target 12 Oct 2026', deadlineNote: 'Section 3 of 5 complete', updated: 'Yesterday', actor: 'Arun Kumar (Officer)', cta: 'Continue draft', ctaIcon: 'edit_note' },
  { title: 'Industrial Safety Monitoring & Gas Detection Sensor Array', category: 'Refinery safety', unit: 'Crude Distillation Unit (CDU)', ref: 'CPCL/PROC/2026/035', nature: 'Global tender · ICB', stage: 'open', bids: '6 bids recorded', bidNote: 'Sealed in vault', bidIcon: 'lock', deadline: '02 Oct 2026, 17:00', deadlineNote: 'Closing in 3h', urgent: true, updated: '2h ago', actor: 'System HSM gateway', cta: 'Manage', ctaIcon: 'arrow_forward', primary: true },
  { title: 'AMC Heavy-Duty Gas Turbine Generators (Frame 6B)', category: 'Rotary maintenance', unit: 'Captive Power Plant (CPP)', ref: 'CPCL/PROC/2026/033', nature: 'OEM proprietary (PAC)', stage: 'evaluation', bids: '7 bids unsealed', bidNote: 'Committee evaluation', bidIcon: 'gavel', deadline: 'Window closed', deadlineNote: 'Opened 30 Sep, 10:00', updated: '4h ago', actor: 'TEC committee chair', cta: 'Review bids', ctaIcon: 'balance' },
  { title: 'Revamping ETP Instrumentation & Online Analyzer Systems', category: 'Environmental engg', unit: 'Effluent Treatment Plant', ref: 'CPCL/PROC/2026/030', nature: 'Open national · 2-envelope', stage: 'completed', bids: '12 bids processed', bidNote: 'L1 award dispatched', bidIcon: 'verified', deadline: 'Concluded', deadlineNote: 'PO issued 18 Sep 2026', updated: '18 Sep 2026', actor: 'SAP ERP sync verified', cta: 'View record', ctaIcon: 'description' },
  { title: 'Supply of High-Pressure Seamless Alloy Piping Spools', category: 'Piping & metallurgy', unit: 'Manali Expansion Project', ref: 'TND-DRAFT-2026-0047', nature: 'Unallocated route', stage: 'draft', bids: '—', bidNote: 'Not published', deadline: 'Created today', deadlineNote: 'Section 1 of 5 (info)', updated: '25m ago', actor: 'Arun Kumar (Officer)', cta: 'Continue draft', ctaIcon: 'edit_note' },
];

const TYPES = ['All types', 'Open national competitive (NCB)', 'International competitive (ICB)', 'Limited tender (LTE)', 'Turnkey EPC contract', 'Expression of interest (EOI)'];
const CATEGORIES = ['All categories', 'Equipment & surveillance', 'Telecom & IT infrastructure', 'Rotary & mechanical maintenance', 'Instrumentation & controls', 'Plant safety & detection', 'Piping & metallurgy'];

const WORKFLOW = [
  { title: 'Tender information', body: 'Master specs, classification, timeline calendar and statutory authorities.' },
  { title: 'Eligibility & technical criteria', body: 'Turnover rules, prior refinery experience, CVC mandatory disclosures.' },
  { title: 'Bill of quantities (BoQ)', body: 'Line-item specs, GST rates, delivery schedules and price-matrix rules.' },
  { title: 'Statutory review & vigilance clearance', body: 'Departmental sign-off, CVO gazette compliance, digital token attestation.' },
  { title: 'Publication & cryptographic vaulting', body: 'CPPP sync, e-Gazette issuance and automated HSM sealing of the window.' },
];

export function OfficerTendersPage() {
  const [tab, setTab] = useState<StageTab>('all');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TENDERS.filter((t) => (tab === 'all' || t.stage === tab) && (!q || `${t.title} ${t.ref} ${t.category} ${t.unit}`.toLowerCase().includes(q)));
  }, [tab, query]);

  return (
    <OfficerPortalShell>
      <div className="flex flex-col gap-8">
        <PageHeader
          breadcrumbs={[{ label: 'Officer workspace', to: '/officer/dashboard' }, { label: 'Tenders' }]}
          eyebrow={
            <>
              <StatusBadge tone="info" icon="account_tree">
                Lifecycle management
              </StatusBadge>
              <Tag>Manali Refinery Directorate · Units I–III</Tag>
            </>
          }
          title="Tenders"
          description="Create, manage and monitor authorized procurement tenders across statutory lifecycle stages under CVC and GFR 2017 norms."
          actions={
            <>
              <Button variant="secondary" leftIcon="download">
                Export register
              </Button>
              <Button variant="secondary" leftIcon="account_tree" onClick={() => setWorkflowOpen(true)}>
                Workflow preview
              </Button>
              <Button leftIcon="add" onClick={() => setCreateOpen(true)}>
                Create tender
              </Button>
            </>
          }
        />

        <Card padding="none" className="overflow-hidden">
          <div className="px-5 sm:px-6">
            <Tabs ariaLabel="Lifecycle stage" value={tab} onChange={setTab} items={STAGE_TABS.map((s) => ({ id: s.id, label: s.label, count: s.count }))} />
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-outline-variant bg-surface-container-low/60 px-5 py-4 sm:px-6 md:grid-cols-12 md:items-center">
            <SearchInput size="md" shortcut={false} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, reference or unit…" aria-label="Search tenders" className="md:col-span-5" />
            <div className="md:col-span-2"><Select size="sm" aria-label="Tender type">
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select></div>
            <div className="md:col-span-2"><Select size="sm" aria-label="Category">
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select></div>
            <div className="md:col-span-2"><Select size="sm" aria-label="Sort">
              <option>Deadline (nearest first)</option>
              <option>Created date (newest)</option>
              <option>Estimated value (high → low)</option>
              <option>Reference code</option>
            </Select></div>
            <Button variant="secondary" size="sm" leftIcon="tune" className="md:col-span-1">
              Filters
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant px-5 py-3 text-body-sm sm:px-6">
            <span className="inline-flex items-center gap-2 text-on-surface-variant">
              <Icon name="shield_lock" size="sm" className="text-secondary" />
              <strong className="font-semibold text-on-surface">Cryptographic vault active.</strong> Commercial bids and vendor identities stay HSM-encrypted until public bid opening.
            </span>
            <StatusBadge status="verified">Gateway nominal</StatusBadge>
          </div>

          {rows.length > 0 ? (
            <Table minWidth={980}>
              <THead>
                <tr>
                  <Th className="pl-6">Tender</Th>
                                    <Th>Status</Th>
                  <Th>Bids</Th>
                  <Th>Deadline</Th>
                                    <Th align="right" className="pr-6">
                    <span className="sr-only">Action</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {rows.map((t) => (
                  <Tr key={t.ref}>
                    <Td className="pl-6 !py-5 min-w-[300px]">
                      <CellStack primary={t.title} secondary={<><span className="font-mono text-[12px] text-on-surface">{t.ref}</span> · {t.nature}<span className="block">{t.category} · {t.unit}</span></>} />
                    </Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1.5">
                        <StatusBadge status={STAGE_BADGE[t.stage].status}>{STAGE_BADGE[t.stage].label}</StatusBadge>
                        <span className="text-[12px] text-on-surface-variant">Updated {t.updated} · {t.actor}</span>
                      </div>
                    </Td>
                    <Td>
                      <CellStack
                        primary={<span className="whitespace-nowrap">{t.bids}</span>}
                        secondary={
                          t.bidNote && (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              {t.bidIcon && <Icon name={t.bidIcon} size="xs" className={t.bidIcon === 'lock' || t.bidIcon === 'verified' ? 'text-success' : ''} />}
                              {t.bidNote}
                            </span>
                          )
                        }
                      />
                    </Td>
                    <Td>
                      <CellStack primary={<span className="whitespace-nowrap num">{t.deadline}</span>} secondary={<span className={cn('whitespace-nowrap', t.urgent && 'font-medium text-danger-on-container')}>{t.deadlineNote}</span>} />
                    </Td>
                    <Td align="right" className="pr-6">
                      <Button size="sm" variant={t.primary ? 'primary' : 'secondary'} leftIcon={t.ctaIcon === 'arrow_forward' ? undefined : t.ctaIcon} rightIcon={t.ctaIcon === 'arrow_forward' ? 'arrow_forward' : undefined}>
                        {t.cta}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState
              icon="folder_off"
              title="No tenders in this stage"
              description="Nothing on your desk matches the selected stage or search."
              actions={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTab('all');
                    setQuery('');
                  }}
                >
                  Show all tenders
                </Button>
              }
            />
          )}

          <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface-container-low/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3 text-body-sm text-on-surface-variant">
              <span>
                Showing 1–{rows.length} of 19 tenders
              </span>
              <label className="flex items-center gap-2">
                <span>Rows</span>
                <Select size="sm" defaultValue="8" className="!w-20">
                  <option>8</option>
                  <option>15</option>
                  <option>25</option>
                  <option>50</option>
                </Select>
              </label>
            </div>
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <IconButton icon="chevron_left" aria-label="Previous page" variant="secondary" size="sm" disabled />
              {['1', '2', '3'].map((n) => (
                <button key={n} type="button" aria-current={n === '1' ? 'page' : undefined} className={cn('focus-ring h-8 min-w-8 rounded-control px-2 text-[13px] font-medium num', n === '1' ? 'bg-navy text-white' : 'text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface')}>
                  {n}
                </button>
              ))}
              <IconButton icon="chevron_right" aria-label="Next page" variant="secondary" size="sm" />
            </nav>
          </div>
        </Card>

        <Callout tone="neutral" icon="gavel" title={<span className="flex flex-wrap items-center gap-2">Statutory sealed-bid governance & role-based isolation <Tag mono>CVC-CIRCULAR-2024-V3</Tag></span>}>
          Showing tenders authorized under Manali Refinery Directorate (Refinery-III). Tenders in "Submission open" enforce HSM isolation: bidder identities, commercial proposals and qualification documents stay unreadable to all officers until the statutory opening-ceremony quorum is reached.
        </Callout>
      </div>

      {/* Create tender */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        icon="post_add"
        title="Initiate new procurement tender"
        description="Stage 1 of 5 · statutory registration & master specification"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button rightIcon="arrow_forward" to="/officer/tenders/new">
              Proceed to tender information
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 rounded-card border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-2">
            <div>
              <div className="text-[12px] text-on-surface-variant">System-assigned draft reference</div>
              <div className="font-mono text-[14px] font-semibold text-on-surface">TND-DRAFT-2026-0048</div>
            </div>
            <div>
              <div className="text-[12px] text-on-surface-variant">Authorized initiator</div>
              <div className="text-[14px] font-semibold text-on-surface">
                Arun Kumar · <span className="font-mono text-[13px]">CPCL-OFF-4092</span>
              </div>
            </div>
          </div>
          <Field label="Tender title / work description" htmlFor="nt-title" required>
            <Input id="nt-title" placeholder="e.g. Supply of flame detectors for CDU-II" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Procurement category" htmlFor="nt-cat" required>
              <Select id="nt-cat">
                <option>Equipment & hardware</option>
                <option>Rotary & mechanical maintenance</option>
                <option>Plant safety & gas detection</option>
                <option>Telecom & operational technology</option>
                <option>Civil & marine works</option>
              </Select>
            </Field>
            <Field label="Procurement method" htmlFor="nt-method" required>
              <Select id="nt-method">
                <option>Open national competitive (NCB)</option>
                <option>Global tender inquiry (GTI/ICB)</option>
                <option>Limited tender enquiry (LTE)</option>
                <option>Single tender / PAC (proprietary)</option>
              </Select>
            </Field>
            <Field label="Estimated value (INR, excl. GST)" htmlFor="nt-value" required>
              <Input id="nt-value" placeholder="₹ 0.00" leftIcon="currency_rupee" className="num" />
            </Field>
            <Field label="Bidding model" htmlFor="nt-model" required>
              <Select id="nt-model">
                <option>Two-envelope (technical + commercial)</option>
                <option>Single-envelope (commercial only)</option>
                <option>Three-envelope (PQ + tech + commercial)</option>
              </Select>
            </Field>
          </div>
          <Callout tone="info">Continuing creates the official draft and opens stage 1 (tender information).</Callout>
        </div>
      </Modal>

      {/* Workflow preview */}
      <Modal
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        icon="account_tree"
        title="Officer procurement lifecycle"
        description="Five stages from draft to cryptographic vaulting"
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setWorkflowOpen(false)}>
            Close
          </Button>
        }
      >
        <ol className="relative flex flex-col gap-5 pl-10 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-outline-variant">
          {WORKFLOW.map((w, i) => (
            <li key={w.title} className="relative">
              <span className={cn('absolute -left-10 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold num', i === 0 ? 'bg-secondary text-white' : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant')}>{i + 1}</span>
              <div className="text-[15px] font-semibold text-on-surface">{w.title}</div>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">{w.body}</p>
            </li>
          ))}
        </ol>
      </Modal>
    </OfficerPortalShell>
  );
}
