// Bid Submission Workspace — Step 03: Review & Confirm. Ported from the
// Stitch screen "CPCL Bidder Portal - Bid Submission Workspace (Step 03:
// Review & Confirm)" (project: GeM Portal). Source: Stitch project
// 6921642772921774119, screen 7476c41c6e4a42d19be361cc8aa22aa5.
//
// This screen's Stitch prototype ships 6 interactive states (Review &
// Ready / Confirm Modal / Submitting Loader / Success Receipt / Submission
// Error / Tender Closed) driven by an inline <script> state-switcher —
// reimplemented below as React state. The "Interactive Prototype State"
// switcher strip is kept (as the other ported screens keep theirs) so the
// demo states remain inspectable; the real submit flow (declarations ->
// confirm modal -> submitting -> success/error) also drives the same state
// via executeSubmissionFlow().
//
// TODO: replace the mock declarations/receipt data and the demo submission
// timer with a real POST /api/tenders/:ref/bid/submit call once the gateway
// exposes it, and drop the prototype state switcher once real submission
// failure/success responses can be exercised directly.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import { BID_TENDER, BidStepper } from './BidWorkspaceChrome';

type ScreenState = 'default' | 'modal' | 'submitting' | 'success' | 'error' | 'closed';

const STATE_BUTTONS: { id: ScreenState; label: string }[] = [
  { id: 'default', label: '1. Review & Ready' },
  { id: 'modal', label: '2. Confirm Modal' },
  { id: 'submitting', label: '3. Submitting Loader' },
  { id: 'success', label: '4. Success Receipt' },
  { id: 'error', label: '5. Submission Error' },
  { id: 'closed', label: '6. Tender Closed' },
];

const DOCUMENTS_SUMMARY = [
  { n: '01', name: 'Permanent Account Number (PAN) Card', desc: 'Statutory Tax Entity Verification', file: 'PAN_Certificate.pdf', size: '1.2 MB', type: 'Mandatory', status: 'Staged & Signed' },
  { n: '02', name: 'GST Registration Certificate', desc: 'Form GST REG-06 with Annexure A & B', file: 'GST_Certificate.pdf', size: '856 KB', type: 'Mandatory', status: 'Staged & Signed' },
  { n: '03', name: 'Audited Financial Statements (Last 3 FYs)', desc: 'Balance Sheet & P&L Certified by CA with UDIN', file: 'Financial_Statements_2025.pdf', size: '3.4 MB', type: 'Mandatory', status: 'Staged & Signed' },
  { n: '04', name: 'Udyam / MSME Certificate', desc: 'Statutory exemption claim under PP Policy 2012', file: 'Udyam_Certificate.pdf', size: '642 KB', type: 'Conditional', status: 'EMD Exemption Claimed' },
  { n: '05', name: 'OEM Manufacturer Authorization Form (MAF)', desc: 'Direct OEM Authorization for CCTV Optics & NVRs', file: 'OEM_Authorization.pdf', size: '1.8 MB', type: 'Mandatory', status: 'Staged & Signed' },
  { n: '06', name: 'Technical Compliance Statement (Section IV)', desc: 'Line-by-line parameter matrix compliance signed', file: 'Technical_Compliance.pdf', size: '2.1 MB', type: 'Mandatory', status: 'Staged & Signed' },
  { n: '07', name: 'Experience & Past Work Order Certificate', desc: 'Proof of 3 similar public infrastructure camera rollouts', file: 'Experience_Certificate.pdf', size: '1.5 MB', type: 'Mandatory', status: 'Staged & Signed' },
];

const DECLARATIONS = [
  { id: 'decl-1', text: 'I confirm that the information provided in this bid is accurate, authentic, and complete to the best of my knowledge and belief.', sub: 'In accordance with CPCL Bidder Undertaking Norms (Clause 5.1).' },
  { id: 'decl-2', text: 'I confirm that all uploaded documents correspond directly to the bidder and satisfy tender specifications without misrepresentation.', sub: 'Validates genuine OEM specifications and certified financial statements without alteration.' },
  { id: 'decl-3', text: 'I have reviewed and agree to abide by the General Conditions of Contract (GCC), Special Conditions of Contract (SCC), and CVC integrity guidelines.', sub: 'Statutory adherence to anti-collusion, transparent bidding, and prompt execution agreements.' },
];

