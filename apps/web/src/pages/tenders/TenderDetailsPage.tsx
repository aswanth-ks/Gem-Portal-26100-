// Tender Details page — ported from the Stitch screen
// "CPCL Bidder Portal - Tender Details (CPCL/PROC/2026/041)"
// (project: GeM Portal).
//
// Source of truth: Stitch project 6921642772921774119, screen
// 2f565a0d1aa744cc852c347242a42498. Ported as closely as possible to the
// generated HTML/Tailwind markup, including the full 8-section tender
// dossier (Overview, Eligibility, Compliance Matrix, Required Documents,
// Technical Specs, Financial/EMD, Terms & GCC/SCC accordions, Official
// Documents & Corrigenda). The Stitch prototype's inline <script>
// (bidder-relationship state simulator, accordion toggles) is reimplemented
// as React state below instead of DOM manipulation.
//
// This currently renders the one tender the Stitch screen was built for
// (CPCL/PROC/2026/041) regardless of the :ref route param, since no other
// tender's full dossier content exists yet.
//
// TODO: replace TENDER content with data from features/tenders/api once
// GET /api/tenders/:ref exists on the gateway, and drive the bidder-state
// banner/CTA from the bidder's real draft/submission status instead of the
// demo simulator. TODO: wire "Continue Bid" / "Start Bid" CTAs to the bid
// submission workspace once that feature exists.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';

type BidderState = 'draft' | 'fresh' | 'submitted' | 'closed';

const TENDER_REF = 'CPCL/PROC/2026/041';

const STATE_CONFIG: Record<
  BidderState,
  {
    label: string;
    ctaTitle: string;
    ctaSub: string;
    bannerHidden?: boolean;
    bannerTitle: string;
    bannerDesc: string;
    bannerChip: string;
    bannerChipClass: string;
    progress: string;
    bottomLabel: string;
    ctaDisabled?: boolean;
  }
> = {
  draft: {
    label: 'Draft in Progress',
    ctaTitle: 'Continue Bid →',
    ctaSub: 'Resume Draft (Step 3: Documents)',
    bannerTitle: 'Draft in progress: 3 of 6 steps completed',
    bannerDesc: 'Last auto-saved: 02 Oct 2026 · 14:32 IST • Cryptographic hash staged on browser cache',
    bannerChip: 'Work in Progress',
    bannerChipClass: 'bg-secondary-fixed text-on-secondary-fixed',
    progress: '50%',
    bottomLabel: 'Continue Bid Workspace →',
  },
  fresh: {
    label: 'Fresh Tender',
    ctaTitle: 'Start Bid →',
    ctaSub: 'Initiate New Proposal (Step 1)',
    bannerTitle: 'No submission draft initiated',
    bannerDesc: 'You have not yet started a bid response for this tender notice.',
    bannerChip: 'Fresh Tender',
    bannerChipClass: 'bg-surface-container-high text-on-surface',
    progress: '0%',
    bottomLabel: 'Start Bid Workspace →',
  },
  submitted: {
    label: 'Submitted Vault',
    ctaTitle: 'View Sealed Bid Vault',
    ctaSub: 'Receipt: CPCL-BID-2026-9041',
    bannerTitle: 'Bid Cryptographically Sealed & Submitted',
    bannerDesc: 'Timestamp: 03 Oct 2026 · 11:20:04 IST • Signer: Class-3 DSC (ABC Engineering Pvt Ltd)',
    bannerChip: 'SUBMITTED & LOCKED',
    bannerChipClass: 'bg-[#E7F6ED] text-[#0F6B3A]',
    progress: '100%',
    bottomLabel: 'View Encrypted Bid Receipt →',
  },
  closed: {
    label: 'Archived / Closed',
    ctaTitle: 'Tender Enquiry Closed',
    ctaSub: 'Submission window concluded',
    bannerHidden: true,
    bannerTitle: '',
    bannerDesc: '',
    bannerChip: '',
    bannerChipClass: '',
    progress: '0%',
    bottomLabel: 'Submissions Closed',
    ctaDisabled: true,
  },
};

const SECTION_NAV = [
  { href: '#overview', label: 'Overview & Scope' },
  { href: '#eligibility', label: 'Eligibility' },
  { href: '#compliance', label: 'Compliance Matrix' },
  { href: '#documents', label: 'Required Documents' },
  { href: '#specs', label: 'Technical Specs' },
  { href: '#financial', label: 'Financial & EMD' },
  { href: '#terms', label: 'Terms & GCC/SCC' },
];

