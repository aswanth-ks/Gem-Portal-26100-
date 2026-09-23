// Bid Submission Workspace — Step 01: Basic Details. Ported from the Stitch
// screen "CPCL Bidder Portal - Bid Submission Workspace (Step 01: Basic
// Details)" (project: GeM Portal). Source: Stitch project
// 6921642772921774119, screen d3228cb982254dd19395225f75461470.
//
// Reached from the Tender Details page's "Start Bid" / "Continue Bid" CTA.
//
// TODO: replace the static "valid format" checks and form field values with
// real client-side validation and data bound to the authenticated bidder
// profile (features/auth, features/tenders) once POST /api/tenders/:ref/bid
// exists on the gateway. TODO: wire "Save & Exit" to actually persist a
// draft instead of the demo status-text toggle.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import { BID_TENDER, BidStepper, TenderContextBanner } from './BidWorkspaceChrome';

function ValidatedField({
  id,
  label,
  required,
  value,
  hint,
  icon,
  mono,
  uppercase,
  maxLength,
  status = 'Valid format',
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  hint?: string;
  icon: string;
  mono?: boolean;
  uppercase?: boolean;
  maxLength?: number;
  status?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" htmlFor={id}>
        <span>
          {label} {required && <span className="text-error font-bold">*</span>}
        </span>
        <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1 font-semibold">
          <span className="material-symbols-outlined text-[14px]">check_circle</span> {status}
        </span>
      </label>
      <div className="relative">
        <input
          className={
            'w-full h-10 px-space-md bg-surface-container-lowest rounded-lg font-body-md text-body-md text-on-surface outline-none focus:bg-surface-container-low transition-all' +
            (mono ? ' font-mono' : '') +
            (uppercase ? ' uppercase tracking-wider' : '')
          }
          defaultValue={value}
          id={id}
          maxLength={maxLength}
          name={id}
          required={required}
          type="text"
        />
        {icon && (
          <span className={'material-symbols-outlined absolute right-3 top-2.5 text-[20px] ' + (required ? 'text-secondary' : 'text-on-surface-variant')}>{icon}</span>
        )}
      </div>
      {hint && <span className="font-body-sm text-body-sm text-on-surface-variant">{hint}</span>}
    </div>
  );
}