export function BidStep3Page() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const tenderRef = ref ? decodeURIComponent(ref) : BID_TENDER.ref;

  const [screen, setScreen] = useState<ScreenState>('default');
  const [declarations, setDeclarations] = useState({ 'decl-1': true, 'decl-2': true, 'decl-3': true });
  const [loaderStage, setLoaderStage] = useState<0 | 1>(0);

  const declaredCount = Object.values(declarations).filter(Boolean).length;
  const allDeclared = declaredCount === 3;

  useEffect(() => {
    if (screen !== 'submitting') {
      setLoaderStage(0);
      return;
    }
    const t1 = window.setTimeout(() => setLoaderStage(1), 1000);
    const t2 = window.setTimeout(() => setScreen('success'), 2200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [screen]);

  function openConfirmationModal() {
    if (!allDeclared) {
      window.alert('Please affirm all three statutory declarations prior to submitting the bid.');
      return;
    }
    setScreen('modal');
  }

  function executeSubmissionFlow() {
    setScreen('submitting');
  }

  return (
    <BidderPortalShell breadcrumb="Bid Submission">
      <div className="flex flex-col w-full px-space-lg py-space-md">
        {/* Interactive Prototype States Controller / Switcher Bar */}
        <div className="mb-space-md p-space-sm bg-surface-container-high rounded-lg flex flex-wrap items-center justify-between gap-space-sm shadow-sm">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface">
            <span className="material-symbols-outlined text-[18px] text-secondary">tune</span>
            <span className="uppercase tracking-wider font-semibold">Interactive Prototype State:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATE_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                className={
                  'px-space-sm py-1 rounded font-label-sm text-label-sm transition-all ' +
                  (screen === btn.id ? 'bg-primary-container text-on-primary font-semibold shadow-sm' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low')
                }
                onClick={() => setScreen(btn.id)}
                type="button"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {(screen === 'default' || screen === 'modal' || screen === 'submitting') && (
          <div className="flex flex-col gap-space-md">
            {/* Compact Tender Context Banner */}
            <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-space-sm">
                  <span className="font-mono font-semibold text-label-md px-2 py-0.5 rounded bg-surface-container text-on-surface">{tenderRef}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant"></span>
                    DRAFT
                  </span>
                  <span className="font-label-sm text-label-sm text-error flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    Deadline: {BID_TENDER.deadline} (2 Days Remaining)
                  </span>
                </div>
                <h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight mt-1">{BID_TENDER.title}</h1>
              </div>
              <div className="flex items-center gap-space-md self-start lg:self-center">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold flex items-center justify-end gap-1 text-secondary">
                    <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    Encrypted Workspace
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Autosaved just now</span>
                </div>
                <div className="h-8 w-px bg-outline-variant hidden sm:block"></div>
                <div className="px-space-sm py-1.5 rounded bg-surface-container-low flex items-center gap-2">
                  <span className="font-mono text-label-sm text-on-surface-variant">Draft ID:</span>
                  <span className="font-mono font-semibold text-label-sm text-on-surface">{BID_TENDER.draftId}</span>
                </div>
              </div>
            </div>

            <BidStepper current={3} />

            {/* Statutory Notice Callout Banner */}
            <div className="bg-surface-container-low rounded-lg p-space-md flex items-start gap-space-md shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-secondary-container/15 text-secondary flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[22px]">info</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-label-lg text-label-lg text-on-surface font-semibold">Important CVC Procurement Advisory</span>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">CLAUSE-24.B</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Once submitted, the bid cannot be edited unless the tender authority issues a formal corrigendum permitting revision or withdrawal
                  under CVC guidelines. Please verify that all statutory credentials and uploaded specifications match the qualifying tender
                  mandates.
                </p>
              </div>
            </div>

            {/* SECTION 1: BIDDER DETAILS REVIEW */}
            <section className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
              <div className="p-space-md bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface">
                    <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                  </div>
                  <div>
                    <h2 className="font-label-lg text-label-lg text-on-surface font-semibold">1. Bidder Details</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Validated corporate identity from Vendor Registry</p>
                  </div>
                </div>
                <button
                  className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors shadow-sm"
                  onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/1`)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Edit Basic Details
                </button>
              </div>
              <div className="p-space-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Registered Entity Name</span>
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">ABC Engineering Pvt Ltd</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant font-mono">Vendor Ref: BIDDER-00482</span>
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Registered Corporate Address</span>
                    <span className="font-body-md text-body-md text-on-surface">45 Industrial Estate Road, Guindy, Chennai, Tamil Nadu - 600032</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Authorized Contact Signatory</span>
                    <span className="font-label-lg text-label-lg text-on-surface font-medium">Arun Kumar</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Procurement Manager</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Mobile Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-body-md text-body-md font-mono text-on-surface">+91 98401 23456</span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-container text-secondary font-label-sm text-label-sm font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span> OTP Verified
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Official E-Mail</span>
                    <span className="font-body-md text-body-md font-mono text-on-surface">procurement@abcengineering.example</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Corporate PAN</span>
                    <span className="font-body-md text-body-md font-mono font-semibold text-on-surface">ABCDE1234F</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">GSTIN Identifier</span>
                    <div className="flex items-center gap-2">
                      <span className="font-body-md text-body-md font-mono font-semibold text-on-surface">33ABCDE1234F1Z5</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">(State 33 - TN)</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">CIN / Incorporation Number</span>
                    <span className="font-body-md text-body-md font-mono text-on-surface">U12345TN2020PTC000000</span>
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-3 p-space-sm rounded-lg bg-surface-container-low">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Udyam MSME Registry:</span>
                        <span className="font-mono font-bold text-label-md text-on-surface">UDYAM-TN-00-0000000</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">Micro &amp; Small Enterprise</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-secondary font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        Eligible for Tender Fee &amp; EMD Waiver (GoI Policy)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-space-md pt-space-sm flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">lock</span>
                    Information verified against CPCL corporate profile credentials. Not directly editable on this screen.
                  </span>
                  <span className="font-mono text-label-sm">KYC Token: KYC-2026-VAL-9912</span>
                </div>
              </div>
            </section>

            {/* SECTION 2: UPLOADED DOCUMENTS SUMMARY */}
            <section className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
              <div className="p-space-md bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface">
                    <span className="material-symbols-outlined text-[20px]">folder_managed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-label-lg text-label-lg text-on-surface font-semibold">2. Uploaded Documents</h2>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">7 of 7 Uploaded &amp; Staged</span>
                  </div>
                </div>
                <button
                  className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors shadow-sm"
                  onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/2`)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  Review Documents
                </button>
              </div>
              <div className="p-space-md">
                <div className="overflow-x-auto rounded-lg bg-surface-container-lowest">
                  <table className="w-full text-left font-body-md text-body-md border-collapse">
                    <thead>
                      <tr className="bg-primary-container text-on-primary font-label-sm text-label-sm">
                        <th className="py-2.5 px-4 font-semibold w-12 text-center">#</th>
                        <th className="py-2.5 px-4 font-semibold">Document Title / Requirement</th>
                        <th className="py-2.5 px-4 font-semibold">Attached File</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Size</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Classification</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Integrity Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-0">
                      {DOCUMENTS_SUMMARY.map((doc, idx) => (
                        <tr key={doc.n} className={'hover:bg-surface-container-low transition-colors ' + (idx % 2 === 1 ? 'bg-surface-container-low/40' : 'bg-surface-container-lowest')}>
                          <td className="py-3 px-4 font-mono font-medium text-center text-on-surface-variant">{doc.n}</td>
                          <td className="py-3 px-4">
                            <div className="font-label-md text-label-md text-on-surface">{doc.name}</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">{doc.desc}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1.5 font-mono text-label-sm text-secondary font-semibold hover:underline cursor-pointer">
                              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                              {doc.file}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-body-sm text-right text-on-surface-variant">{doc.size}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm uppercase font-semibold">{doc.type}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary font-bold">
                              <span className="material-symbols-outlined text-[16px]">verified</span>
                              {doc.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-space-md p-space-sm rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-on-surface shrink-0 mt-0.5">policy</span>
                  <div>
                    <strong className="font-medium text-on-surface">Document Processing &amp; Verification Protocol:</strong> Uploaded documents will
                    be decrypted, processed, and verified after official tender opening. Upload confirmation verifies cryptographic integrity and
                    reception into CPCL&apos;s staging vault, but does not by itself constitute statutory compliance or final technical acceptance.
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3: STATUTORY BID DECLARATIONS */}
            <section className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg">
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface">
                    <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                  </div>
                  <div>
                    <h2 className="font-label-lg text-label-lg text-on-surface font-semibold">3. Statutory Declarations</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Mandatory legal and integrity affirmations required by Central Vigilance Commission (CVC)</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">3 of 3 Required</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded-lg mb-space-md text-on-surface-variant font-body-sm text-body-sm">
                All declarations must be explicitly affirmed by the authorized signatory prior to bid submission. False declarations may invite
                penal action including debarment under Public Procurement rules.
              </div>
              <div className="flex flex-col gap-space-sm">
                {DECLARATIONS.map((decl) => (
                  <label key={decl.id} className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-start gap-space-sm cursor-pointer select-none">
                    <input
                      checked={declarations[decl.id as keyof typeof declarations]}
                      className="mt-1 w-4 h-4 rounded text-secondary bg-surface-container-lowest border-0 focus:ring-2 focus:ring-secondary shrink-0 cursor-pointer"
                      onChange={(e) => setDeclarations((prev) => ({ ...prev, [decl.id]: e.target.checked }))}
                      type="checkbox"
                    />
                    <div className="flex flex-col">
                      <span className="font-body-md text-body-md text-on-surface font-medium leading-snug">{decl.text}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{decl.sub}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-space-md p-space-sm rounded-lg bg-surface-container flex flex-wrap items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px] text-secondary">token</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">Authorized Signatory: Arun Kumar (Procurement Manager)</span>
                    <span className="font-mono text-label-sm text-on-surface-variant">Digital Signature Certificate: Class-3 DSC Token (CPCL-DSC-V3-IND-8849) • Ready &amp; Bound</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-secondary font-label-sm text-label-sm font-bold flex items-center gap-1 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  DSC Verified
                </span>
              </div>
            </section>

            {/* SECTION 4: "BEFORE YOU SUBMIT" SUMMARY PANEL */}
            <section className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg">
              <div className="flex items-center gap-space-sm mb-space-md">
                <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface">
                  <span className="material-symbols-outlined text-[20px]">fact_check</span>
                </div>
                <div>
                  <h2 className="font-label-lg text-label-lg text-on-surface font-semibold">4. Before You Submit</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Final readiness checkpoint for digital submission sealing</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-sm mb-space-md">
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tender Ref</span>
                  <span className="font-mono font-bold text-label-md text-on-surface mt-1 truncate">{tenderRef}</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Submission Deadline</span>
                  <span className="font-label-md text-label-md text-on-surface mt-1">04 Oct 2026, 17:00</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Bid State</span>
                  <span className="font-label-md text-label-md text-secondary font-bold mt-1">DRAFT (Ready to Lock)</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Mandatory Files</span>
                  <span className="font-label-md text-label-md text-secondary font-bold mt-1">7 of 7 Attached</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Declarations</span>
                  <span className={'font-label-md text-label-md font-bold mt-1 ' + (allDeclared ? 'text-secondary' : 'text-error')}>{declaredCount} of 3 Confirmed</span>
                </div>
              </div>
              <div className="p-space-sm rounded-lg bg-primary-container text-on-primary flex items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px] text-secondary-fixed">gavel</span>
                  <span className="font-body-md text-body-md text-on-primary">
                    Your bid will be recorded as submitted only after selecting <strong>&quot;Submit Bid&quot;</strong> and confirming the irreversible
                    submission prompt.
                  </span>
                </div>
                <span className="font-mono text-label-sm text-primary-fixed-dim whitespace-nowrap hidden lg:inline">SHA-256 Vault Ready</span>
              </div>
            </section>

            {/* STICKY BOTTOM ACTION BAR */}
            <div className="sticky bottom-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md rounded-lg shadow-lg p-space-md flex flex-wrap items-center justify-between gap-space-md">
              <button
                className="inline-flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors"
                onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/2`)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Documents
              </button>
              <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[18px] text-on-surface">alarm</span>
                <span>
                  Submission closes: <strong className="text-on-surface font-semibold">{BID_TENDER.deadline}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-medium">(2 days remaining)</span>
              </div>
              <div className="flex items-center gap-space-sm">
                <button className="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium transition-colors" type="button">
                  Save &amp; Exit
                </button>
                <button
                  className={'inline-flex items-center gap-2 px-space-lg py-2 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary font-label-lg text-label-lg font-bold shadow-md transition-all' + (!allDeclared ? ' opacity-50 cursor-not-allowed' : '')}
                  disabled={!allDeclared}
                  onClick={openConfirmationModal}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  Submit Bid
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STATE: SUBMISSION ERROR */}
        {screen === 'error' && (
          <div className="flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center mb-space-md">
                <span className="material-symbols-outlined text-[36px]">error</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-space-xs">Submission Failed to Complete</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-space-md">
                The cryptographic handshake with the CPCL Digital Vault was interrupted. Your bid draft remains safe and unmodified in your workspace.
              </p>
              <div className="w-full max-w-2xl bg-surface-container-low rounded-lg p-space-md text-left mb-space-lg">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-sm text-label-sm text-error font-semibold uppercase tracking-wider">Error Diagnostic</span>
                  <span className="font-mono text-label-sm text-on-surface-variant">Code: ERR-DSC-TIMEOUT-504</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface">
                  <strong>DSC Token Response Timeout:</strong> Digital Signature Certificate Token response exceeded the 30-second threshold. Ensure
                  the USB Crypto Token is seated properly and your DSC utility driver is active.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-space-md">
                <button className="px-space-lg py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors" onClick={() => setScreen('default')} type="button">
                  Return to Review Workspace
                </button>
                <button className="inline-flex items-center gap-2 px-space-lg py-2.5 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary font-label-md text-label-md font-bold shadow-md transition-all" onClick={executeSubmissionFlow} type="button">
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Retry Submission
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STATE: TENDER CLOSED */}
        {screen === 'closed' && (
          <div className="flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center mb-space-md">
                <span className="material-symbols-outlined text-[36px]">timer_off</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-space-xs">Tender Submission Window Closed</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-space-md">
                The official deadline for tender reference <strong className="text-on-surface">{tenderRef}</strong> passed on{' '}
                <strong>04 Oct 2026 at 17:00:00 IST</strong>. In accordance with Central Vigilance Commission regulations, no further bids or
                revisions can be accepted.
              </p>
              <div className="p-space-md bg-surface-container-low rounded-lg w-full max-w-md text-left font-body-sm text-body-sm text-on-surface-variant mb-space-lg">
                <div className="flex justify-between py-1">
                  <span>Tender Reference:</span>
                  <span className="font-mono font-semibold text-on-surface">{tenderRef}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Server Lock Timestamp:</span>
                  <span className="font-mono text-on-surface">04-OCT-2026 17:00:01 IST</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Draft State:</span>
                  <span className="font-semibold text-error">EXPIRED (Not Submitted)</span>
                </div>
              </div>
              <button className="px-space-lg py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors" onClick={() => navigate('/dashboard')} type="button">
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* STATE: SUCCESS RECEIPT */}
        {screen === 'success' && (
          <div className="flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center mb-space-sm shadow-sm">
                <span className="material-symbols-outlined text-[36px]">verified</span>
              </div>
              <div className="inline-flex items-center gap-2 px-space-sm py-1 rounded-full bg-surface-container text-on-surface font-mono font-semibold text-label-sm mb-2">
                <span>OFFICIAL E-PROCUREMENT RECEIPT</span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span>SR-2026-00418</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Bid Submitted Successfully</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-1 mb-space-lg">
                Your bid for {BID_TENDER.title} has been sealed and successfully recorded in the CPCL e-Procurement Digital Vault.
              </p>
              <div className="w-full max-w-3xl bg-surface-container-low rounded-lg p-space-lg text-left shadow-sm mb-space-lg">
                <div className="flex flex-wrap items-center justify-between pb-space-sm mb-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-3 h-3 rounded-full bg-secondary"></span>
                    <span className="font-label-lg text-label-lg text-on-surface font-bold uppercase tracking-wider">Central Public Procurement Ledger</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold">STATUS: SUBMITTED (CRYPTOGRAPHICALLY SEALED)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-space-lg gap-y-space-sm font-body-md text-body-md pt-space-xs">
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">Bid Submission Reference</span>
                    <span className="font-mono font-bold text-label-lg text-secondary">BID-2026-00418</span>
                  </div>
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">Submission Timestamp</span>
                    <span className="font-mono font-semibold text-on-surface">04 Oct 2026, 16:42:18 IST</span>
                  </div>
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">Tender Reference</span>
                    <span className="font-mono font-semibold text-on-surface">{tenderRef}</span>
                  </div>
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">Total Documents Attached</span>
                    <span className="font-semibold text-on-surface">7 Documents (SHA-256 Digest Verified)</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">Tender Title</span>
                    <span className="font-semibold text-on-surface">{BID_TENDER.title}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">Bidder Entity</span>
                    <span className="font-semibold text-on-surface">ABC Engineering Pvt Ltd (Vendor ID: BIDDER-00482)</span>
                  </div>
                  <div className="md:col-span-2 p-space-sm rounded bg-surface-container-lowest font-mono text-body-sm text-on-surface-variant">
                    <div className="text-label-sm uppercase font-bold text-on-surface mb-1">Cryptographic Ledger Signature</div>
                    <div className="break-all">0x8F3A29B8C401D9E74A25F883B10467AC231EFD084C9A23E099A7BF2231A88FE3</div>
                  </div>
                </div>
                <div className="mt-space-md pt-space-sm flex items-start gap-2 text-on-surface-variant font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 mt-0.5">lock_clock</span>
                  <span>
                    <strong>Security Notice:</strong> Submission actions are recorded with a tamper-evident timestamp and digital token signature.
                    The bid documents will remain encrypted and sealed until the public technical bid opening scheduled on{' '}
                    <strong>05 Oct 2026, 11:00 IST</strong>.
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-space-md">
                <button className="inline-flex items-center gap-2 px-space-lg py-2.5 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary font-label-md text-label-md font-bold shadow-md transition-all" onClick={() => window.alert('Initiating download of Official Bid Receipt SR-2026-00418.pdf')} type="button">
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  Download Submission Receipt (PDF)
                </button>
                <button className="inline-flex items-center gap-2 px-space-md py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors" onClick={() => navigate('/my-bids/BID-2026-00418')} type="button">
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                  View Submission Details
                </button>
                <button className="inline-flex items-center gap-2 px-space-md py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors" onClick={() => setScreen('default')} type="button">
                  Back to Workspace
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL A: CONFIRMATION MODAL */}
      {screen === 'modal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-primary-container/60 backdrop-blur-sm transition-opacity">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl max-w-xl w-full overflow-hidden transition-all scale-100">
            <div className="p-space-lg bg-surface-container-low flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">lock</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Confirm Final Bid Submission</h3>
                <span className="font-mono text-label-sm text-on-surface-variant">Tender Ref: {tenderRef}</span>
              </div>
            </div>
            <div className="p-space-lg flex flex-col gap-space-md font-body-md text-body-md text-on-surface">
              <p>
                You are about to submit your bid for <strong className="text-on-surface">{BID_TENDER.title}</strong>. Please confirm that you have
                thoroughly reviewed all entered information and uploaded documents.
              </p>
              <div className="p-space-md rounded-lg bg-surface-container text-on-surface flex items-start gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-error shrink-0 mt-0.5">warning</span>
                <div className="font-body-sm text-body-sm leading-relaxed">
                  <strong className="font-semibold text-error block mb-0.5">Irreversible Action:</strong>
                  Once confirmed, this bid draft will be cryptographically locked and recorded as officially submitted. No further modifications
                  can be made within this workflow unless authorized under formal tender corrigendum.
                </div>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded-lg font-mono text-body-sm text-on-surface-variant flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Bid Draft:</span>
                  <span className="font-bold text-on-surface">{BID_TENDER.draftId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Signatory:</span>
                  <span className="text-on-surface">Arun Kumar (Class-3 DSC Active)</span>
                </div>
                <div className="flex justify-between">
                  <span>Staged Files:</span>
                  <span className="text-on-surface">7 Files (7.6 MB Total)</span>
                </div>
              </div>
            </div>
            <div className="p-space-md bg-surface-container-low flex items-center justify-end gap-space-sm">
              <button className="px-space-md py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-colors" onClick={() => setScreen('default')} type="button">
                Cancel
              </button>
              <button className="inline-flex items-center gap-2 px-space-lg py-2 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary font-label-md text-label-md font-bold shadow-md transition-all" onClick={executeSubmissionFlow} type="button">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                Confirm &amp; Submit Bid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: SUBMISSION PROCESSING OVERLAY */}
      {screen === 'submitting' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-primary-container/70 backdrop-blur-md">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl max-w-md w-full p-space-xl flex flex-col items-center text-center">
            <div className="relative w-16 h-16 mb-space-md">
              <div className="w-16 h-16 rounded-full border-4 border-surface-container-high border-t-secondary animate-spin"></div>
              <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-secondary text-[24px]">vpn_key</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-1">Submitting your bid...</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-lg">
              Please do not refresh or navigate away while the digital vault cryptographically seals your application.
            </p>
            <div className="w-full bg-surface-container-low rounded-lg p-space-md flex flex-col gap-2.5 text-left font-body-sm text-body-sm">
              <div className="flex items-center gap-2 text-secondary font-medium">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Validating bidder basic details</span>
              </div>
              <div className="flex items-center gap-2 text-secondary font-medium">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Validating 7 uploaded document digests</span>
              </div>
              {loaderStage === 0 ? (
                <div className="flex items-center gap-2 text-on-surface font-semibold">
                  <span className="w-4 h-4 rounded-full border-2 border-secondary border-t-transparent animate-spin inline-block"></span>
                  <span>Recording submission in digital procurement ledger...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-secondary font-medium">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Recorded in digital procurement ledger</span>
                </div>
              )}
              {loaderStage === 0 ? (
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="w-4 h-4 rounded-full bg-surface-variant inline-block"></span>
                  <span>Generating statutory submission receipt...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-on-surface font-semibold">
                  <span className="w-4 h-4 rounded-full border-2 border-secondary border-t-transparent animate-spin inline-block"></span>
                  <span>Generating statutory submission receipt...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </BidderPortalShell>
  );
}