const ELIGIBILITY_CRITERIA = [
  { tag: 'Statutory Entity', page: 'Tender.pdf · Page 4', title: 'Registered Indian Business Entity', body: 'The bidder must be a company registered under Companies Act 2013, LLP, Partnership Firm, or registered Proprietorship operating in India for at least 3 years.', proof: 'Required Proof: Certificate of Inc / Reg' },
  { tag: 'Fiscal Compliance', page: 'Tender.pdf · Page 5', title: 'Valid GSTIN & Permanent Account Number', body: 'Valid GST registration certificate in the state of supply (Tamil Nadu) or inter-state authorization along with valid corporate PAN card.', proof: 'Required Proof: Form GST REG-06 & PAN' },
  { tag: 'Financial Turnover', page: 'Tender.pdf · Page 7', title: 'Annual Turnover ≥ ₹50.00 Lakhs', body: 'Minimum average annual turnover of ₹50.00 Lakhs across the last 3 financial years (FY 2022-23, 2023-24, 2024-25) verified with CA UDIN seal.', proof: 'Required Proof: CA Turnover Cert + UDIN' },
  { tag: 'Technical Capability', page: 'Tender.pdf · Page 8', title: 'Past Work Experience (₹30L+ Order)', body: 'Execution and completion of at least 1 similar contract involving IP CCTV or electronic surveillance valued at not less than ₹30 Lakhs in the last 5 years to any PSU/Govt/MNC.', proof: 'Required Proof: Work Order & Completion Cert' },
  { tag: 'OEM Backing', page: 'Tender.pdf · Page 9', title: 'Manufacturer Authorization Form (MAF)', body: 'If the bidder is not the OEM, they must submit a tender-specific Manufacturer Authorization Form signed by the authorized OEM signatory guaranteeing 3-yr support.', proof: 'Required Proof: Form MAF Annexure-IV' },
  { tag: 'Legal Integrity', page: 'Tender.pdf · Page 6', title: 'Non-Blacklisting Declaration', body: 'Statutory affidavit on ₹100 non-judicial stamp paper attested by Notary Public declaring the firm has not been debarred/blacklisted by any Central/State PSU.', proof: 'Required Proof: Notarized Affidavit' },
];

const COMPLIANCE_ROWS = [
  { title: 'Class-3 Digital Signature Certificate (DSC) Binding', sub: 'All bid documents encrypted with SHA-256 certificate', category: 'Statutory', enforce: 'Mandatory', cite: 'Sec 1.4 · Cl. 8', action: 'System Verified', actionClass: 'text-[#0F6B3A]' },
  { title: 'Public Procurement (Preference to Make in India) Order 2017', sub: 'Class-I (≥50% local content) or Class-II (≥20% local content) declaration', category: 'Statutory', enforce: 'Mandatory', cite: 'Sec 2.1 · Cl. 14', action: 'Self-Cert Annexure', actionClass: 'text-secondary' },
  { title: 'Public Procurement Policy for MSEs Order 2012', sub: 'EMD exemption & 25% procurement share allocation upon valid Udyam entry', category: 'Financial', enforce: 'Conditional', cite: 'Sec 2.3 · Cl. 19', action: 'Active for ABC Eng', actionClass: 'text-[#0F6B3A]' },
  { title: 'Integrity Pact Execution with Independent External Monitor (IEM)', sub: 'Mandatory tripartite agreement to prevent corrupt practices', category: 'Integrity', enforce: 'Mandatory', cite: 'Sec 3.0 · Cl. 2', action: 'Sign Annexure-VII', actionClass: 'text-secondary' },
  { title: 'Land Border Sharing Restrictions (DoE Order F.No.6/18/2019-PPD)', sub: 'Certification of no beneficial ownership in countries sharing land border with India', category: 'Statutory', enforce: 'Mandatory', cite: 'Sec 1.2 · Cl. 6', action: 'Declaration Form', actionClass: 'text-secondary' },
];

const DOCUMENT_CHECKLIST = [
  { name: 'Permanent Account Number (PAN) Card', sub: 'Self-attested copy of corporate entity PAN', type: 'Mandatory', criteria: 'Universal requirement', envelope: 'Cover-1 (Fee/Pre-Qual)', status: 'Uploaded' },
  { name: 'GST Registration Certificate', sub: 'Form GST REG-06 with all endorsement annexures', type: 'Mandatory', criteria: 'Universal requirement', envelope: 'Cover-1 (Fee/Pre-Qual)', status: 'Uploaded' },
  { name: 'Udyam MSME Registration Certificate', sub: 'Valid registration under Micro or Small enterprise category', type: 'Conditional', criteria: 'Mandatory if claiming EMD Exemption', envelope: 'Cover-1 (Fee/Pre-Qual)', status: 'Linked via Profile' },
  { name: '3-Year Audited Balance Sheets & Turnover Certificate', sub: 'Audited P&L accounts for FY 22-23, 23-24, 24-25 with CA UDIN stamp', type: 'Mandatory', criteria: 'Universal requirement', envelope: 'Cover-1 (Fee/Pre-Qual)', status: 'Pending Staging' },
  { name: 'Manufacturer Authorization Form (MAF)', sub: 'Tender-specific authorization letter on OEM official letterhead', type: 'Conditional', criteria: 'Required if bidder is not original manufacturer', envelope: 'Cover-2 (Technical)', status: 'Pending Staging' },
  { name: 'Technical Compliance Datasheet & Test Reports', sub: 'Line-by-line compliance statement signed against Section IV specs', type: 'Mandatory', criteria: 'Universal requirement', envelope: 'Cover-2 (Technical)', status: 'Pending Staging' },
  { name: 'Past Work Order & Completion Certificates', sub: 'Proof of CCTV installations exceeding ₹30 Lakhs value', type: 'Mandatory', criteria: 'Universal requirement', envelope: 'Cover-2 (Technical)', status: 'Pending Staging' },
  { name: 'Notarized Non-Blacklisting Affidavit', sub: 'Affidavit on ₹100 stamp paper dated within 30 days of tender notice', type: 'Mandatory', criteria: 'Universal requirement', envelope: 'Cover-1 (Fee/Pre-Qual)', status: 'Pending Staging' },
];

