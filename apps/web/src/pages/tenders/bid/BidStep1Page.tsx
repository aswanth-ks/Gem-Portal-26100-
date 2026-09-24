// Bid Submission Workspace — Step 1: Basic details. Ported from Stitch screen
// "Bid Submission Workspace (Step 01: Basic Details)" (project
// 6921642772921774119, screen d3228cb982254dd19395225f75461470).
//
// TODO: bind fields to the authenticated bidder profile and real validation
// once POST /api/tenders/:ref/bid exists; wire "Save & exit" to a real draft.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import { Button, Callout, Card, CardHeader, Field, Icon, Input, PageHeader, Select, StatusBadge } from '@/components/primitives';
import { BID_TENDER, BidActionBar, BidStepper, TenderContextBanner } from './BidWorkspaceChrome';

interface FieldDef {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  helper?: string;
  icon?: string;
  mono?: boolean;
  maxLength?: number;
  valid?: string;
  span?: 2;
}

function ValidatedField({ f }: { f: FieldDef }) {
  return (
    <Field label={f.label} htmlFor={f.id} required={f.required} helper={f.helper} valid={f.valid ?? 'Valid format'} className={f.span === 2 ? 'md:col-span-2' : undefined}>
      <Input id={f.id} name={f.id} defaultValue={f.value} required={f.required} maxLength={f.maxLength} rightIcon={f.icon} state="valid" className={f.mono ? 'font-mono tracking-wide' : undefined} />
    </Field>
  );
}

const COMPANY: FieldDef[] = [
  { id: 'companyName', label: 'Registered company name', required: true, value: 'ABC Engineering Pvt Ltd', helper: 'Must match the Certificate of Incorporation exactly', icon: 'domain', span: 2 },
  { id: 'regAddress', label: 'Registered address', required: true, value: 'Plot No. 42, Sector 8, Industrial Estate, Guindy', helper: 'Principal place of business declared for GST', icon: 'location_on', span: 2 },
  { id: 'city', label: 'City', required: true, value: 'Chennai' },
];

const CONTACT: FieldDef[] = [
  { id: 'contactName', label: 'Full name', required: true, value: 'Rajesh Kumar', helper: 'As registered in the Class-3 DSC token', icon: 'person' },
  { id: 'designation', label: 'Designation', value: 'Managing Director & Authorized Signatory', helper: 'Official executive or managerial title', icon: 'work' },
  { id: 'mobileNumber', label: 'Mobile number', required: true, value: '+91 98401 23456', helper: 'For OTP broadcast and reverse auctions', icon: 'phone_iphone', mono: true },
  { id: 'emailAddress', label: 'Email address', required: true, value: 'rajesh.kumar@abcengg.in', helper: 'Notifications and contract addenda', icon: 'mail', mono: true },
];

const REGISTRATION: FieldDef[] = [
  { id: 'panNumber', label: 'Permanent Account Number (PAN)', required: true, value: 'AAACA1122K', helper: '10-character Income Tax identifier', icon: 'credit_card', mono: true, maxLength: 10 },
  { id: 'gstinNumber', label: 'GSTIN', required: true, value: '33AAACA1122K1Z9', helper: '15-digit GST identification number', icon: 'account_balance', mono: true, maxLength: 15, valid: 'State 33 matched' },
  { id: 'cinNumber', label: 'CIN / registration number', value: 'U74999TN2018PTC112349', helper: 'MCA 21-digit Corporate Identity Number', icon: 'corporate_fare', mono: true },
  { id: 'udyamNumber', label: 'Udyam / MSME registration', value: 'UDYAM-TN-02-0048291', helper: 'Enables MSME EMD waiver and purchase preference', icon: 'stars', mono: true },
];

