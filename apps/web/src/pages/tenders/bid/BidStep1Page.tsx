// Bid Submission Workspace — Step 1: Basic details. Ported from Stitch screen
// "Bid Submission Workspace (Step 01: Basic Details)" (project
// 6921642772921774119, screen d3228cb982254dd19395225f75461470).
//
// Real draft bid (GET /api/bids, PATCH /api/bids/:id) — formData is stored as
// a loose object on BidSubmission, so all these fields map 1:1 onto keys in
// bid.formData. DSC/PAN/GSTIN format validation shown in the UI is cosmetic —
// the gateway does not verify these values against any external registry.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import { Button, Callout, Card, CardHeader, Field, Icon, Input, PageHeader, Select, StatusBadge } from '@/components/primitives';
import { BID_TENDER, BidActionBar, BidStepper, TenderContextBanner } from './BidWorkspaceChrome';
import { api, ApiError } from '@/lib/api';
import type { ApiBid, ApiTender } from '@/lib/types';

interface FieldDef {
  id: string;
  label: string;
  required?: boolean;
  helper?: string;
  icon?: string;
  mono?: boolean;
  maxLength?: number;
  span?: 2;
}

const COMPANY: FieldDef[] = [
  { id: 'companyName', label: 'Registered company name', required: true, helper: 'Must match the Certificate of Incorporation exactly', icon: 'domain', span: 2 },
  { id: 'regAddress', label: 'Registered address', required: true, helper: 'Principal place of business declared for GST', icon: 'location_on', span: 2 },
  { id: 'city', label: 'City', required: true },
];

const CONTACT: FieldDef[] = [
  { id: 'contactName', label: 'Full name', required: true, helper: 'Authorized signatory', icon: 'person' },
  { id: 'designation', label: 'Designation', helper: 'Official executive or managerial title', icon: 'work' },
  { id: 'mobileNumber', label: 'Mobile number', required: true, icon: 'phone_iphone', mono: true },
  { id: 'emailAddress', label: 'Email address', required: true, icon: 'mail', mono: true },
];

const REGISTRATION: FieldDef[] = [
  { id: 'panNumber', label: 'Permanent Account Number (PAN)', required: true, helper: '10-character Income Tax identifier', icon: 'credit_card', mono: true, maxLength: 10 },
  { id: 'gstinNumber', label: 'GSTIN', required: true, helper: '15-digit GST identification number', icon: 'account_balance', mono: true, maxLength: 15 },
  { id: 'cinNumber', label: 'CIN / registration number', helper: 'MCA 21-digit Corporate Identity Number', icon: 'corporate_fare', mono: true },
  { id: 'udyamNumber', label: 'Udyam / MSME registration', helper: 'Enables MSME EMD waiver and purchase preference', icon: 'stars', mono: true },
];

const ALL_FIELDS = [...COMPANY, { id: 'state', label: 'State / UT' }, { id: 'pinCode', label: 'PIN code' }, ...CONTACT, ...REGISTRATION];

function ValidatedField({ f, value, onChange, disabled }: { f: FieldDef; value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <Field label={f.label} htmlFor={f.id} required={f.required} helper={f.helper} className={f.span === 2 ? 'md:col-span-2' : undefined}>
      <Input id={f.id} name={f.id} value={value} onChange={(e) => onChange(e.target.value)} required={f.required} maxLength={f.maxLength} disabled={disabled} className={f.mono ? 'font-mono tracking-wide' : undefined} />
    </Field>
  );
}