export function BidStep1Page() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const tenderRef = ref ? decodeURIComponent(ref) : BID_TENDER.ref;
  const [saveStatus, setSaveStatus] = useState('Draft saved just now · Encrypted in workspace');

  function saveAndExit() {
    setSaveStatus('Saving workspace draft...');
    window.setTimeout(() => setSaveStatus('● Draft saved just now · Encrypted in workspace'), 650);
  }

  function continueToStep2() {
    navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/2`);
  }

  return (
    <BidderPortalShell breadcrumb="Bid Submission">
      <div className="flex flex-col w-full pb-28 px-space-lg">
        <TenderContextBanner />
        <BidStepper current={1} />

        {/* Page Title & Notice Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="px-space-xs py-0.5 rounded-md bg-secondary text-on-secondary font-label-sm text-label-sm uppercase font-semibold tracking-wider">Step 1 of 3</span>
              <span className="px-space-xs py-0.5 rounded-md bg-surface-container-high text-on-surface font-label-sm text-label-sm font-mono">{BID_TENDER.draftId} · DRAFT</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Basic Details</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Provide the legal bidder profile and authorized contact information registered for this procurement process.</p>
          </div>
          <div className="flex items-center gap-space-sm px-space-md py-space-xs rounded-lg bg-surface-container-lowest shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[20px] text-secondary">verified</span>
            <div className="text-right">
              <div className="font-label-sm text-label-sm text-on-surface-variant">Format Verification</div>
              <div className="font-label-md text-label-md text-on-surface font-bold">11 of 11 Validated</div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-space-md mb-space-lg flex items-start gap-space-md shadow-sm">
          <span className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5">info</span>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface font-bold">Bidder Information Notice</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Information provided here will be permanently cryptographically bound to your tender submission hash. Ensure matching particulars
              against statutory PAN, GSTIN, and Class-3 DSC credentials.
            </span>
          </div>
        </div>

        <form className="flex flex-col gap-space-lg" id="basicDetailsForm" onSubmit={(e) => e.preventDefault()}>
          {/* Section 1: Company Details */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
            <div className="flex items-center justify-between pb-space-md mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">apartment</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Company Details</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Statutory enterprise entity registered in the CPCL vendor directory</p>
                </div>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">* Required for compliance</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="md:col-span-2">
                <ValidatedField id="companyName" label="Registered Company Name" required value="ABC Engineering Pvt Ltd" hint="Must match exactly with Certificate of Incorporation" icon="domain" />
              </div>
              <div className="md:col-span-2">
                <ValidatedField id="regAddress" label="Registered Address" required value="Plot No. 42, Sector 8, Industrial Estate, Guindy" hint="Premises address declared for GST principal place of business" icon="location_on" />
              </div>
              <ValidatedField id="city" label="City" required value="Chennai" icon="" />
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" htmlFor="state">
                  <span>
                    State / UT <span className="text-error font-bold">*</span>
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Selected
                  </span>
                </label>
                <div className="relative">
                  <select
                    className="w-full h-10 px-space-md pr-8 bg-surface-container-lowest rounded-lg font-body-md text-body-md text-on-surface outline-none focus:bg-surface-container-low transition-all appearance-none cursor-pointer"
                    defaultValue="Tamil Nadu"
                    id="state"
                    name="state"
                    required
                  >
                    <option value="Tamil Nadu">Tamil Nadu (33)</option>
                    <option value="Karnataka">Karnataka (29)</option>
                    <option value="Maharashtra">Maharashtra (27)</option>
                    <option value="Andhra Pradesh">Andhra Pradesh (37)</option>
                    <option value="Kerala">Kerala (32)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant text-[20px] pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="md:col-span-2 max-w-sm">
                <ValidatedField id="pinCode" label="PIN Code" required value="600032" hint="6-digit Indian postal code" icon="pin_drop" mono maxLength={6} />
              </div>
            </div>
          </div>

          {/* Section 2: Authorized Contact */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
            <div className="flex items-center justify-between pb-space-md mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Authorized Contact</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Signatory responsible for statutory declaration and contract execution</p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-space-xs py-0.5 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm font-semibold">
                <span className="material-symbols-outlined text-[14px]">key</span> DSC Bound
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <ValidatedField id="contactName" label="Full Name" required value="Rajesh Kumar" hint="As registered in digital certificate token (Class-3 DSC)" icon="person" />
              <ValidatedField id="designation" label="Designation" value="Managing Director & Authorized Signatory" hint="Official executive or managerial title" icon="work" />
              <ValidatedField id="mobileNumber" label="Mobile Number" required value="+91 98401 23456" hint="Direct phone for OTP broadcast and reverse auctions" icon="phone_iphone" mono />
              <ValidatedField id="emailAddress" label="Email Address" required value="rajesh.kumar@abcengg.in" hint="Procurement notifications and contract addenda delivery" icon="mail" mono />
            </div>
          </div>

          {/* Section 3: Registration Details */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
            <div className="flex items-center justify-between pb-space-md mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">assured_workload</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Registration Details</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Fiscal identity, GST compliance, and enterprise class categorization</p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-space-xs py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[14px]">fact_check</span> GST Portal Sync Active
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <ValidatedField id="panNumber" label="Permanent Account Number (PAN)" required value="AAACA1122K" hint="Income Tax Department 10-character alphanumeric" icon="credit_card" mono uppercase maxLength={10} />
              <ValidatedField id="gstinNumber" label="GSTIN" required value="33AAACA1122K1Z9" status="State code 33 matched" hint="15-digit Goods and Services Tax Identification Number" icon="account_balance" mono uppercase maxLength={15} />
              <ValidatedField id="cinNumber" label="CIN / Registration Number" value="U74999TN2018PTC112349" hint="Ministry of Corporate Affairs 21-digit Corporate Identity Number" icon="corporate_fare" mono uppercase />
              <div className="flex flex-col gap-1">
                <ValidatedField id="udyamNumber" label="Udyam / MSME Registration Number" value="UDYAM-TN-02-0048291" icon="stars" mono uppercase />
                <span className="font-body-sm text-body-sm text-secondary font-semibold">Applicable for MSME EMD waiver and procurement preference</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-[250px] right-0 bg-surface-container-lowest/95 backdrop-blur-md px-space-lg py-space-sm z-30 shadow-md">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-md w-full sm:w-auto justify-between sm:justify-start">
            <button className="h-10 px-space-md rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-space-xs" onClick={saveAndExit} type="button">
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>Save &amp; Exit</span>
            </button>
            <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="truncate">{saveStatus}</span>
            </div>
          </div>
          <div className="flex items-center gap-space-md w-full sm:w-auto justify-end">
            <div className="hidden lg:flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Next: Upload Technical Envelope</span>
              <span className="font-body-sm text-body-sm text-on-surface font-bold">Step 2: Documents</span>
            </div>
            <button
              className="w-full sm:w-auto h-10 px-space-lg rounded-lg bg-secondary text-on-secondary font-label-lg text-label-lg font-bold hover:bg-secondary-container transition-all flex items-center justify-center gap-space-xs shadow-sm"
              onClick={continueToStep2}
              type="button"
            >
              <span>Continue to Documents (Step 2)</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </BidderPortalShell>
  );
}
