// Procurement Officer — Create Tender, Step 1: Tender Information. Ported from
// Stitch screen "O04 — Create Tender: Tender Information" (project
// 6921642772921774119, screen e247119de66c43849f8b25f68ead7ed4) on the shared
// OfficerPortalShell and design-system primitives.
//
// Reached from "Create tender" on /officer/tenders. Title counter, tender
// value in words, schedule checks (CVC 14-day window, opening ≥ deadline +30m),
// yes/no toggles, autosave indicator and the Save/Discard modals are React state.
//
// TODO: POST /api/officer/tenders/drafts. "Continue" routes to O05 Tender Documents.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import {
  Button,
  Callout,
  Card,
  CardHeader,
  Field,
  Icon,
  Input,
  Modal,
  PageHeader,
  Select,
  Stepper,
  StatusBadge,
  Tag,
} from '@/components/primitives';
import { cn } from '@/utils/cn';
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, DRAFT_REF } from './createTender';


// Indian numbering in words (up to crores) for the tender value notation.
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function twoDigits(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? '-' + ONES[n % 10] : ''}`;
}
function inWords(n: number): string {
  if (!n) return '';
  const parts: string[] = [];
  const units: [number, string][] = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [100, 'Hundred']];
  let rest = n;
  for (const [size, name] of units) {
    const q = Math.floor(rest / size);
    if (q) {
      parts.push(`${q >= 100 ? inWords(q) : twoDigits(q)} ${name}`);
      rest %= size;
    }
  }
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}
function groupIndian(digits: string) {
  if (!digits) return '';
  const n = digits.replace(/^0+(?=\d)/, '');
  if (n.length <= 3) return n;
  return n.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + n.slice(-3);
}

const HOUR = 3600_000;

export function YesNo({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-control border border-outline-variant bg-surface-container-low p-1">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'h-8 min-w-[56px] rounded-[6px] px-3 text-[13px] font-semibold transition-all focus-ring',
            value === v ? 'bg-surface-container-lowest text-secondary shadow-card' : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

function Section({ index, icon, title, description, badge, children }: { index: number; icon: string; title: string; description: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <Card padding="lg" as="section" aria-labelledby={`sec-${index}`}>
      <CardHeader
        icon={icon}
        title={<span id={`sec-${index}`}>{index}. {title}</span>}
        description={description}
        actions={badge}
      />
      {children}
    </Card>
  );
}

export function CreateTenderInfoPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('Supply of CCTV Cameras for Public Safety Infrastructure');
  const [value, setValue] = useState('4250000');
  const [issue, setIssue] = useState('2026-09-20T10:00');
  const [start, setStart] = useState('2026-09-20T11:00');
  const [deadline, setDeadline] = useState('2026-10-04T17:00');
  const [opening, setOpening] = useState('2026-10-04T17:30');
  const [allowModify, setAllowModify] = useState(true);
  const [allowWithdraw, setAllowWithdraw] = useState(false);
  const [savedAgo, setSavedAgo] = useState(14);
  const [exitOpen, setExitOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSavedAgo((s) => s + 10), 10_000);
    return () => clearInterval(t);
  }, []);

  const savedLabel = savedAgo < 60 ? `${savedAgo}s ago` : `${Math.floor(savedAgo / 60)}m ago`;

  const schedule = useMemo(() => {
    const [i, s, d, o] = [issue, start, deadline, opening].map((v) => new Date(v).getTime());
    const windowDays = (d - s) / (24 * HOUR);
    return {
      windowDays,
      startOk: s >= i,
      windowOk: windowDays >= 14,
      openingOk: o - d >= HOUR / 2,
    };
  }, [issue, start, deadline, opening]);
  const scheduleOk = schedule.startOk && schedule.windowOk && schedule.openingOk;
  const titleOk = title.trim().length > 0 && title.length <= 180;
  const valueNum = Number(value) || 0;
  const canContinue = scheduleOk && titleOk && valueNum > 0;

  const deadlineLabel = new Date(deadline).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

  function handleContinue() {
    setContinuing(true);
    setTimeout(() => navigate(CREATE_TENDER_ROUTES.documents), 500);
  }

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-8 pb-28">
        <PageHeader
          breadcrumbs={[
            { label: 'Officer workspace', to: '/officer/dashboard' },
            { label: 'Tenders', to: '/officer/tenders' },
            { label: `Create tender (${DRAFT_REF})` },
          ]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{DRAFT_REF}</Tag>
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success-on-container">
                <Icon name="check_circle" size="xs" fill /> Draft saved ({savedLabel})
              </span>
            </>
          }
          title="Create tender"
          description="Establish the statutory master record, authority jurisdiction and GFR schedule before proceeding to document upload."
          actions={
            <Button variant="secondary" leftIcon="arrow_back" to="/officer/tenders">
              Back to tenders
            </Button>
          }
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={1} />
        </Card>

        {/* 1. Basic information */}
        <Section index={1} icon="assignment" title="Basic tender information" description="Define the primary statutory identity and categorization of this procurement opportunity." badge={<Tag>Statutory core</Tag>}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              className="md:col-span-2"
              label="Tender title"
              htmlFor="ti-title"
              required
              aside={<span className={cn('num text-[12px]', title.length > 180 ? 'text-danger' : 'text-on-surface-variant')}>{title.length}/180</span>}
              error={!titleOk ? (title.length > 180 ? 'Title exceeds 180 characters' : 'Tender title is required') : undefined}
            >
              <Input id="ti-title" value={title} onChange={(e) => setTitle(e.target.value)} state={titleOk ? 'default' : 'error'} placeholder="e.g. Procurement of High-Pressure Gas Recirculation Valves" />
            </Field>
            <Field label="Tender reference number" htmlFor="ti-ref" required helper="Unique sovereign reference in the CVC directory" valid="Available">
              <Input id="ti-ref" defaultValue="CPCL/PROC/2026/041" className="font-mono" />
            </Field>
            <Field label="Tender type" htmlFor="ti-type" required>
              <Select id="ti-type" defaultValue="open">
                <option value="open">Open tender (National Competitive Bidding)</option>
                <option value="limited">Limited tender enquiry</option>
                <option value="eoi">Expression of Interest (EOI)</option>
                <option value="rfq">Request for Quotation (RFQ)</option>
                <option value="single">Single tender / PAC (proprietary article)</option>
              </Select>
            </Field>
            <Field label="Procurement category" htmlFor="ti-cat" required>
              <Select id="ti-cat" defaultValue="telecom">
                <option value="hardware">Equipment / hardware</option>
                <option value="civil">Civil & structural works</option>
                <option value="electrical">Electrical & instrumentation</option>
                <option value="services">Services & plant maintenance</option>
                <option value="telecom">IT & industrial telecommunications</option>
              </Select>
            </Field>
            <Field label="Subcategory / classification" htmlFor="ti-sub">
              <Input id="ti-sub" defaultValue="CCTV & Surveillance Infrastructure" />
            </Field>
          </div>
        </Section>

        {/* 2. Authority & scope */}
        <Section index={2} icon="account_balance" title="Procurement authority & scope" description="Specify the procuring administrative unit, execution location and financial sanction." badge={<Tag>CPCL Directorate</Tag>}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Issuing organization" htmlFor="ti-org" required helper="Pre-bound to officer authentication session">
              <Input id="ti-org" value="Chennai Petroleum Corporation Limited (CPCL)" disabled rightIcon="lock" readOnly />
            </Field>
            <Field label="Administrative ministry / department" htmlFor="ti-min" required>
              <Input id="ti-min" defaultValue="Ministry of Petroleum & Natural Gas (MoP&NG)" />
            </Field>
            <Field label="Execution / delivery location" htmlFor="ti-loc" required>
              <Input id="ti-loc" defaultValue="CPCL Manali Refinery, Chennai - 600068" leftIcon="pin_drop" />
            </Field>
            <Field
              label="Estimated tender value"
              htmlFor="ti-val"
              required
              aside={<Tag>GFR Rule 149</Tag>}
              helper={valueNum ? <>Notation: <span className="font-medium text-on-surface">{inWords(valueNum)} Only</span></> : 'Enter the sanctioned estimate in INR'}
              error={!valueNum ? 'Estimated value is required' : undefined}
            >
              <Input
                id="ti-val"
                inputMode="numeric"
                leftIcon="currency_rupee"
                className="num"
                state={valueNum ? 'default' : 'error'}
                value={groupIndian(value)}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 12))}
              />
            </Field>
            <Field className="md:col-span-2" label="Tender description & work scope" htmlFor="ti-desc" required aside={<span className="text-[12px] text-on-surface-variant">Excludes evaluation criteria</span>}>
              <textarea
                id="ti-desc"
                rows={4}
                defaultValue="Supply, installation, testing and commissioning of IP-based CCTV surveillance cameras, NVR storage and control-room integration across Refinery Units I–III, including 3 years of comprehensive maintenance."
                className="w-full rounded-control border border-outline-variant bg-surface-container-lowest px-3.5 py-3 text-[14px] text-on-surface outline-none transition-all placeholder:text-outline hover:border-outline/60 focus:border-secondary focus:shadow-focus"
              />
            </Field>
          </div>
          <Callout tone="info" icon="info" className="mt-5">
            Bidder requirements and evaluation rules are identified from your documents in Step 3 (Compliance configuration). Do not embed scoring matrices here.
          </Callout>
        </Section>

        {/* 3. Schedule */}
        <Section
          index={3}
          icon="calendar_clock"
          title="Submission schedule & timelines"
          description="Statutory critical dates compliant with Central Vigilance Commission tender floating timelines."
          badge={<StatusBadge tone="info">Min 14-day window</StatusBadge>}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <Field label="Tender issue date" htmlFor="ti-issue" required helper="Notice floating date">
              <Input id="ti-issue" type="datetime-local" value={issue} onChange={(e) => setIssue(e.target.value)} />
            </Field>
            <Field label="Bid submission start" htmlFor="ti-start" required error={!schedule.startOk ? 'Must be on/after issue date' : undefined} helper="Gateway unsealed for bids">
              <Input id="ti-start" type="datetime-local" value={start} state={schedule.startOk ? 'default' : 'error'} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field
              label="Submission deadline"
              htmlFor="ti-deadline"
              required
              error={!schedule.windowOk ? `Window is ${schedule.windowDays.toFixed(1)} days (min 14)` : undefined}
              helper={`Hard-lock cutoff (${schedule.windowDays.toFixed(1)}-day window)`}
            >
              <Input id="ti-deadline" type="datetime-local" value={deadline} state={schedule.windowOk ? 'default' : 'error'} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
            <Field label="Technical bid opening" htmlFor="ti-open" required error={!schedule.openingOk ? 'Min 30 min after deadline' : undefined} helper="Min +30 min post deadline">
              <Input id="ti-open" type="datetime-local" value={opening} state={schedule.openingOk ? 'default' : 'error'} onChange={(e) => setOpening(e.target.value)} />
            </Field>
            <Field label="Bid validity period" htmlFor="ti-validity" required helper="From technical bid opening">
              <Select id="ti-validity" defaultValue="90">
                {[60, 90, 120, 180].map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Callout
            tone={scheduleOk ? 'success' : 'danger'}
            icon={scheduleOk ? 'check_circle' : 'error'}
            title={scheduleOk ? 'All statutory schedule constraints satisfied' : 'Schedule violates statutory constraints'}
            className="mt-5"
          >
            Start ≥ issue · submission window ≥ 14 days (CVC 2024) · opening ≥ deadline + 30 min
          </Callout>
        </Section>

        {/* 4. Nodal officer */}
        <Section index={4} icon="badge" title="Nodal officer & tender contact" description="Designated authority for statutory clarifications, pre-bid meetings and vendor communication." badge={<Tag>DSC signatory</Tag>}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Nodal officer name" htmlFor="ti-no-name" required>
              <Input id="ti-no-name" defaultValue="Arun Kumar" />
            </Field>
            <Field label="Designation" htmlFor="ti-no-des" required>
              <Input id="ti-no-des" defaultValue="Senior Procurement Officer (Refinery Directorate)" />
            </Field>
            <Field label="Official email" htmlFor="ti-no-mail" required valid="Verified" helper="Authenticated corporate government domain">
              <Input id="ti-no-mail" type="email" defaultValue="arun.kumar@cpcl.co.in" rightIcon="verified" state="valid" />
            </Field>
            <Field label="Official desk / telephone" htmlFor="ti-no-tel" required helper="Available 09:00 – 17:30 IST">
              <Input id="ti-no-tel" defaultValue="+91 (044) 2594 4092 (Ext: 4402)" leftIcon="call" />
            </Field>
          </div>
        </Section>

        {/* 5. Governance */}
        <Section index={5} icon="gavel" title="Statutory parameters & governance protocol" description="Earnest money deposit, submission cryptography and two-envelope settings." badge={<StatusBadge tone="success">GFR compliant</StatusBadge>}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Field label="Bid security / EMD protocol" htmlFor="ti-emd" required>
              <Select id="ti-emd" defaultValue="required">
                <option value="required">Required: ₹ 85,000 (MSME/startups exempt)</option>
                <option value="bid_sec_decl">Bid Securing Declaration (BSD) in lieu of EMD</option>
                <option value="exempt">Fully exempt (inter-PSU / sovereign entity)</option>
                <option value="fixed_pb">Performance bank guarantee only</option>
              </Select>
            </Field>
            <Field label="Bid submission mode" htmlFor="ti-mode" required>
              <Input id="ti-mode" value="Online (NIC e-Procurement · dual-key sealed HSM)" disabled readOnly rightIcon="lock" />
            </Field>
            <Field label="Tender evaluation system" htmlFor="ti-eval" required>
              <Select id="ti-eval" defaultValue="two_envelope">
                <option value="two_envelope">Two-envelope (technical, then financial)</option>
                <option value="single_envelope">Single-envelope (technical & commercial)</option>
                <option value="qcbs">QCBS (quality & cost based, 80:20)</option>
              </Select>
            </Field>
          </div>
          <div className="mt-5 divide-y divide-outline-variant rounded-card border border-outline-variant">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[14px] font-semibold text-on-surface">Allow bid modification before deadline</div>
                <div className="text-body-sm text-on-surface-variant">Vendors can overwrite digitally signed packages prior to {deadlineLabel} IST</div>
              </div>
              <YesNo label="Allow bid modification" value={allowModify} onChange={setAllowModify} />
            </div>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[14px] font-semibold text-on-surface">Allow bid withdrawal before deadline</div>
                <div className="text-body-sm text-on-surface-variant">Subject to EMD forfeiture conditions per General Financial Rule 170</div>
              </div>
              <YesNo label="Allow bid withdrawal" value={allowWithdraw} onChange={setAllowWithdraw} />
            </div>
          </div>
        </Section>
      </div>

      <BidActionBar
        left={
          <>
            <Button variant="secondary" leftIcon="save" onClick={() => setExitOpen(true)}>
              Save draft & exit
            </Button>
            <Button variant="ghost" leftIcon="delete" className="text-danger" onClick={() => setDiscardOpen(true)}>
              Discard
            </Button>
          </>
        }
        center={
          <span className="text-body-sm text-on-surface-variant">
            Draft auto-saved {savedLabel} · {canContinue ? 'All mandatory metadata validated' : 'Resolve highlighted fields to continue'}
          </span>
        }
        right={
          <Button rightIcon="arrow_forward" disabled={!canContinue} loading={continuing} onClick={handleContinue}>
            Continue to tender documents
          </Button>
        }
      />

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        icon="save"
        size="md"
        title="Save draft & exit?"
        description={DRAFT_REF}
        footer={
          <>
            <Button variant="secondary" onClick={() => setExitOpen(false)}>
              Return to form
            </Button>
            <Button onClick={() => navigate('/officer/tenders')}>Confirm & exit to tenders</Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">
          Your tender draft is automatically synced to the sovereign repository. You can resume authoring from Tender Management at any time.
        </p>
      </Modal>

      <Modal
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        icon="delete_forever"
        size="md"
        title="Discard draft tender?"
        description="Irreversible action"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => navigate('/officer/tenders')}>
              Permanently discard
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">
          This permanently deletes draft <span className="font-mono font-semibold text-on-surface">{DRAFT_REF}</span> and all pre-configured parameters. This cannot be undone.
        </p>
      </Modal>

    </OfficerPortalShell>
  );
}