export function BidStep1Page() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const tenderRef = ref ? decodeURIComponent(ref) : BID_TENDER.ref;

  const [tender, setTender] = useState<ApiTender | null>(null);
  const [bid, setBid] = useState<ApiBid | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await api.get<ApiTender>(`/tenders/${encodeURIComponent(tenderRef)}`);
        const bids = await api.get<ApiBid[]>('/bids');
        const mine = bids.find((b) => (typeof b.tenderId === 'string' ? b.tenderId : b.tenderId._id) === t._id);
        if (cancelled) return;
        if (!mine) {
          setLoadError('No draft bid found for this tender. Start a bid from the tender details page.');
          return;
        }
        setTender(t);
        setBid(mine);
        const seeded: Record<string, string> = {};
        for (const f of ALL_FIELDS) seeded[f.id] = typeof mine.formData?.[f.id] === 'string' ? (mine.formData[f.id] as string) : '';
        setForm(seeded);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this bid draft.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenderRef]);

  const readOnly = !bid || bid.status !== 'draft';

  async function save(): Promise<boolean> {
    if (!bid || readOnly) return true;
    setSaving(true);
    setSaveStatus('Saving…');
    try {
      const updated = await api.patch<ApiBid>(`/bids/${bid._id}`, { formData: { ...bid.formData, ...form } });
      setBid(updated);
      setSaveStatus('Draft saved');
      return true;
    } catch (err) {
      setSaveStatus(err instanceof ApiError ? err.message : 'Could not save');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndExit() {
    if (await save()) navigate('/dashboard');
  }

  async function continueToDocuments() {
    if (await save()) navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/2`);
  }

  if (loadError) {
    return (
      <BidderPortalShell breadcrumb="Bid Submission">
        <Callout tone="danger" title="Could not open this bid">
          {loadError}
        </Callout>
      </BidderPortalShell>
    );
  }

  if (!tender || !bid) {
    return (
      <BidderPortalShell breadcrumb="Bid Submission">
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </BidderPortalShell>
    );
  }

  return (
    <BidderPortalShell breadcrumb="Bid Submission">
      <div className="flex flex-col gap-6 pb-28">
        <PageHeader
          breadcrumbs={[{ label: 'Tenders', to: '/tenders' }, { label: tenderRef, to: `/tenders/${encodeURIComponent(tenderRef)}` }, { label: 'Bid submission' }]}
          eyebrow={<StatusBadge tone="info">Step 1 of 3</StatusBadge>}
          title="Basic details"
          description="Confirm the bidder profile and authorized contact for this procurement."
        />

        <TenderContextBanner tenderRef={tenderRef} title={tender.title} authority={tender.department} draftId={bid.status === 'draft' ? 'Draft' : bid.bidReference ?? bid.status} deadline={new Date(tender.submissionDeadline).toLocaleString('en-IN')} daysRemaining={readOnly ? bid.status : 'Editable draft'} closed={readOnly} />
        <BidStepper current={1} />

        {readOnly && (
          <Callout tone="warning" title="This bid is no longer editable">
            The bid has status "{bid.status}" — fields are shown read-only.
          </Callout>
        )}

        <Callout tone="info" title="Bidder information notice">
          These fields are stored with your draft submission. Formats shown (PAN/GSTIN length) are cosmetic hints only — not verified against any external registry yet.
        </Callout>

        <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
          <Card padding="lg">
            <CardHeader icon="apartment" title="Company details" description="Statutory entity details" actions={<span className="text-[12px] text-on-surface-variant">* required</span>} />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              {COMPANY.map((f) => (
                <ValidatedField key={f.id} f={f} value={form[f.id] ?? ''} onChange={(v) => setForm((p) => ({ ...p, [f.id]: v }))} disabled={readOnly} />
              ))}
              <Field label="State / UT" htmlFor="state">
                <Select id="state" name="state" value={form.state ?? ''} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} disabled={readOnly}>
                  <option value="">Select state</option>
                  <option value="Tamil Nadu">Tamil Nadu (33)</option>
                  <option value="Karnataka">Karnataka (29)</option>
                  <option value="Maharashtra">Maharashtra (27)</option>
                  <option value="Andhra Pradesh">Andhra Pradesh (37)</option>
                  <option value="Kerala">Kerala (32)</option>
                </Select>
              </Field>
              <ValidatedField f={{ id: 'pinCode', label: 'PIN code', required: true, helper: '6-digit postal code', icon: 'pin_drop', mono: true, maxLength: 6 }} value={form.pinCode ?? ''} onChange={(v) => setForm((p) => ({ ...p, pinCode: v }))} disabled={readOnly} />
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader icon="badge" title="Authorized contact" description="Signatory responsible for declarations and contract execution" />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              {CONTACT.map((f) => (
                <ValidatedField key={f.id} f={f} value={form[f.id] ?? ''} onChange={(v) => setForm((p) => ({ ...p, [f.id]: v }))} disabled={readOnly} />
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader icon="assured_workload" title="Registration details" description="Fiscal identity, GST and enterprise category" />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              {REGISTRATION.map((f) => (
                <ValidatedField key={f.id} f={f} value={form[f.id] ?? ''} onChange={(v) => setForm((p) => ({ ...p, [f.id]: v }))} disabled={readOnly} />
              ))}
            </div>
          </Card>
        </form>
      </div>

      <BidActionBar
        left={
          <>
            <Button variant="secondary" leftIcon="save" loading={saving} onClick={saveAndExit} disabled={readOnly}>
              Save & exit
            </Button>
            {saveStatus && (
              <span className="hidden items-center gap-2 text-body-sm text-on-surface-variant sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                {saveStatus}
              </span>
            )}
          </>
        }
        right={
          <Button size="lg" rightIcon="arrow_forward" loading={saving} onClick={continueToDocuments}>
            Continue to documents
          </Button>
        }
      />
    </BidderPortalShell>
  );
}