const TECH_SPECS = [
  { param: 'Camera Resolution & Frame Rate', value: 'Minimum 4K UHD (3840 x 2160) @ 30 frames per second, Progressive Scan CMOS sensor', cite: 'Sec IV · Cl 2.1', amended: false },
  { param: 'Night Vision / IR Range', value: 'Minimum 50m Smart IR with adaptive intensity matrix (Amended per Corrigendum 01)', cite: 'Corr-01 · Cl 3', amended: true },
  { param: 'Environmental Ingress & Impact', value: 'IP66 weather-proof ingress certification & IK10 vandal-resistant metal housing', cite: 'Sec IV · Cl 2.4', amended: false },
  { param: 'On-Board Video Edge Analytics', value: 'Real-time line crossing, boundary intrusion detection, lens defocusing, and scene tamper detection', cite: 'Sec IV · Cl 2.7', amended: false },
  { param: 'Edge Storage & Interoperability', value: 'Edge MicroSD slot up to 256GB; full compliance with ONVIF Profile S, Profile G, Profile T', cite: 'Sec IV · Cl 2.9', amended: false },
  { param: 'Central Storage Buffer Retention', value: 'Minimum 30 days continuous recording at 25fps with H.265+ smart compression stream', cite: 'Sec IV · Cl 3.2', amended: false },
  { param: 'Comprehensive Warranty & SLA', value: '3 Years comprehensive on-site OEM warranty with maximum 24-hour response MTTR', cite: 'Sec IV · Cl 5.1', amended: false },
];

const ACCORDIONS = [
  {
    id: 'gcc',
    icon: 'gavel',
    title: 'General Conditions of Contract (GCC)',
    body: 'Standard CPCL General Conditions of Contract (Edition 2024) apply universally. In case of discrepancies between General Conditions and Special Conditions of Contract (SCC), the SCC stipulations shall supersede. The contractor must observe all statutory labor codes, Minimum Wages Act, and ESI/PF registration compliances during on-site integration work.',
  },
  {
    id: 'scc',
    icon: 'health_and_safety',
    title: 'Special Conditions of Contract (SCC) - Manali Refinery Safety Protocols',
    body: 'Manali Refinery is a Major Accident Hazard (MAH) hydrocarbon installation. All field technicians entering Zone-4 must undergo CPCL Safety Induction, wear mandatory Level-2 PPE (fire-retardant coveralls, safety helmets with chin straps, IS-compliant safety boots), and obtain Hot Work / Cold Work permits prior to mounting camera brackets or laying network conduits.',
  },
  {
    id: 'ld',
    icon: 'timer_off',
    title: 'Liquidated Damages & Delay Penalty Clause',
    body: 'If the contractor fails to deliver the equipment within the specified 8-week delivery timeframe, liquidated damages shall be levied at the rate of 0.5% of total contract value per week of delay or part thereof, subject to a maximum ceiling limit of 10.0% of the aggregate purchase order value. Delays caused by demonstrable Force Majeure will be assessed per GCC Clause 31.',
  },
  {
    id: 'arb',
    icon: 'balance',
    title: 'Arbitration, Dispute Resolution & Jurisdiction',
    body: 'All disputes arising under or out of this tender contract that cannot be amicably settled through mutual executive conciliation within 45 days shall be referred to sole arbitration under the Indian Arbitration and Conciliation Act, 1996. The seat and venue of arbitration shall strictly be Chennai, Tamil Nadu, and the courts of Chennai shall maintain exclusive jurisdiction.',
  },
];

const OFFICIAL_DOCS = [
  { name: 'Tender_Document_CPCL_PROC_2026_041.pdf', sub: 'Complete NIT & Instruction to Bidders (48 Pages)', icon: 'picture_as_pdf', iconClass: 'bg-[#ffdad6] text-[#ba1a1a]', format: 'PDF • 3.4 MB', date: '14 Sep 2026', sig: 'Valid DSC', corrigendum: false },
  { name: 'Technical_Specifications_Schedule.pdf', sub: 'Section IV Detailed Datasheet and SLD Diagrams (18 Pages)', icon: 'picture_as_pdf', iconClass: 'bg-[#ffdad6] text-[#ba1a1a]', format: 'PDF • 1.8 MB', date: '14 Sep 2026', sig: 'Valid DSC', corrigendum: false },
  { name: 'Price_BoQ_Template_Schedule_A.xlsx', sub: 'Statutory Excel Price Schedule with Automated Formulae', icon: 'table_chart', iconClass: 'bg-[#E7F6ED] text-[#0F6B3A]', format: 'XLSX • 240 KB', date: '14 Sep 2026', sig: 'System Hash Valid', corrigendum: false },
  { name: 'Corrigendum_01_Spec_Clarification.pdf', sub: 'Revision to IR Distance & Pre-Bid Response Notes (4 Pages)', icon: 'update', iconClass: 'bg-[#ffdcc2] text-[#6d3a00]', format: 'PDF • 420 KB', date: '22 Sep 2026', sig: 'Valid DSC', corrigendum: true },
];

