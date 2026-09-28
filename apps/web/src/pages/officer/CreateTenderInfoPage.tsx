// Procurement Officer — Create Tender, Step 1: Tender Information. Ported from
// Stitch screen "O04 — Create Tender: Tender Information" (project
// 6921642772921774119, screen e247119de66c43849f8b25f68ead7ed4) on the shared
// OfficerPortalShell and design-system primitives.
//
// Phase 2: real MongoDB-backed draft. On mount this creates (or resumes, via
// createTender.ts's sessionStorage draft id) a real Tender document through
// POST/GET /api/officer/tenders, and "Continue" persists the fields that
// exist on the real schema (tenderNumber, title, description, department,
// value, submissionStart, submissionDeadline) via PATCH. Fields with no
// equivalent on the Tender model (tender type, subcategory, ministry, nodal
// officer contact, EMD protocol, bid-opening time, modify/withdraw policy)
// remain local UI state only — clearly out of scope for this phase's schema,
// not silently dropped without notice.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, getDraftTenderId, setDraftTenderId } from './createTender';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiTender, EvaluationMode } from '@/lib/types';

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

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
      <CardHeader icon={icon} title={<span id={`sec-${index}`}>{index}. {title}</span>} description={description} actions={badge} />
      {children}
    </Card>
  );
}