export function BidStep1Page() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const tenderRef = ref ? decodeURIComponent(ref) : BID_TENDER.ref;
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Draft saved just now · encrypted in workspace');

  function saveAndExit() {
    setSaving(true);
    setSaveStatus('Saving workspace draft…');
    window.setTimeout(() => {
      setSaving(false);
      setSaveStatus('Draft saved just now · encrypted in workspace');
    }, 650);
  }

  return (
    <BidderPortalShell breadcrumb="Bid Submission">
      <div className="flex flex-col gap-8 pb-28">
        <PageHeader
          breadcrumbs={[{ label: 'Tenders', to: '/tenders' }, { label: tenderRef, to: `/tenders/${encodeURIComponent(tenderRef)}` }, { label: 'Bid submission' }]}
          eyebrow={<StatusBadge tone="info">Step 1 of 3</StatusBadge>}
          title="Basic details"
          description="Confirm the legal bidder profile and authorized contact registered for this procurement."
          actions={
            <div className="flex items-center gap-3 rounded-card border border-success-border bg-success-container px-4 py-2.5">
              <Icon name="verified" size="lg" className="text-success" fill />
              <div className="leading-tight">
                <div className="text-[12px] text-success-on-container/80">Format verification</div>
                <div className="text-[14px] font-semibold text-success-on-container">11 of 11 validated</div>
              </div>
            </div>
          }
        />

        <TenderContextBanner tenderRef={tenderRef} />
        <BidStepper current={1} />

        <Callout tone="info" title="Bidder information notice">
          Details entered here are cryptographically bound to your submission hash. Make sure they match your statutory PAN, GSTIN and Class-3 DSC credentials.
        </Callout>

        <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
          <Card padding="lg">
            <CardHeader icon="apartment" title="Company details" description="Statutory entity registered in the CPCL vendor directory" actions={<span className="text-[12px] text-on-surface-variant">* required</span>} />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              {COMPANY.map((f) => (
                <ValidatedField key={f.id} f={f} />
              ))}
              <Field label="State / UT" htmlFor="state" required valid="Selected">
                <Select id="state" name="state" defaultValue="Tamil Nadu" required>
                  <option value="Tamil Nadu">Tamil Nadu (33)</option>
                  <option value="Karnataka">Karnataka (29)</option>
                  <option value="Maharashtra">Maharashtra (27)</option>
                  <option value="Andhra Pradesh">Andhra Pradesh (37)</option>
                  <option value="Kerala">Kerala (32)</option>
                </Select>
              </Field>
              <ValidatedField f={{ id: 'pinCode', label: 'PIN code', required: true, value: '600032', helper: '6-digit postal code', icon: 'pin_drop', mono: true, maxLength: 6 }} />
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader icon="badge" title="Authorized contact" description="Signatory responsible for declarations and contract execution" actions={<StatusBadge tone="info" icon="key">DSC bound</StatusBadge>} />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              {CONTACT.map((f) => (
                <ValidatedField key={f.id} f={f} />
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader icon="assured_workload" title="Registration details" description="Fiscal identity, GST compliance and enterprise category" actions={<StatusBadge tone="success" icon="sync">GST portal sync</StatusBadge>} />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              {REGISTRATION.map((f) => (
                <ValidatedField key={f.id} f={f} />
              ))}
            </div>
          </Card>
        </form>
      </div>

      <BidActionBar
        left={
          <>
            <Button variant="secondary" leftIcon="save" loading={saving} onClick={saveAndExit}>
              Save & exit
            </Button>
            <span className="hidden items-center gap-2 text-body-sm text-on-surface-variant sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              {saveStatus}
            </span>
          </>
        }
        right={
          <>
            <div className="mr-2 hidden text-right leading-tight lg:block">
              <div className="text-[12px] text-on-surface-variant">Next</div>
              <div className="text-[13px] font-semibold text-on-surface">Upload documents</div>
            </div>
            <Button size="lg" rightIcon="arrow_forward" onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/2`)}>
              Continue to documents
            </Button>
          </>
        }
      />
    </BidderPortalShell>
  );
}
