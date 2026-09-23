// Bid Details page — ported from the Stitch screen "CPCL Bidder Portal -
// Bid Details (BID-2026-00418)" (project: GeM Portal). Source: Stitch
// project 6921642772921774119, screen 802fc0c5e7dd4dd2861318803ee9c6f6.
//
// This currently renders the one submitted bid the Stitch screen was built
// for (BID-2026-00418) regardless of the :bidId route param, since no other
// bid's full record exists yet. The Stitch prototype's inline <script>
// (document preview / tender specs / receipt modals) is reimplemented as
// React state below instead of DOM manipulation.
//
// TODO: replace all content with data from GET /api/bids/:bidId once the
// gateway exposes it.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';

const BID = {
  bidId: 'BID-2026-00418',
  receiptNo: 'SR-2026-00418',
  ref: 'CPCL/PROC/2026/041',
  title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
  submittedOn: '04 Oct 2026, 16:42 IST',
  submittedExact: '04 Oct 2026, 16:42:09 IST',
  closes: '04 Oct 2026, 17:00 IST',
};

const TIMELINE = [
  { n: '1', icon: 'check', label: 'Draft', status: 'Completed', statusClass: 'text-[#0F6B3A] font-medium', date: '30 Sep 2026', state: 'done' as const },
  { n: '2', icon: 'check', label: 'Submitted', status: 'Active & Sealed', statusClass: 'text-[#0F6B3A] font-semibold', date: '04 Oct, 16:42 IST', state: 'active' as const },
  { n: '3', icon: '', label: 'Processing', status: 'Document Intake', statusClass: 'text-secondary font-medium', date: 'In Progress', state: 'processing' as const },
  { n: '4', icon: '', label: 'Intake Status', status: 'System Validated', statusClass: 'text-on-surface-variant', date: 'Scheduled', state: 'pending' as const },
  { n: '5', icon: '', label: 'Tender Closure', status: 'Window Closing', statusClass: 'text-on-surface-variant', date: '04 Oct, 17:00 IST', state: 'pending' as const },
  { n: '6', icon: '', label: 'Committee Scrutiny', status: 'Opening Session', statusClass: 'text-on-surface-variant', date: 'Post-Deadline', state: 'pending' as const },
  { n: '7', icon: '', label: 'Tender Outcome', status: 'Final Award', statusClass: 'text-on-surface-variant', date: 'Pending Scrutiny', state: 'pending' as const },
];

interface DocRow {
  icon: string;
  name: string;
  type: string;
  typeClass: string;
  file: string;
  size: string;
  detail: string;
}

const DOCUMENTS: DocRow[] = [
  { icon: 'badge', name: 'Permanent Account Number (PAN) Certificate', type: 'Mandatory', typeClass: 'bg-surface-container text-on-surface', file: 'PAN_Certificate.pdf', size: '1.2 MB', detail: 'ABCDE1234F · Form 49A Verified' },
  { icon: 'receipt_long', name: 'GST Registration Certificate', type: 'Mandatory', typeClass: 'bg-surface-container text-on-surface', file: 'GST_Certificate.pdf', size: '856 KB', detail: 'GSTIN 33ABCDE1234F1Z5 · Active Taxpayer' },
  { icon: 'account_balance', name: 'Audited Financial Statements (Last 3 FYs)', type: 'Mandatory', typeClass: 'bg-surface-container text-on-surface', file: 'Financial_Statements_2025.pdf', size: '3.4 MB', detail: 'CA Certified UDIN: 24098231AB8912' },
  { icon: 'card_membership', name: 'Udyam / MSME Certificate', type: 'EMD Waiver', typeClass: 'bg-tertiary-fixed text-on-tertiary-fixed', file: 'Udyam_Certificate.pdf', size: '642 KB', detail: 'UDYAM-TN-00-0000000 · NIC 26309' },
  { icon: 'domain_verification', name: 'OEM Authorization Form (MAF - Manufacturer)', type: 'Mandatory', typeClass: 'bg-surface-container text-on-surface', file: 'OEM_Authorization.pdf', size: '1.8 MB', detail: 'Authorized Partner Ref #MAF-CPCL-2026-90' },
  { icon: 'fact_check', name: 'Technical Compliance Statement (Section IV Schedule)', type: 'Mandatory', typeClass: 'bg-surface-container text-on-surface', file: 'Technical_Compliance.pdf', size: '2.1 MB', detail: 'Schedule IV Technical Clauses Item-by-Item Accepted' },
  { icon: 'history', name: 'Experience & Past Work Order Certificate', type: 'Mandatory', typeClass: 'bg-surface-container text-on-surface', file: 'Experience_Certificate.pdf', size: '1.5 MB', detail: 'Public Sector Track Record Execution Letters Included' },
];