export function CreateTenderInfoPage() {
  const navigate = useNavigate();

  const [tenderId, setTenderId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [tenderNumber, setTenderNumber] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [start, setStart] = useState('');
  const [deadline, setDeadline] = useState('');
  const [evaluationMode, setEvaluationMode] = useState<EvaluationMode>('SEALED');

  // Cosmetic-only fields — not part of the real Tender schema this phase.
  const [issue, setIssue] = useState(() => new Date().toISOString().slice(0, 16));
  const [opening, setOpening] = useState('');
  const [allowModify, setAllowModify] = useState(true);
  const [allowWithdraw, setAllowWithdraw] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [continuing, setContinuing] = useState(false);

  // Guards against React StrictMode's dev-only double effect invocation
  // firing two create/resume requests. The ref (not state) survives the
  // synchronous mount→cleanup→mount that StrictMode performs, so the second
  // invocation reuses the first's in-flight promise instead of racing it.
  // The backend is independently idempotent too (POST accepts a draftId and
  // resumes rather than creates) — this is belt-and-suspenders, not the only
  // safeguard.
  const initRef = useRef<Promise<ApiTender> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!initRef.current) {
          const existingId = getDraftTenderId();
          initRef.current = (async () => {
            if (existingId) {
              try {
                const existing = await officerApi.get<ApiTender>(`/tenders/${existingId}`);
                // A sessionStorage id can point at a tender that has since been
                // published/closed (e.g. the officer published one tender, then
                // came back to "Create tender" to start another). That tender
                // is locked server-side anyway — showing it here as an
                // editable draft would be wrong, so start a genuinely new one
                // instead of "resuming" it.
                if (existing.status === 'draft') return existing;
              } catch (err) {
                // The id can also point at a tender that no longer exists at
                // all (e.g. the database was reset/cleared for a fresh test
                // run while this browser tab still had an old draft id in
                // sessionStorage). A 404 here just means "nothing to resume"
                // — fall through and create a new draft instead of surfacing
                // an error for something the officer never asked to load.
                if (!(err instanceof ApiError) || err.status !== 404) throw err;
              }
            }
            return officerApi.post<ApiTender>('/tenders', {});
          })();
        }
        const tender = await initRef.current;
        setDraftTenderId(tender._id);
        if (cancelled) return;
        setTenderId(tender._id);
        setTenderNumber(tender.tenderNumber.startsWith('DRAFT-') ? '' : tender.tenderNumber);
        setTitle(tender.title);
        setDepartment(tender.department.trim());
        setDescription(tender.description.trim());
        setValue(tender.value.replace(/[^\d]/g, '').trim());
        setStart(toLocalInput(tender.submissionStart));
        setDeadline(toLocalInput(tender.submissionDeadline));
        setOpening(toLocalInput(new Date(new Date(tender.submissionDeadline).getTime() + 30 * 60 * 1000).toISOString()));
        setEvaluationMode(tender.evaluationMode ?? 'SEALED');
        setLoaded(true);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Could not load or create the draft tender.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const schedule = useMemo(() => {
    const [i, s, d, o] = [issue, start, deadline, opening].map((v) => (v ? new Date(v).getTime() : NaN));
    const windowDays = (d - s) / (24 * HOUR);
    return { windowDays, startOk: s >= i, windowOk: windowDays >= 14, openingOk: o - d >= HOUR / 2 };
  }, [issue, start, deadline, opening]);
  const scheduleOk = schedule.startOk && schedule.windowOk && schedule.openingOk;
  const titleOk = title.trim().length > 0 && title.length <= 180;
  const valueNum = Number(value) || 0;
  const tenderNumberOk = tenderNumber.trim().length > 0;
  const canContinue = scheduleOk && titleOk && valueNum > 0 && tenderNumberOk && department.trim().length > 0;

  const deadlineLabel = deadline ? new Date(deadline).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

  async function persist(status?: 'draft' | 'published'): Promise<boolean> {
    if (!tenderId) return false;
    setSaving(true);
    setSaveError(null);
    try {
      await officerApi.patch<ApiTender>(`/tenders/${tenderId}`, {
        tenderNumber: tenderNumber.trim(),
        title: title.trim(),
        department: department.trim(),
        description: description.trim(),
        value: value ? `₹ ${groupIndian(value)} (excl. GST)` : '',
        submissionStart: new Date(start).toISOString(),
        submissionDeadline: new Date(deadline).toISOString(),
        evaluationMode,
        ...(status ? { status } : {}),
      });
      setSavedAt(new Date());
      return true;
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save this tender.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleContinue() {
    setContinuing(true);
    const ok = await persist();
    setContinuing(false);
    if (ok) navigate(CREATE_TENDER_ROUTES.documents);
  }

  if (loadError) {
    return (
      <OfficerPortalShell breadcrumb="Create tender">
        <Callout tone="danger" title="Could not open the draft tender">
          {loadError}
        </Callout>
      </OfficerPortalShell>
    );
  }

  if (!loaded) {
    return (
      <OfficerPortalShell breadcrumb="Create tender">
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </OfficerPortalShell>
    );
  }

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-6 pb-28">
        <PageHeader
          breadcrumbs={[{ label: 'Officer workspace', to: '/officer/dashboard' }, { label: 'Tenders', to: '/officer/tenders' }, { label: 'Create tender' }]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              {tenderId && <Tag mono>{tenderId.slice(-8)}</Tag>}
              {savedAt && (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success-on-container">
                  <Icon name="check_circle" size="xs" fill /> Saved {savedAt.toLocaleTimeString()}
                </span>
              )}
            </>
          }
          title="Create tender"
          description="Establish the statutory master record before proceeding to document upload."
          actions={
            <Button variant="secondary" leftIcon="arrow_back" to="/officer/tenders">
              Back to tenders
            </Button>
          }
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={1} />
        </Card>

        {saveError && (
          <Callout tone="danger" title="Could not save">
            {saveError}
          </Callout>
        )}

        <Section index={1} icon="assignment" title="Basic tender information" description="Define the primary identity of this procurement opportunity." badge={<Tag>Persisted</Tag>}>
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
            <Field label="Tender reference number" htmlFor="ti-ref" required helper="Unique reference — required before publish" error={!tenderNumberOk ? 'Tender reference is required' : undefined}>
              <Input id="ti-ref" value={tenderNumber} onChange={(e) => setTenderNumber(e.target.value)} state={tenderNumberOk ? 'default' : 'error'} className="font-mono" placeholder="CPCL/PROC/2026/0xx" />
            </Field>
            <Field label="Administrative department" htmlFor="ti-min" required>
              <Input id="ti-min" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Refinery Unit-I Security Wing" />
            </Field>
          </div>
        </Section>

        <Section index={2} icon="account_balance" title="Scope & estimated value" description="Financial sanction and work description." badge={<Tag>Persisted</Tag>}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              label="Estimated tender value"
              htmlFor="ti-val"
              required
              helper={valueNum ? <>Notation: <span className="font-medium text-on-surface">{inWords(valueNum)} Only</span></> : 'Enter the sanctioned estimate in INR'}
              error={!valueNum ? 'Estimated value is required' : undefined}
            >
              <Input id="ti-val" inputMode="numeric" leftIcon="currency_rupee" className="num" state={valueNum ? 'default' : 'error'} value={groupIndian(value)} onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 12))} />
            </Field>
            <Field label="Issuing organization" htmlFor="ti-org" helper="Fixed for this deployment">
              <Input id="ti-org" value="Chennai Petroleum Corporation Limited (CPCL)" disabled rightIcon="lock" readOnly />
            </Field>
            <Field className="md:col-span-2" label="Tender description & work scope" htmlFor="ti-desc" required>
              <textarea
                id="ti-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the scope of work"
                className="w-full rounded-control border border-outline-variant bg-surface-container-lowest px-3.5 py-3 text-[14px] text-on-surface outline-none transition-all placeholder:text-outline hover:border-outline/60 focus:border-secondary focus:shadow-focus"
              />
            </Field>
          </div>
        </Section>

        <Section index={3} icon="calendar_clock" title="Submission schedule & timelines" description="Statutory critical dates." badge={<StatusBadge tone="info">Min 14-day window</StatusBadge>}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <Field label="Tender issue date" htmlFor="ti-issue" required helper="Cosmetic — not persisted this phase">
              <Input id="ti-issue" type="datetime-local" value={issue} onChange={(e) => setIssue(e.target.value)} />
            </Field>
            <Field label="Bid submission start" htmlFor="ti-start" required error={!schedule.startOk ? 'Must be on/after issue date' : undefined}>
              <Input id="ti-start" type="datetime-local" value={start} state={schedule.startOk ? 'default' : 'error'} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Submission deadline" htmlFor="ti-deadline" required error={!schedule.windowOk ? `Window is ${schedule.windowDays.toFixed(1)} days (min 14)` : undefined}>
              <Input id="ti-deadline" type="datetime-local" value={deadline} state={schedule.windowOk ? 'default' : 'error'} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
            <Field label="Technical bid opening" htmlFor="ti-open" required error={!schedule.openingOk ? 'Min 30 min after deadline' : undefined} helper="Cosmetic — not persisted this phase">
              <Input id="ti-open" type="datetime-local" value={opening} state={schedule.openingOk ? 'default' : 'error'} onChange={(e) => setOpening(e.target.value)} />
            </Field>
          </div>
          <Callout tone={scheduleOk ? 'success' : 'danger'} icon={scheduleOk ? 'check_circle' : 'error'} title={scheduleOk ? 'Schedule constraints satisfied' : 'Schedule violates constraints'} className="mt-5">
            Start ≥ issue · submission window ≥ 14 days · opening ≥ deadline + 30 min
          </Callout>
        </Section>

        <Section index={4} icon="visibility" title="Evaluation mode" description="Controls when an officer may see a submitted bid's already-computed compliance assessment — never whether or when it is computed." badge={<Tag>Persisted</Tag>}>
          <div role="radiogroup" aria-label="Evaluation mode" className="flex flex-col gap-3">
            <button
              type="button"
              role="radio"
              aria-checked={evaluationMode === 'SEALED'}
              onClick={() => setEvaluationMode('SEALED')}
              className={cn('flex items-start gap-3 rounded-card border p-4 text-left transition-colors focus-ring', evaluationMode === 'SEALED' ? 'border-secondary bg-info-container/30' : 'border-outline-variant hover:border-outline/60')}
            >
              <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', evaluationMode === 'SEALED' ? 'border-secondary' : 'border-outline-variant')}>
                {evaluationMode === 'SEALED' && <span className="h-2.5 w-2.5 rounded-full bg-secondary" />}
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-on-surface">Sealed Evaluation</span>
                <span className="block text-body-sm text-on-surface-variant">Bid assessment remains hidden from officers until the submission deadline.</span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={evaluationMode === 'IMMEDIATE'}
              onClick={() => setEvaluationMode('IMMEDIATE')}
              className={cn('flex items-start gap-3 rounded-card border p-4 text-left transition-colors focus-ring', evaluationMode === 'IMMEDIATE' ? 'border-secondary bg-info-container/30' : 'border-outline-variant hover:border-outline/60')}
            >
              <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', evaluationMode === 'IMMEDIATE' ? 'border-secondary' : 'border-outline-variant')}>
                {evaluationMode === 'IMMEDIATE' && <span className="h-2.5 w-2.5 rounded-full bg-secondary" />}
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-on-surface">Immediate Evaluation — Demo Mode</span>
                <span className="block text-body-sm text-on-surface-variant">Compliance evaluation runs automatically after bid submission and becomes available to authorized officers immediately.</span>
              </span>
            </button>
          </div>
        </Section>

        <Section index={5} icon="gavel" title="Additional protocol (not persisted this phase)" description="These settings are demo UI only — no backing field exists on the tender record yet." badge={<Tag>Local only</Tag>}>
          <div className="divide-y divide-outline-variant rounded-card border border-outline-variant">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[14px] font-semibold text-on-surface">Allow bid modification before deadline</div>
                <div className="text-body-sm text-on-surface-variant">Vendors can overwrite drafts prior to {deadlineLabel}</div>
              </div>
              <YesNo label="Allow bid modification" value={allowModify} onChange={setAllowModify} />
            </div>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[14px] font-semibold text-on-surface">Allow bid withdrawal before deadline</div>
              </div>
              <YesNo label="Allow bid withdrawal" value={allowWithdraw} onChange={setAllowWithdraw} />
            </div>
          </div>
        </Section>
      </div>

      <BidActionBar
        left={
          <>
            <Button variant="secondary" leftIcon="save" loading={saving} onClick={() => persist().then((ok) => ok && setExitOpen(true))}>
              Save draft & exit
            </Button>
            <Button variant="ghost" leftIcon="delete" className="text-danger" onClick={() => setDiscardOpen(true)}>
              Discard
            </Button>
          </>
        }
        center={<span className="text-body-sm text-on-surface-variant">{canContinue ? 'All mandatory metadata validated' : 'Resolve highlighted fields to continue'}</span>}
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
        footer={
          <>
            <Button variant="secondary" onClick={() => setExitOpen(false)}>
              Return to form
            </Button>
            <Button onClick={() => navigate('/officer/tenders')}>Confirm & exit to tenders</Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">Your tender draft is saved in MongoDB. You can resume authoring later.</p>
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
        <p className="text-body-md text-on-surface-variant">This leaves the draft tender record in place (no delete API exists this phase) but exits the wizard without publishing it.</p>
      </Modal>
    </OfficerPortalShell>
  );
}