export function TenderDetailsPage() {
  const { ref } = useParams<{ ref: string }>();
  const [bidderState, setBidderState] = useState<BidderState>('draft');
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const cfg = STATE_CONFIG[bidderState];
  const displayRef = ref ? decodeURIComponent(ref) : TENDER_REF;
  // Which Bid Submission Workspace step the primary CTA resumes at.
  // TODO: once drafts are persisted server-side, resume at the bidder's
  // actual last-completed step instead of this state-simulator mapping.
  const bidStartStep = bidderState === 'fresh' ? 1 : bidderState === 'submitted' ? 3 : 2;

  return (
    <BidderPortalShell>
      <div className="flex flex-col w-full">
        {/* Interactive State Simulator Toolstrip */}
        <div className="bg-surface-container-highest/60 px-space-lg py-1.5 flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm text-body-sm font-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary">tune</span>
            <span className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider font-semibold">Tender State Simulator (Interactive Audit Mode):</span>
            <span className="text-body-sm text-on-surface-variant">Switch perspective to inspect contextual CTAs &amp; badge states</span>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1 rounded-lg shadow-sm">
            {(Object.keys(STATE_CONFIG) as BidderState[]).map((id) => (
              <button
                key={id}
                onClick={() => setBidderState(id)}
                className={
                  'px-2.5 py-1 rounded text-label-sm font-label-sm transition-all ' +
                  (bidderState === id ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container')
                }
              >
                {STATE_CONFIG[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-space-lg py-space-md flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs text-body-sm font-body-sm text-on-surface-variant">
              <Link className="hover:text-secondary transition-colors" to="/dashboard">Workspace</Link>
              <span>/</span>
              <Link className="hover:text-secondary transition-colors" to="/tenders">Tenders</Link>
              <span>/</span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">{displayRef}</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <span className="px-2.5 py-1 bg-surface-container text-on-primary-fixed-variant font-mono text-[11px] font-semibold rounded tracking-wider">TENDER REF: {displayRef}</span>
              <span className="px-2 py-0.5 bg-surface-container-low text-secondary font-label-sm text-[11px] rounded font-semibold">NIT STAGE: ACTIVE ENQUIRY</span>
            </div>
          </div>

          {/* Hero Tender Title & Dynamic Actions Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-space-md">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-space-sm mb-2">
                  <span className="px-2.5 py-0.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm tracking-wide">Equipment &amp; Hardware</span>
                  <span className="px-2.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm tracking-wide">Two-Cover System (Tech + Fin)</span>
                  <span className="px-2.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm tracking-wide">National Open Tender</span>
                  <span className="px-2.5 py-0.5 rounded bg-[#E7F6ED] text-[#0F6B3A] font-label-sm text-label-sm tracking-wide font-semibold">MSE Exemption Applicable</span>
                  <span className="px-2.5 py-0.5 rounded bg-surface-container-low text-secondary font-label-sm text-label-sm tracking-wide font-bold">₹42.50 Lakhs Estimated</span>
                </div>
                <h1 className="text-headline-lg font-headline-lg text-primary tracking-tight mb-1.5">Supply of CCTV Cameras for Public Safety Infrastructure</h1>
                <div className="flex items-center gap-space-sm text-body-sm font-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px] text-secondary">apartment</span>
                  <span className="font-medium text-on-surface">Chennai Petroleum Corporation Limited</span>
                  <span className="text-outline-variant">•</span>
                  <span>Manali Refinery Operations (Zone-4 Perimeter &amp; Process Areas)</span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-space-sm shrink-0">
                {bidderState === 'closed' ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant shadow-sm">
                    <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider">TENDER CONCLUDED · 04 OCT 2026 17:00 IST</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFF7E6] text-[#8A4B00] shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse"></span>
                    <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider">CLOSING SOON: 04 OCT 2026 · 17:00 IST</span>
                    <span className="text-body-sm font-semibold">(2 days remaining)</span>
                  </div>
                )}

                <div className="flex items-center gap-space-sm mt-1">
                  <button className="px-3.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors shadow-sm" title="Save Tender to Watchlist">
                    <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
                    <span>Save</span>
                  </button>
                  <button className="px-3.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors shadow-sm" title="Download all PDFs & BoQ Excel templates">
                    <span className="material-symbols-outlined text-[18px]">folder_zip</span>
                    <span>Download Archive (.ZIP)</span>
                  </button>
                  <Link
                    className={
                      'px-5 py-2 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-label-lg flex items-center gap-2 shadow-md transition-all ' +
                      (cfg.ctaDisabled ? 'opacity-50 pointer-events-none' : '')
                    }
                    to={cfg.ctaDisabled ? '#' : `/tenders/${encodeURIComponent(displayRef)}/bid/${bidStartStep}`}
                  >
                    <div className="text-left">
                      <div className="leading-tight font-bold">{cfg.ctaTitle}</div>
                      <div className="font-label-sm text-[10px] text-on-primary/80 leading-none">{cfg.ctaSub}</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Bidder Relationship Status Ribbon */}
            {!cfg.bannerHidden && (
              <div className="bg-surface-container-low rounded-lg p-space-md flex flex-wrap items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[24px]">edit_note</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold">{cfg.bannerTitle}</span>
                      <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] font-bold uppercase ${cfg.bannerChipClass}`}>{cfg.bannerChip}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{cfg.bannerDesc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-space-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-surface-container rounded-full h-2 overflow-hidden">
                      <div className="bg-secondary h-2 rounded-full transition-all duration-500" style={{ width: cfg.progress }}></div>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface font-bold">{cfg.progress}</span>
                  </div>
                  <a className="font-label-md text-label-md text-secondary hover:underline font-semibold flex items-center gap-0.5" href="#">
                    Audit Draft History <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Tender Specification Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-space-sm">
            <SpecTile label="Tender Ref" value={displayRef} sub="Domestic Open NIT" mono />
            <SpecTile label="Estimated Value" value="₹42,50,000" sub="Excl. GST (18% Statutory)" size="headline" />
            <SpecTile label="EMD Amount" value="₹85,000" sub="MSME Exemptible" size="headline" valueClass="text-primary" subIcon="verified" subClass="text-[#0F6B3A]" />
            <SpecTile label="Submission Cut-off" value="04 Oct 2026" sub="17:00 IST Strict" subClass="text-[#8A4B00]" />
            <SpecTile label="Technical Opening" value="05 Oct 2026" sub="11:00 IST Electronic" />
            <SpecTile label="Bid Validity" value="90 Days" sub="From Tech Envelope Opening" size="headline" />
          </div>

          {/* Sticky Tab Navigation Strip */}
          <div className="sticky top-[60px] z-30 bg-surface-container-lowest/95 backdrop-blur-md rounded-xl shadow-sm p-1.5 flex items-center justify-between overflow-x-auto">
            <nav className="flex items-center gap-1 min-w-max text-body-sm font-body-sm">
              {SECTION_NAV.map((s, i) => (
                <a
                  key={s.href}
                  className={
                    'px-3.5 py-1.5 rounded-lg transition-colors ' +
                    (i === 0 ? 'text-secondary bg-surface-container-low font-label-md font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container')
                  }
                  href={s.href}
                >
                  {s.label}
                </a>
              ))}
              <a className="px-3.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1" href="#corrigenda">
                <span>Official Documents</span>
                <span className="px-1.5 py-0.2 bg-[#FFF7E6] text-[#8A4B00] rounded font-label-sm text-[10px] font-bold">1 Corrigendum</span>
              </a>
            </nav>
            <div className="pl-space-md shrink-0 hidden xl:flex items-center gap-2">
              <button className="p-1.5 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface" onClick={() => window.print()} title="Print Tender Specification">
                <span className="material-symbols-outlined text-[20px]">print</span>
              </button>
              <button className="p-1.5 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface" title="Share Reference Link">
                <span className="material-symbols-outlined text-[20px]">share</span>
              </button>
            </div>
          </div>

          {/* Corrigendum Alert Banner */}
          <div className="bg-[#FFF7E6] rounded-xl p-space-md flex items-start gap-space-md shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#FF9933] flex items-center justify-center text-primary shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]">campaign</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-label-sm text-label-sm uppercase font-bold text-[#8A4B00] tracking-wider">CORRIGENDUM 01 ISSUED (22 SEP 2026)</span>
                <span className="px-2 py-0.5 bg-surface-container-lowest text-on-surface font-mono text-[10px] rounded font-semibold">DOC REF: CPCL/PROC/2026/041/CORR-1</span>
              </div>
              <p className="font-body-md text-body-md text-[#2e1500]">
                Subsequent to the Pre-Bid conference held on 18 Sep 2026, the minimum IR illumination threshold has been modified from 30m to{' '}
                <strong className="font-bold">50m Smart IR with adaptive intensity</strong>. The pre-bid query submission window is concluded. All
                technical submissions must adhere strictly to the revised parameters.
              </p>
            </div>
            <a className="px-3 py-1.5 rounded bg-surface-container-lowest hover:bg-surface-container text-[#8A4B00] font-label-md text-label-md font-semibold shrink-0 shadow-sm transition-colors" href="#corrigenda">
              View Corrigendum Details
            </a>
          </div>

          {/* SECTION 01: OVERVIEW & SCOPE */}
          <SectionShell id="overview" num="01" title="Overview & Scope of Work" desc="Procurement objective and operational installation requirements" source="Source: Tender Document · Section I (Pages 1–4)">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
              <div className="lg:col-span-2 flex flex-col gap-space-md text-body-md font-body-md text-on-surface">
                <p>
                  Chennai Petroleum Corporation Limited (CPCL), a premier public sector enterprise under the Ministry of Petroleum and Natural Gas,
                  invites competitive domestic online bids through the e-Procurement portal from qualified manufacturers, certified system
                  integrators, or their authorized distributors for the comprehensive supply, integration, testing, and 3-year warranty support of
                  high-resolution IP CCTV cameras for public and industrial safety infrastructure across the Manali Refinery Complex.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">Installation Zone</span>
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">Zone-4 High Security Perimeter</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Coverage of Entry Gate 2, Gate 4B, and Hazardous Flare Monitoring corridors.</span>
                  </div>
                  <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">Contract Type</span>
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">Supply, Integration &amp; 3-Yr Warranty</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Turnkey delivery including mounting hardware, surge arrestors &amp; patch cords.</span>
                  </div>
                </div>
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  All bid submissions are processed exclusively in digital format. Physical submissions are prohibited except for the physical EMD
                  exemption instruments (if applicable under MSE status) or statutory BG originals submitted within the mandated grace period.
                </p>
              </div>
              <div className="bg-surface-container p-space-md rounded-xl flex flex-col gap-space-sm justify-between">
                <div className="flex flex-col gap-2">
                  <span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Procurement Modality</span>
                  <ul className="flex flex-col gap-2 text-body-sm font-body-sm text-on-surface">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">verified</span>
                      <span>
                        <strong>Two-Cover System:</strong> Cover 1 (Pre-Qual + Technical) evaluated prior to Cover 2 (BoQ Financial) decryption.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">fingerprint</span>
                      <span>
                        <strong>Mandatory Class-3 DSC:</strong> Signing and encryption require valid Indian Controller of Certifying Authorities (CCA)
                        digital certificate.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">public</span>
                      <span>
                        <strong>Make in India (MII) Preference:</strong> Class-I local suppliers receive purchase preference per statutory DPIIT
                        orders.
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="bg-surface-container-lowest p-2.5 rounded-lg flex items-center justify-between text-body-sm font-body-sm">
                  <span className="text-on-surface-variant">Delivery Period:</span>
                  <span className="font-label-md font-bold text-on-surface">8 Weeks from LOA / PO</span>
                </div>
              </div>
            </div>
          </SectionShell>

          {/* SECTION 02: ELIGIBILITY */}
          <SectionShell id="eligibility" num="02" title="Pre-Qualification & Eligibility Criteria" desc="Auditable criteria required for bid qualification" source="Source: Tender Document · Section II (Pages 4–10)">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
              {ELIGIBILITY_CRITERIA.map((c) => (
                <div key={c.title} className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-sm">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded font-label-sm text-[10px] uppercase font-bold bg-surface-container text-on-surface">{c.tag}</span>
                      <span className="font-label-sm text-[10px] text-secondary font-mono font-semibold">{c.page}</span>
                    </div>
                    <h3 className="font-label-lg text-label-lg text-on-surface font-bold">{c.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{c.body}</p>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-body-sm font-body-sm">
                    <span className="text-on-surface-variant text-[11px]">{c.proof}</span>
                    <span className="material-symbols-outlined text-[18px] text-[#0F6B3A]">check_circle</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionShell>

          {/* SECTION 03: COMPLIANCE MATRIX */}
          <SectionShell id="compliance" num="03" title="Statutory Compliance Matrix" desc="Government mandates and contractual binding obligations" source="Source: Tender Document · Section III">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm font-body-sm border-collapse">
                <thead>
                  <tr className="bg-primary text-on-primary">
                    <th className="py-2.5 px-space-md font-label-md font-semibold rounded-l-lg">Requirement Specification</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">Category Type</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">Enforcement Status</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">Document Citation</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold rounded-r-lg text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {COMPLIANCE_ROWS.map((row) => (
                    <tr key={row.title} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="py-3 px-space-md font-medium text-on-surface">
                        {row.title}
                        <div className="text-[11px] text-on-surface-variant">{row.sub}</div>
                      </td>
                      <td className="py-3 px-space-md">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-[11px]">{row.category}</span>
                      </td>
                      <td className="py-3 px-space-md">
                        <span
                          className={
                            'px-2 py-0.5 rounded font-label-sm text-[11px] font-bold ' +
                            (row.enforce === 'Mandatory' ? 'bg-[#FDE8E8] text-[#9B1C1C]' : 'bg-[#FFF7E6] text-[#8A4B00]')
                          }
                        >
                          {row.enforce}
                        </span>
                      </td>
                      <td className="py-3 px-space-md font-mono text-[11px] text-secondary">{row.cite}</td>
                      <td className="py-3 px-space-md text-right">
                        <span className={`font-label-sm text-[11px] font-semibold ${row.actionClass}`}>{row.action}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionShell>

          {/* SECTION 04: REQUIRED DOCUMENTS */}
          <SectionShell
            id="documents"
            num="04"
            title="Required Documents (Pre-Submission Checklist)"
            desc="Essential documents to prepare prior to entering the Bid Submission Workspace"
            source={
              <span className="font-label-sm text-label-sm text-secondary bg-surface-container-low px-2.5 py-1 rounded font-bold">8 Documents Total</span>
            }
          >
            <div className="p-space-sm bg-surface-container-low rounded-lg flex items-center gap-space-sm text-body-sm font-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px] text-secondary">info</span>
              <span>
                <strong>Notice:</strong> Document files are uploaded directly inside the Bid Submission Workspace (Step 3). File formats must be PDF
                with maximum 15MB file size per attachment.
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm font-body-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container text-on-surface">
                    <th className="py-2.5 px-space-md font-label-md font-semibold rounded-l-lg">Document Name &amp; Description</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">Type</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">Conditionality Criteria</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">Target Envelope</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold rounded-r-lg text-right">Draft Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {DOCUMENT_CHECKLIST.map((doc) => (
                    <tr key={doc.name} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="py-3 px-space-md">
                        <div className="font-medium text-on-surface">{doc.name}</div>
                        <div className="text-[11px] text-on-surface-variant">{doc.sub}</div>
                      </td>
                      <td className="py-3 px-space-md">
                        <span
                          className={
                            'px-2 py-0.5 rounded font-label-sm text-[11px] font-bold ' +
                            (doc.type === 'Mandatory' ? 'bg-[#FDE8E8] text-[#9B1C1C]' : 'bg-[#FFF7E6] text-[#8A4B00]')
                          }
                        >
                          {doc.type}
                        </span>
                      </td>
                      <td className="py-3 px-space-md text-on-surface-variant">{doc.criteria}</td>
                      <td className="py-3 px-space-md">
                        <span className={'font-mono text-[11px] font-semibold ' + (doc.envelope.startsWith('Cover-1') ? 'text-primary' : 'text-secondary')}>{doc.envelope}</span>
                      </td>
                      <td className="py-3 px-space-md text-right">
                        {doc.status === 'Pending Staging' ? (
                          <span className="font-label-sm text-[11px] text-on-surface-variant font-semibold">{doc.status}</span>
                        ) : (
                          <span className="font-label-sm text-[11px] text-[#0F6B3A] font-semibold flex items-center justify-end gap-1">
                            <span className="material-symbols-outlined text-[14px]">check</span> {doc.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionShell>

          {/* SECTION 05: TECHNICAL SPECS */}
          <SectionShell id="specs" num="05" title="Detailed Technical Specifications" desc="Mandatory engineering parameters for IP CCTV Surveillance Units" source="Source: Schedule of Technical Specifications · Section IV, Pages 14–22">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm font-body-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container text-on-surface">
                    <th className="py-2.5 px-space-md font-label-md font-semibold rounded-l-lg">Parameter Specification</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">CPCL Requirement Standard</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">Enforcement</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold rounded-r-lg">Standard Citation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {TECH_SPECS.map((spec) => (
                    <tr key={spec.param} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="py-3 px-space-md font-semibold text-on-surface">{spec.param}</td>
                      <td className="py-3 px-space-md text-on-surface">{spec.value}</td>
                      <td className="py-3 px-space-md">
                        <span className="px-2 py-0.5 rounded bg-[#FDE8E8] text-[#9B1C1C] font-label-sm text-[11px] font-bold">Mandatory</span>
                      </td>
                      <td className={'py-3 px-space-md font-mono text-[11px] ' + (spec.amended ? 'text-[#8A4B00] font-bold' : 'text-secondary')}>{spec.cite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionShell>

          {/* SECTION 06: FINANCIAL & EMD */}
          <SectionShell id="financial" num="06" title="Financial Requirements, EMD & Payment Milestones" desc="Monetary guarantees, commercial bid rules, and disbursement schedule" source="Source: Tender Document · Section V (Commercial)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-sm">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">Earnest Money Deposit (EMD)</span>
                  <div className="text-headline-md font-headline-md text-primary font-bold mt-1">₹85,000</div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5">
                    Payable via online NEFT/RTGS gateway or valid Bank Guarantee from a scheduled commercial bank valid for 120 days.
                  </p>
                </div>
                <div className="p-2.5 bg-surface-container-lowest rounded-lg">
                  <span className="font-label-sm text-[11px] text-[#0F6B3A] font-bold block mb-0.5">MSE EXEMPTION APPLIED</span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">ABC Engineering is eligible for 100% EMD waiver against Udyam UDYAM-TN-02-0048291.</span>
                </div>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-sm">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">Security Deposit (PBG)</span>
                  <div className="text-headline-md font-headline-md text-primary font-bold mt-1">3% of Contract Value</div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5">
                    The successful L1 bidder must furnish a Performance Bank Guarantee within 15 days of Letter of Acceptance (LOA), valid until 60
                    days beyond the 3-year warranty tenure.
                  </p>
                </div>
                <div className="p-2.5 bg-surface-container-lowest rounded-lg">
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    Estimated PBG Value: <strong className="text-on-surface">₹1,27,500 (approx)</strong>
                  </span>
                </div>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-sm">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">Price BoQ Format</span>
                  <div className="text-headline-md font-headline-md text-primary font-bold mt-1">Schedule_A.xlsx</div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5">
                    Price bids must be submitted strictly through the standard macro-enabled BoQ template. Do NOT modify cell headers or formulas.
                    Total evaluated cost is computed inclusive of GST.
                  </p>
                </div>
                <a className="p-2 bg-surface-container text-secondary rounded-lg font-label-sm text-center font-bold hover:bg-surface-container-high transition-colors" href="#corrigenda">
                  Download Blank BoQ Template ↓
                </a>
              </div>
              <div className="md:col-span-3 bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-2">
                <span className="font-label-md text-label-md text-on-surface font-bold">Disbursement Milestones &amp; Billing Schedule:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                  {[
                    { pct: '70%', label: 'Material Delivery & Receipt', body: 'Upon safe receipt at CPCL Manali Warehouse with physical inspection certification.' },
                    { pct: '20%', label: 'Testing, Integration & FAT', body: 'Upon complete site integration, edge commissioning, and final user acceptance test signoff.' },
                    { pct: '10%', label: 'PBG Execution / Retention', body: 'Disbursed upon submission of PBG or retained across warranty completion.' },
                  ].map((m) => (
                    <div key={m.pct} className="p-space-sm rounded bg-surface-container-low flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-secondary font-bold">{m.pct}</span>
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold">{m.label}</span>
                      <span className="font-body-sm text-[11px] text-on-surface-variant">{m.body}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionShell>

          {/* SECTION 07: TERMS & CONDITIONS */}
          <SectionShell id="terms" num="07" title="Contractual Terms & Conditions (GCC / SCC)" desc="Enterprise legal clauses, site safety mandates, and liquidated damages" source="Interactive Clauses">
            <div className="flex flex-col gap-2">
              {ACCORDIONS.map((acc) => {
                const open = openAccordion === acc.id;
                return (
                  <div key={acc.id} className="rounded-lg bg-surface-container-low overflow-hidden">
                    <button
                      className="w-full px-space-md py-3 flex items-center justify-between text-left hover:bg-surface-container transition-colors"
                      onClick={() => setOpenAccordion(open ? null : acc.id)}
                      type="button"
                    >
                      <span className="font-label-lg text-label-lg text-on-surface font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary">{acc.icon}</span>
                        {acc.title}
                      </span>
                      <span
                        className="material-symbols-outlined text-[20px] text-on-surface-variant transition-transform"
                        style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        expand_more
                      </span>
                    </button>
                    {open && (
                      <div className="px-space-md pb-space-md pt-1 text-body-md font-body-md text-on-surface-variant flex flex-col gap-2">
                        <p>{acc.body}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionShell>

          {/* SECTION 08: OFFICIAL DOCUMENTS & CORRIGENDA */}
          <SectionShell
            id="corrigenda"
            num="08"
            title="Official Tender Documents & Corrigenda"
            desc="Cryptographically signed source documents and official amendments"
            source={
              <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm flex items-center gap-1.5 transition-colors" type="button">
                <span className="material-symbols-outlined text-[16px]">download_for_offline</span>
                <span>Download All (3.8 MB)</span>
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm font-body-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container text-on-surface">
                    <th className="py-2.5 px-space-md font-label-md font-semibold rounded-l-lg">Document Artifact</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">Format &amp; Size</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">Publication Date</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold">Digital Signature</th>
                    <th className="py-2.5 px-space-md font-label-md font-semibold rounded-r-lg text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {OFFICIAL_DOCS.map((doc) => (
                    <tr key={doc.name} className={'hover:bg-surface-container-low/60 transition-colors' + (doc.corrigendum ? ' bg-[#FFF7E6]/40' : '')}>
                      <td className="py-3 px-space-md flex items-center gap-space-sm">
                        <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${doc.iconClass}`}>
                          <span className="material-symbols-outlined text-[18px]">{doc.icon}</span>
                        </div>
                        <div>
                          <div className="font-medium text-on-surface flex items-center gap-1.5">
                            <span>{doc.name}</span>
                            {doc.corrigendum && <span className="px-1.5 py-0.2 rounded bg-[#FF9933] text-[#0B1F3A] font-bold text-[9px] uppercase">Active</span>}
                          </div>
                          <div className="text-[11px] text-on-surface-variant">{doc.sub}</div>
                        </div>
                      </td>
                      <td className="py-3 px-space-md font-mono text-[11px] text-on-surface-variant">{doc.format}</td>
                      <td className={'py-3 px-space-md text-on-surface-variant' + (doc.corrigendum ? ' font-semibold' : '')}>{doc.date}</td>
                      <td className="py-3 px-space-md">
                        {doc.sig === 'Valid DSC' ? (
                          <span className="font-label-sm text-[11px] text-[#0F6B3A] font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">verified</span> {doc.sig}
                          </span>
                        ) : (
                          <span className="font-label-sm text-[11px] text-on-surface-variant font-mono">{doc.sig}</span>
                        )}
                      </td>
                      <td className="py-3 px-space-md text-right">
                        <button className={'px-2.5 py-1 rounded bg-surface-container-low hover:bg-surface-container font-label-sm text-label-sm font-semibold transition-colors ' + (doc.corrigendum ? 'text-[#8A4B00]' : 'text-secondary')}>
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionShell>

          {/* BOTTOM CONVERTING TRANSITION CARD */}
          <div className="bg-primary rounded-xl p-space-lg text-on-primary shadow-lg flex flex-col lg:flex-row items-center justify-between gap-space-lg">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded font-label-sm text-[10px] uppercase font-bold bg-[#FF9933] text-primary">ACTION REQUIRED</span>
                <span className="text-body-sm text-on-primary/80 font-mono">TENDER REF: {displayRef}</span>
              </div>
              <h3 className="text-headline-md font-headline-md font-bold tracking-tight">Ready to submit your bid for {displayRef}?</h3>
              <p className="font-body-md text-body-md text-on-primary/80">
                Review the eligibility conditions and prepare the 7 required statutory documents. Your submission is cryptographically sealed and can
                be saved as a draft at any stage prior to final submission.
              </p>
              <div className="flex items-center gap-space-md text-body-sm font-body-sm text-on-primary/70 mt-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary-fixed">schedule</span> Closing: 04 Oct 2026 · 17:00 IST
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#138A4B]">shield</span> Class-3 DSC Mandated
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-space-sm shrink-0 w-full sm:w-auto">
              <Link
                className={
                  'px-6 py-3 rounded-lg bg-[#FF9933] hover:bg-[#e68a2e] text-primary font-headline-sm text-headline-sm font-bold text-center shadow-md transition-all flex items-center justify-center gap-2 ' +
                  (cfg.ctaDisabled ? 'opacity-50 pointer-events-none' : '')
                }
                to={cfg.ctaDisabled ? '#' : `/tenders/${encodeURIComponent(displayRef)}/bid/${bidStartStep}`}
              >
                <span>{cfg.bottomLabel}</span>
              </Link>
              <button className="px-5 py-2.5 rounded-lg bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 text-on-primary font-label-md text-label-md text-center transition-colors flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">folder_zip</span>
                <span>Download Complete Dossier (ZIP)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </BidderPortalShell>
  );
}

function SpecTile({
  label,
  value,
  sub,
  mono,
  size,
  valueClass,
  subIcon,
  subClass,
}: {
  label: string;
  value: string;
  sub: string;
  mono?: boolean;
  size?: 'headline';
  valueClass?: string;
  subIcon?: string;
  subClass?: string;
}) {
  return (
    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-1">
      <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">{label}</span>
      <span
        className={
          (size === 'headline' ? 'font-headline-sm text-headline-sm' : mono ? 'font-mono text-body-md' : 'font-label-lg text-label-lg') +
          ' font-bold ' +
          (valueClass ?? 'text-on-surface') +
          (mono ? ' truncate' : '')
        }
      >
        {value}
      </span>
      <span className={'font-body-sm text-[11px] ' + (subClass ?? 'text-on-surface-variant') + (subIcon ? ' font-semibold flex items-center gap-0.5' : '')}>
        {subIcon && <span className="material-symbols-outlined text-[12px]">{subIcon}</span>} {sub}
      </span>
    </div>
  );
}

function SectionShell({
  id,
  num,
  title,
  desc,
  source,
  children,
}: {
  id: string;
  num: string;
  title: string;
  desc: string;
  source: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md" id={id}>
      <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
        <div className="flex items-center gap-space-sm">
          <span className="w-8 h-8 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center font-bold font-label-lg">{num}</span>
          <div>
            <h2 className="text-headline-sm font-headline-sm text-on-surface">{title}</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{desc}</p>
          </div>
        </div>
        {typeof source === 'string' ? (
          <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded">{source}</span>
        ) : (
          source
        )}
      </div>
      {children}
    </section>
  );
}