const NEXT_STEPS = [
  { n: 1, label: 'Tender Closure', body: <>The bidding window closes strictly at <strong>17:00 IST on 04 Oct 2026</strong>. No revisions or cancellations are permissible after this cutoff.</> },
  { n: 2, label: 'Committee Scrutiny', body: 'Designated CPCL Procurement Evaluation Committee will commence technical and statutory scrutiny under dual-key cryptographic authorization.' },
  { n: 3, label: 'Clarifications & Addenda', body: 'Should any technical clarification be requested by the committee, formal notifications will appear here and via registered email.' },
  { n: 4, label: 'Commercial Opening', body: 'Only technically qualified bidders will proceed to price bid opening. Results and comparative matrices will be published publicly.' },
];

type Modal = null | 'document' | 'tenderSpecs' | 'receipt';

export function BidDetailsPage() {
  const { bidId } = useParams<{ bidId: string }>();
  const displayBidId = bidId ? decodeURIComponent(bidId) : BID.bidId;
  const [modal, setModal] = useState<Modal>(null);
  const [activeDoc, setActiveDoc] = useState<DocRow | null>(null);

  function previewDocument(doc: DocRow) {
    setActiveDoc(doc);
    setModal('document');
  }

  return (
    <BidderPortalShell breadcrumb="My Bids">
      <div className="flex flex-col w-full font-body-md text-on-surface antialiased pb-space-xl px-space-lg py-space-md">
        {/* TOP BREADCRUMB & HEADER BAR */}
        <div className="flex flex-col gap-space-sm mb-space-lg">
          <nav className="flex items-center gap-space-xs text-body-sm font-body-sm text-on-surface-variant">
            <Link className="hover:text-secondary flex items-center gap-1 transition-colors" to="/my-bids">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>My Bids</span>
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="font-mono text-on-surface font-semibold">{BID.ref}</span>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface-variant">Bid Details</span>
          </nav>
          <div className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <div className="flex flex-wrap items-center gap-space-xs sm:gap-space-sm">
                <span className="font-mono font-semibold text-label-sm px-2.5 py-1 rounded bg-surface-container text-on-surface">{BID.ref}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-label-sm font-label-sm bg-[#E7F6ED] text-[#0F6B3A]">
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  SUBMITTED · 04 OCT 2026, 16:42 IST
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Read-Only Record
                </span>
              </div>
              <h1 className="text-headline-lg font-headline-lg text-on-surface mt-1 leading-snug">{BID.title}</h1>
              <p className="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
                Permanent Submission Reference: <span className="font-mono font-semibold text-on-surface">{displayBidId}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-center shrink-0">
              <Link className="px-space-md py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors flex items-center gap-1.5 shadow-sm" to="/my-bids">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back to My Bids</span>
              </Link>
              <button className="px-space-md py-2.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container transition-colors font-label-lg text-label-lg flex items-center gap-1.5 shadow-sm" onClick={() => setModal('receipt')} type="button">
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Download Submission Receipt</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: LIFECYCLE TIMELINE */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md sm:p-space-lg mb-space-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-space-md mb-space-lg gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">history_edu</span>
              </div>
              <div>
                <h2 className="text-headline-sm font-headline-sm text-on-surface">Bid Status &amp; Sovereign Lifecycle</h2>
                <p className="text-body-sm font-body-sm text-on-surface-variant">Read-only milestone progression tracking in accordance with CPCL procurement bylaws</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container font-label-sm text-label-sm text-on-surface">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span>Cryptographically Sealed in Ledger</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm p-space-sm bg-surface-container-low rounded-lg mb-space-lg text-body-sm">
            <div className="flex flex-col p-space-xs">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Submission Ref</span>
              <span className="font-mono font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                {displayBidId}
                <span className="material-symbols-outlined text-[14px] text-secondary" title="Class-3 DSC Locked">lock</span>
              </span>
            </div>
            <div className="flex flex-col p-space-xs">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Submitted On</span>
              <span className="text-on-surface font-medium mt-0.5">{BID.submittedOn}</span>
            </div>
            <div className="flex flex-col p-space-xs">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Tender Closes</span>
              <span className="text-on-surface font-medium flex items-center gap-1 mt-0.5">
                {BID.closes}
                <span className="text-label-sm font-label-sm px-1.5 py-0.2 rounded bg-tertiary-fixed text-on-tertiary-fixed">18m window</span>
              </span>
            </div>
            <div className="flex flex-col p-space-xs">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">DSC Signatory</span>
              <span className="text-on-surface font-medium truncate mt-0.5" title="Class-3 DSC Verified · Arun Kumar (Procurement Manager)">
                Class-3 DSC · Arun Kumar
              </span>
            </div>
          </div>

          <div className="relative overflow-x-auto py-2">
            <div className="min-w-[760px] flex items-start justify-between relative">
              <div className="absolute top-4 left-6 right-6 h-1 bg-surface-container-high -z-0"></div>
              <div className="absolute top-4 left-6 w-[28%] h-1 bg-secondary -z-0"></div>
              {TIMELINE.map((step) => (
                <div key={step.n} className="flex flex-col items-center text-center w-28 sm:w-32 relative z-10">
                  <div
                    className={
                      'w-8 h-8 rounded-full flex items-center justify-center font-bold text-label-sm mb-2 ' +
                      (step.state === 'done'
                        ? 'bg-[#E7F6ED] text-[#0F6B3A] shadow-sm'
                        : step.state === 'active'
                          ? 'bg-secondary text-on-secondary shadow-sm ring-4 ring-secondary-fixed'
                          : step.state === 'processing'
                            ? 'bg-surface-container-lowest text-secondary shadow-sm ring-2 ring-secondary'
                            : 'bg-surface-container text-on-surface-variant')
                    }
                  >
                    {step.state === 'done' || step.state === 'active' ? (
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    ) : step.state === 'processing' ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
                    ) : (
                      step.n
                    )}
                  </div>
                  <span className={'font-label-md text-label-md ' + (step.state === 'active' ? 'text-secondary font-semibold' : step.state === 'pending' || step.state === 'processing' ? 'text-on-surface-variant' : 'text-on-surface')}>
                    {step.label}
                  </span>
                  <span className={'text-label-sm font-label-sm ' + step.statusClass}>{step.status}</span>
                  <span className="text-body-sm font-body-sm text-on-surface-variant text-[11px]">{step.date}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-space-md pt-space-sm flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant bg-surface-container-low px-space-md py-space-xs rounded-lg">
            <span className="material-symbols-outlined text-[16px] text-secondary">verified</span>
            <span>
              Submission actions are cryptographically recorded with reference <strong className="font-mono text-on-surface">{displayBidId}</strong> and timestamped on the sovereign e-procurement ledger.
            </span>
          </div>
        </div>

        {/* SECTION 3: TWO-COLUMN PARTICULARS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg mb-space-lg">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md sm:p-space-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-space-sm mb-space-md">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[22px]">description</span>
                  <h3 className="text-headline-sm font-headline-sm text-on-surface">Tender Details &amp; Summary</h3>
                </div>
                <button className="px-space-sm py-1 rounded-lg text-secondary hover:bg-surface-container font-label-sm text-label-sm flex items-center gap-1 transition-colors" onClick={() => setModal('tenderSpecs')} type="button">
                  <span>View Tender</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
              <div className="flex flex-col divide-y divide-surface-container-low text-body-sm">
                <Row label="Tender Title" value="Supply of CCTV Cameras for Public Safety Infrastructure" wrap />
                <Row label="Tender Reference" value={BID.ref} mono />
                <Row label="Procuring Authority" value="Chennai Petroleum Corporation Ltd (CPCL - Manali Refinery)" wrap />
                <Row label="Tender Category & Type" value="Open Domestic Tender (Goods & Hardware)" />
                <Row label="Estimated Tender Value" value="₹ 42,50,000 (₹42.50 Lakhs)" mono bold />
                <Row label="Submission Deadline" value="04 Oct 2026, 17:00 IST" />
                <Row label="Bid Validity Period" value="90 Days from Technical Opening" />
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-on-surface-variant">Earnest Money Deposit (EMD)</span>
                  <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-[#0F6B3A] bg-[#E7F6ED] px-2 py-0.5 rounded">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    Exempted (Udyam MSME Registered Entity)
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-space-md p-space-sm bg-surface-container-low rounded-lg text-body-sm text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">info</span>
              <span>Specs and tender documents are certified as immutable by CPCL Procurement Directorate.</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md sm:p-space-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-space-sm mb-space-md">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[22px]">corporate_fare</span>
                  <h3 className="text-headline-sm font-headline-sm text-on-surface">Bidder Details (As Submitted)</h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Locked / Read-Only
                </span>
              </div>
              <div className="flex flex-col divide-y divide-surface-container-low text-body-sm">
                <Row label="Registered Legal Name" value="ABC Engineering Pvt Ltd" bold />
                <Row label="Registered Operating Address" value="45 Industrial Estate Road, Guindy, Chennai, TN - 600032" wrap />
                <Row label="Authorized Signatory" value="Arun Kumar (Procurement Manager)" />
                <Row label="Primary Contact Credential" value="+91 98401 23456 · procurement@abcengineering.example" mono />
                <Row label="Permanent Account No. (PAN)" value="ABCDE1234F" mono bold />
                <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-on-surface-variant">Goods &amp; Services Tax (GSTIN)</span>
                  <span className="font-mono font-medium text-on-surface flex items-center gap-1 text-right">
                    33ABCDE1234F1Z5
                    <span className="material-symbols-outlined text-[#0F6B3A] text-[15px]" title="Tamil Nadu - State 33 Verified">check_circle</span>
                  </span>
                </div>
                <Row label="Corporate Identity No. (CIN)" value="U12345TN2020PTC000000" mono />
                <Row label="Udyam MSME Registration" value="UDYAM-TN-00-0000000 (Micro Enterprise)" mono />
              </div>
            </div>
            <div className="mt-space-md p-space-sm bg-surface-container-low rounded-lg text-body-sm text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">verified_user</span>
              <span>Details snapshot sealed under Class-3 Digital Signature: Certificate Ser. #TN-DSC-9921-A</span>
            </div>
          </div>
        </div>

        {/* SECTION 4: SUBMITTED DOCUMENTS SCHEDULE */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md sm:p-space-lg mb-space-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-sm mb-space-md gap-space-xs">
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[22px]">folder_special</span>
                <h3 className="text-headline-sm font-headline-sm text-on-surface">Submitted Documents Schedule</h3>
                <span className="px-2.5 py-0.5 rounded text-label-sm font-label-sm bg-[#E7F6ED] text-[#0F6B3A] ml-2">7 of 7 Files Sealed</span>
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                The following statutory and technical documents were encrypted, digitally signed, and deposited into the CPCL tender vault.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-surface-container text-label-sm font-label-sm text-on-surface self-start sm:self-center">
              <span className="material-symbols-outlined text-[16px] text-[#0F6B3A]">verified</span>
              <span>SHA-256 Vault Verified</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                  <th className="py-3 px-space-md rounded-l-lg">Document Specification</th>
                  <th className="py-3 px-space-md">Requirement Type</th>
                  <th className="py-3 px-space-md">Submitted File Asset</th>
                  <th className="py-3 px-space-md">Vault Status</th>
                  <th className="py-3 px-space-md text-right rounded-r-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {DOCUMENTS.map((doc) => (
                  <tr key={doc.file} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-3.5 px-space-md font-medium text-on-surface">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[20px]">{doc.icon}</span>
                        <span>{doc.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-space-md">
                      <span className={`text-label-sm font-label-sm px-2 py-0.5 rounded font-semibold ${doc.typeClass}`}>{doc.type}</span>
                    </td>
                    <td className="py-3.5 px-space-md font-mono text-[13px] text-on-surface">
                      {doc.file} <span className="text-on-surface-variant font-sans">({doc.size})</span>
                    </td>
                    <td className="py-3.5 px-space-md">
                      <span className="inline-flex items-center gap-1 text-label-sm font-label-sm text-[#0F6B3A] bg-[#E7F6ED] px-2 py-0.5 rounded">
                        <span className="material-symbols-outlined text-[14px]">lock</span> Uploaded &amp; Sealed
                      </span>
                    </td>
                    <td className="py-3.5 px-space-md text-right">
                      <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm inline-flex items-center gap-1 transition-colors" onClick={() => previewDocument(doc)} type="button">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-space-md pt-space-sm border-t border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-body-sm text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">security</span>
              <span>Uploaded files are sealed within the tamper-proof vault. Inspection is restricted to authorized CPCL tender opening officials upon conclusion of the deadline.</span>
            </div>
            <span className="font-mono text-[12px] text-on-surface-variant shrink-0">SHA-256 Digest Validated</span>
          </div>
        </div>

        {/* SECTION 5: RECEIPT + WHAT HAPPENS NEXT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-lg">
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl shadow-sm p-space-md sm:p-space-lg flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-surface-container-low/60 pointer-events-none flex items-center justify-center">
              <span className="material-symbols-outlined text-[90px] text-outline-variant/30">verified</span>
            </div>
            <div>
              <div className="flex items-center justify-between pb-space-xs mb-space-sm border-b border-surface-container-low">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[24px]">receipt</span>
                  <h3 className="text-headline-sm font-headline-sm text-on-surface">Official Submission Receipt</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-[#E7F6ED] text-[#0F6B3A] font-bold">VALIDATED</span>
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant mb-space-md">
                Statutory confirmation generated by CPCL e-Procurement Portal Engine under Digital India Sovereign Guidelines.
              </p>
              <div className="space-y-3 bg-surface-container-low p-space-md rounded-lg font-body-sm">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Receipt Number:</span>
                  <span className="font-mono font-bold text-on-surface">{BID.receiptNo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Submission Reference:</span>
                  <span className="font-mono font-semibold text-on-surface">{displayBidId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Exact Timestamp:</span>
                  <span className="font-medium text-on-surface">{BID.submittedExact}</span>
                </div>
                <div className="flex flex-col gap-0.5 pt-1 border-t border-surface-container">
                  <span className="text-on-surface-variant text-[12px]">Digital Certificate Hash (DSC):</span>
                  <span className="font-mono text-[11px] text-on-surface break-all bg-surface-container-lowest p-1.5 rounded">
                    SHA-256: 7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e41c
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-surface-container">
                  <span className="text-on-surface-variant">Vault Deposit Status:</span>
                  <span className="text-[#0F6B3A] font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#138A4B]"></span> Successfully Recorded
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs">
              <button className="w-full py-2.5 px-space-md rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-sm" onClick={() => setModal('receipt')} type="button">
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                <span>Download Official PDF Receipt</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm p-space-md sm:p-space-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-space-xs pb-space-xs mb-space-sm border-b border-surface-container-low">
                <span className="material-symbols-outlined text-secondary text-[24px]">forward_circle</span>
                <h3 className="text-headline-sm font-headline-sm text-on-surface">What Happens Next?</h3>
                <span className="text-label-sm font-label-sm text-on-surface-variant ml-auto">Institutional Advisory</span>
              </div>
              <p className="text-body-md font-body-md text-on-surface leading-relaxed mb-space-md">
                Your bid has been successfully submitted and sealed in the CPCL e-procurement vault. The system will automatically process the
                submitted documents and generate the required baseline compliance assessment.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm mb-space-md">
                {NEXT_STEPS.map((step) => (
                  <div key={step.n} className="p-space-sm bg-surface-container-low rounded-lg flex gap-space-xs items-start">
                    <div className="w-7 h-7 rounded-full bg-surface-container text-secondary flex items-center justify-center shrink-0 font-bold text-label-sm mt-0.5">{step.n}</div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface">{step.label}</span>
                      <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-space-sm rounded-lg bg-surface-container border-l-4 border-l-secondary text-body-sm font-body-sm text-on-surface flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 mt-0.5">contact_support</span>
              <span>
                <strong>Bidder Assistance:</strong> For urgent portal or encryption issues, contact the CPCL Help Desk at <strong>044-2594 4000</strong>{' '}
                (Ext: 218) quoting your reference <code>{displayBidId}</code>.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 6: BOTTOM ACTIONS */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-xs text-body-sm font-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
            <span>
              Strict vendor isolation active: Viewing record <strong className="font-mono text-on-surface">{displayBidId}</strong> assigned to{' '}
              <strong className="font-mono text-on-surface">BIDDER-00482</strong>
            </span>
          </div>
          <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end">
            <button className="px-space-md py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors flex items-center gap-1.5 shadow-sm" onClick={() => setModal('receipt')} type="button">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>Download Submission Receipt</span>
            </button>
            <Link className="px-space-md py-2.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container transition-colors font-label-lg text-label-lg flex items-center gap-1.5 shadow-sm" to="/my-bids">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to My Bids</span>
            </Link>
          </div>
        </div>
      </div>

      {/* MODAL: DOCUMENT PREVIEW */}
      {modal === 'document' && activeDoc && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-50 flex items-center justify-center p-space-md" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-surface-container-lowest w-full max-w-3xl rounded-xl shadow-2xl border border-surface-container overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-space-lg py-space-md bg-surface-container-low border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">description</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">{activeDoc.name}</h4>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">{activeDoc.detail}</p>
                </div>
              </div>
              <button className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setModal(null)} type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-space-lg overflow-y-auto space-y-space-md bg-surface">
              <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm border border-surface-container space-y-space-md">
                <div className="flex items-center justify-between border-b border-surface-container pb-space-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-label-md px-2 py-0.5 rounded bg-surface-container text-on-surface">{activeDoc.file}</span>
                    <span className="text-body-sm text-on-surface-variant">{activeDoc.size}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-label-sm text-[#0F6B3A] bg-[#E7F6ED] px-2 py-0.5 rounded">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    Sealed in Sovereign Vault
                  </span>
                </div>
                <div className="h-64 rounded bg-surface-container-low border border-dashed border-outline-variant flex flex-col items-center justify-center p-space-md text-center">
                  <span className="material-symbols-outlined text-secondary text-[48px] mb-2">verified</span>
                  <p className="font-headline-sm text-headline-sm text-on-surface">Digitally Signed &amp; Sealed Document</p>
                  <p className="text-body-sm font-body-sm text-on-surface-variant max-w-md mt-1">
                    Verified submission asset for {displayBidId}. Digital signature of Arun Kumar (Procurement Manager) validated with SHA-256
                    fingerprint.
                  </p>
                  <div className="mt-4 px-3 py-1 rounded bg-surface-container font-mono text-[11px] text-on-surface">
                    SHA-256 Checksum: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-space-sm text-body-sm p-space-sm bg-surface-container-low rounded">
                  <div>
                    <span className="text-on-surface-variant text-label-sm uppercase">Uploaded By:</span>
                    <p className="font-medium text-on-surface">Arun Kumar (Procurement Mgr)</p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-label-sm uppercase">Signing Authority:</span>
                    <p className="font-medium text-on-surface">eMudhra Class-3 CA</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-space-lg py-space-sm bg-surface-container-low border-t border-surface-container flex items-center justify-between">
              <span className="text-label-sm text-on-surface-variant font-medium">Read-Only Statutory Record</span>
              <button className="px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors" onClick={() => setModal(null)} type="button">
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TENDER SPECIFICATIONS */}
      {modal === 'tenderSpecs' && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-50 flex items-center justify-center p-space-md" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-2xl border border-surface-container overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-space-lg py-space-md bg-surface-container-low border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">article</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Tender Specifications Summary</h4>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">{BID.ref} · Manali Refinery</p>
                </div>
              </div>
              <button className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setModal(null)} type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-space-lg overflow-y-auto space-y-space-md text-body-sm">
              <div className="p-space-md bg-surface-container-low rounded-lg space-y-2">
                <h5 className="font-semibold text-on-surface text-label-lg">Scope of Procurement</h5>
                <p className="text-on-surface-variant leading-relaxed">
                  Supply, installation, testing, and commissioning of high-definition industrial CCTV surveillance units, NVR infrastructure,
                  redundant fiber backhaul switches, and unified video analytics software for CPCL Manali Refinery perimeter and zone security.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-space-sm">
                <SpecRow label="Delivery Schedule:" value="60 Days from PO Issuance" />
                <SpecRow label="Warranty Mandate:" value="36 Months Comprehensive Onsite" />
                <SpecRow label="Inspection Agency:" value="CPCL QA/QC Directorate" />
                <SpecRow label="Payment Terms:" value="90% on Delivery, 10% on PBG" />
              </div>
            </div>
            <div className="px-space-lg py-space-sm bg-surface-container-low border-t border-surface-container flex justify-end">
              <button className="px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors" onClick={() => setModal(null)} type="button">
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL SUBMISSION RECEIPT SLIP */}
      {modal === 'receipt' && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-50 flex items-center justify-center p-space-md" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-xl shadow-2xl border border-surface-container overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-space-lg py-space-md bg-primary-container text-on-primary flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[24px]">verified</span>
                <div>
                  <h4 className="font-headline-sm text-headline-sm">CPCL e-Procurement Receipt</h4>
                  <p className="text-label-sm font-label-sm text-on-primary-container">Government of India Enterprise Undertaking</p>
                </div>
              </div>
              <button className="w-8 h-8 rounded hover:bg-surface-container-high/20 flex items-center justify-center text-on-primary transition-colors" onClick={() => setModal(null)} type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-space-lg overflow-y-auto space-y-space-md text-body-sm bg-surface-container-lowest">
              <div className="border-2 border-dashed border-outline-variant p-space-md rounded-lg space-y-3 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-on-surface text-label-lg">CHENNAI PETROLEUM CORPORATION LIMITED</p>
                    <p className="text-on-surface-variant text-[12px]">e-Tendering Directorate · Manali Refinery, Chennai</p>
                  </div>
                  <div className="text-right font-mono text-[12px] text-on-surface">
                    <span className="px-2 py-0.5 rounded bg-[#E7F6ED] text-[#0F6B3A] font-bold">VALID BID</span>
                  </div>
                </div>
                <div className="border-t border-surface-container pt-2 space-y-1.5">
                  <ReceiptRow label="Receipt No:" value={BID.receiptNo} bold />
                  <ReceiptRow label="Bid Reference No:" value={displayBidId} />
                  <ReceiptRow label="Tender Notice No:" value={BID.ref} />
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Bidder Identity:</span>
                    <span className="font-medium text-on-surface">ABC Engineering Pvt Ltd (BIDDER-00482)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Timestamp of Intake:</span>
                    <span className="font-medium text-on-surface">04-OCT-2026 16:42:09 IST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Files Encrypted:</span>
                    <span className="font-medium text-on-surface">7 Sealed Statutory Assets</span>
                  </div>
                </div>
                <div className="border-t border-surface-container pt-2 text-[11px] text-on-surface-variant space-y-1 font-mono">
                  <div>DIGITAL SIGNATURE HASH:</div>
                  <div className="bg-surface-container-low p-2 rounded break-all text-on-surface">
                    SHA256:7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e41c
                  </div>
                  <div className="text-[10px] text-on-surface-variant text-center pt-1 font-sans">
                    This is a computer-generated, sovereign digital acknowledgment. No physical signature required.
                  </div>
                </div>
              </div>
            </div>
            <div className="px-space-lg py-space-sm bg-surface-container-low border-t border-surface-container flex items-center justify-between">
              <span className="text-label-sm text-on-surface-variant">Preserve for opening inquiries</span>
              <div className="flex items-center gap-space-xs">
                <button className="px-space-md py-1.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container transition-colors font-label-md text-label-md flex items-center gap-1 shadow-sm" onClick={() => window.print()} type="button">
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print / Save PDF</span>
                </button>
                <button className="px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors" onClick={() => setModal(null)} type="button">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </BidderPortalShell>
  );
}

function Row({ label, value, mono, bold, wrap }: { label: string; value: string; mono?: boolean; bold?: boolean; wrap?: boolean }) {
  return (
    <div className={'py-2.5 flex justify-between gap-1 ' + (wrap ? 'flex-col sm:flex-row sm:items-center' : 'items-center')}>
      <span className="text-on-surface-variant">{label}</span>
      <span className={(mono ? 'font-mono ' : '') + (bold ? 'font-semibold ' : 'font-medium ') + 'text-on-surface text-right' + (wrap ? ' max-w-sm' : '')}>{value}</span>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-space-sm bg-surface-container-low rounded">
      <span className="text-label-sm text-on-surface-variant">{label}</span>
      <p className="font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function ReceiptRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span className={'font-mono text-on-surface ' + (bold ? 'font-bold' : 'font-semibold')}>{value}</span>
    </div>
  );
}
