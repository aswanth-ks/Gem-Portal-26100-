// Tender Details — ported from Stitch screen "CPCL Bidder Portal - Tender
// Details (CPCL/PROC/2026/041)" (project 6921642772921774119, screen
// 2f565a0d1aa744cc852c347242a42498), rebuilt on the shared design system.
// Full 8-section dossier + bidder-relationship state simulator + accordions.
//
// Renders the one tender the Stitch screen was built for regardless of :ref.
// TODO: GET /api/tenders/:ref via features/tenders/api; drive the bidder
// state from the real draft/submission status instead of the simulator.

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import {
  Button,
  Callout,
  Card,
  CellStack,
  Icon,
  IconButton,
  PageHeader,
  SectionHeader,
  StatCard,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  Tag,
} from '@/components/primitives';
import { cn } from '@/utils/cn';

type BidderState = 'draft' | 'fresh' | 'submitted' | 'closed';

const TENDER_REF = 'CPCL/PROC/2026/041';

const STATE_CONFIG: Record<
  BidderState,
  { label: string; ctaTitle: string; ctaSub: string; bannerHidden?: boolean; bannerTitle: string; bannerDesc: string; bannerChip: string; chipTone: 'info' | 'neutral' | 'success'; progress: number; bottomLabel: string; ctaDisabled?: boolean }
> = {
  draft: {
    label: 'Draft in progress',
    ctaTitle: 'Continue bid',
    ctaSub: 'Resume draft · documents',
    bannerTitle: 'Draft in progress — 3 of 6 steps completed',
    bannerDesc: 'Last auto-saved 02 Oct 2026 · 14:32 IST · cryptographic hash staged in browser cache',
    bannerChip: 'Work in progress',
    chipTone: 'info',
    progress: 50,
    bottomLabel: 'Continue bid workspace',
  },
  fresh: {
    label: 'Fresh tender',
    ctaTitle: 'Start bid',
    ctaSub: 'Start your bid',
    bannerTitle: 'No submission draft initiated',
    bannerDesc: 'You have not yet started a bid response for this tender notice.',
    bannerChip: 'Not started',
    chipTone: 'neutral',
    progress: 0,
    bottomLabel: 'Start bid workspace',
  },
  submitted: {
    label: 'Submitted vault',
    ctaTitle: 'View sealed bid',
    ctaSub: 'Receipt CPCL-BID-2026-9041',
    bannerTitle: 'Bid cryptographically sealed & submitted',
    bannerDesc: 'Timestamp 03 Oct 2026 · 11:20:04 IST · signer Class-3 DSC (ABC Engineering Pvt Ltd)',
    bannerChip: 'Submitted & locked',
    chipTone: 'success',
    progress: 100,
    bottomLabel: 'View encrypted bid receipt',
  },
  closed: {
    label: 'Archived / closed',
    ctaTitle: 'Tender closed',
    ctaSub: 'Submission window concluded',
    bannerHidden: true,
    bannerTitle: '',
    bannerDesc: '',
    bannerChip: '',
    chipTone: 'neutral',
    progress: 0,
    bottomLabel: 'Submissions closed',
    ctaDisabled: true,
  },
};

type SectionId = 'overview' | 'eligibility' | 'compliance' | 'documents' | 'specs' | 'financial' | 'terms' | 'corrigenda';

const SECTION_NAV: { id: SectionId; label: string; count?: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'documents', label: 'Required documents' },
  { id: 'specs', label: 'Technical specs' },
  { id: 'financial', label: 'Financial & EMD' },
  { id: 'terms', label: 'Terms (GCC/SCC)' },
  { id: 'corrigenda', label: 'Official documents', count: '1' },
];

const ELIGIBILITY_CRITERIA = [
  { tag: 'Statutory entity', page: 'Page 4', title: 'Registered Indian business entity', body: 'Company under Companies Act 2013, LLP, partnership firm or registered proprietorship operating in India for at least 3 years.', proof: 'Certificate of incorporation / registration' },
  { tag: 'Fiscal compliance', page: 'Page 5', title: 'Valid GSTIN & PAN', body: 'GST registration in the state of supply (Tamil Nadu) or inter-state authorization, with a valid corporate PAN.', proof: 'Form GST REG-06 & PAN' },
  { tag: 'Financial turnover', page: 'Page 7', title: 'Annual turnover ≥ ₹50.00 Lakhs', body: 'Average annual turnover of ₹50 Lakhs over FY 2022-23, 2023-24 and 2024-25, certified with CA UDIN.', proof: 'CA turnover certificate + UDIN' },
  { tag: 'Technical capability', page: 'Page 8', title: 'Past work experience (₹30 L+ order)', body: 'At least one completed IP CCTV / electronic surveillance contract ≥ ₹30 Lakhs in the last 5 years for a PSU, Govt or MNC.', proof: 'Work order & completion certificate' },
  { tag: 'OEM backing', page: 'Page 9', title: 'Manufacturer Authorization Form (MAF)', body: 'Non-OEM bidders must submit a tender-specific MAF signed by the OEM, guaranteeing 3-year support.', proof: 'Form MAF Annexure-IV' },
  { tag: 'Legal integrity', page: 'Page 6', title: 'Non-blacklisting declaration', body: 'Notarized affidavit on ₹100 stamp paper declaring the firm is not debarred by any Central/State PSU.', proof: 'Notarized affidavit' },
];

const COMPLIANCE_ROWS = [
  { title: 'Class-3 Digital Signature Certificate (DSC) binding', sub: 'All bid documents encrypted with SHA-256 certificate', category: 'Statutory', enforce: 'mandatory' as const, cite: 'Sec 1.4 · Cl. 8', action: 'System verified', ok: true },
  { title: 'Public Procurement (Make in India) Order 2017', sub: 'Class-I (≥50%) or Class-II (≥20%) local content declaration', category: 'Statutory', enforce: 'mandatory' as const, cite: 'Sec 2.1 · Cl. 14', action: 'Self-cert annexure', ok: false },
  { title: 'Public Procurement Policy for MSEs Order 2012', sub: 'EMD exemption & 25% share allocation on valid Udyam entry', category: 'Financial', enforce: 'conditional' as const, cite: 'Sec 2.3 · Cl. 19', action: 'Active for ABC Eng', ok: true },
  { title: 'Integrity Pact with Independent External Monitor', sub: 'Mandatory tripartite agreement against corrupt practices', category: 'Integrity', enforce: 'mandatory' as const, cite: 'Sec 3.0 · Cl. 2', action: 'Sign Annexure-VII', ok: false },
  { title: 'Land border sharing restrictions (DoE F.No.6/18/2019-PPD)', sub: 'No beneficial ownership in land-border-sharing countries', category: 'Statutory', enforce: 'mandatory' as const, cite: 'Sec 1.2 · Cl. 6', action: 'Declaration form', ok: false },
];

const DOCUMENT_CHECKLIST = [
  { name: 'Permanent Account Number (PAN) card', sub: 'Self-attested copy of corporate entity PAN', type: 'mandatory' as const, criteria: 'Universal requirement', envelope: 'Cover 1 · Pre-qual', status: 'Uploaded' },
  { name: 'GST registration certificate', sub: 'Form GST REG-06 with all annexures', type: 'mandatory' as const, criteria: 'Universal requirement', envelope: 'Cover 1 · Pre-qual', status: 'Uploaded' },
  { name: 'Udyam MSME registration certificate', sub: 'Micro or Small enterprise category', type: 'conditional' as const, criteria: 'If claiming EMD exemption', envelope: 'Cover 1 · Pre-qual', status: 'Linked via profile' },
  { name: '3-year audited balance sheets & turnover certificate', sub: 'FY 22-23, 23-24, 24-25 with CA UDIN', type: 'mandatory' as const, criteria: 'Universal requirement', envelope: 'Cover 1 · Pre-qual', status: 'Pending' },
  { name: 'Manufacturer Authorization Form (MAF)', sub: 'On OEM official letterhead', type: 'conditional' as const, criteria: 'If bidder is not the OEM', envelope: 'Cover 2 · Technical', status: 'Pending' },
  { name: 'Technical compliance datasheet & test reports', sub: 'Line-by-line against Section IV specs', type: 'mandatory' as const, criteria: 'Universal requirement', envelope: 'Cover 2 · Technical', status: 'Pending' },
  { name: 'Past work order & completion certificates', sub: 'CCTV installations above ₹30 Lakhs', type: 'mandatory' as const, criteria: 'Universal requirement', envelope: 'Cover 2 · Technical', status: 'Pending' },
  { name: 'Notarized non-blacklisting affidavit', sub: '₹100 stamp paper, within 30 days of notice', type: 'mandatory' as const, criteria: 'Universal requirement', envelope: 'Cover 1 · Pre-qual', status: 'Pending' },
];

const TECH_SPECS = [
  { param: 'Camera resolution & frame rate', value: 'Minimum 4K UHD (3840 × 2160) @ 30 fps, progressive-scan CMOS', cite: 'Sec IV · Cl 2.1', amended: false },
  { param: 'Night vision / IR range', value: 'Minimum 50 m Smart IR with adaptive intensity (amended per Corrigendum 01)', cite: 'Corr-01 · Cl 3', amended: true },
  { param: 'Environmental ingress & impact', value: 'IP66 weather-proof and IK10 vandal-resistant metal housing', cite: 'Sec IV · Cl 2.4', amended: false },
  { param: 'On-board edge analytics', value: 'Line crossing, intrusion, defocus and scene-tamper detection', cite: 'Sec IV · Cl 2.7', amended: false },
  { param: 'Edge storage & interoperability', value: 'MicroSD up to 256 GB; ONVIF Profile S, G and T', cite: 'Sec IV · Cl 2.9', amended: false },
  { param: 'Central storage retention', value: '30 days continuous at 25 fps with H.265+ compression', cite: 'Sec IV · Cl 3.2', amended: false },
  { param: 'Comprehensive warranty & SLA', value: '3 years on-site OEM warranty, ≤ 24 h response MTTR', cite: 'Sec IV · Cl 5.1', amended: false },
];

const ACCORDIONS = [
  { id: 'gcc', icon: 'gavel', title: 'General Conditions of Contract (GCC)', body: 'Standard CPCL General Conditions of Contract (Edition 2024) apply. Where GCC and SCC differ, SCC prevails. The contractor must observe statutory labour codes, the Minimum Wages Act and ESI/PF compliance during on-site integration.' },
  { id: 'scc', icon: 'health_and_safety', title: 'Special Conditions (SCC) — Manali Refinery safety protocols', body: 'Manali Refinery is a Major Accident Hazard (MAH) installation. Field technicians entering Zone-4 must complete CPCL safety induction, wear Level-2 PPE and obtain hot/cold work permits before mounting brackets or laying conduits.' },
  { id: 'ld', icon: 'timer_off', title: 'Liquidated damages & delay penalty', body: 'Delivery beyond the 8-week window attracts liquidated damages of 0.5% of contract value per week or part thereof, capped at 10% of the purchase order value. Force Majeure delays are assessed under GCC Clause 31.' },
  { id: 'arb', icon: 'balance', title: 'Arbitration, dispute resolution & jurisdiction', body: 'Disputes not settled by executive conciliation within 45 days go to sole arbitration under the Arbitration and Conciliation Act, 1996. Seat and venue: Chennai, Tamil Nadu; Chennai courts hold exclusive jurisdiction.' },
];

const OFFICIAL_DOCS = [
  { name: 'Tender_Document_CPCL_PROC_2026_041.pdf', sub: 'Complete NIT & instructions to bidders · 48 pages', icon: 'picture_as_pdf', format: 'PDF · 3.4 MB', date: '14 Sep 2026', sig: 'dsc' as const, corrigendum: false },
  { name: 'Technical_Specifications_Schedule.pdf', sub: 'Section IV datasheet & SLD diagrams · 18 pages', icon: 'picture_as_pdf', format: 'PDF · 1.8 MB', date: '14 Sep 2026', sig: 'dsc' as const, corrigendum: false },
  { name: 'Price_BoQ_Template_Schedule_A.xlsx', sub: 'Statutory Excel price schedule with formulae', icon: 'table_chart', format: 'XLSX · 240 KB', date: '14 Sep 2026', sig: 'hash' as const, corrigendum: false },
  { name: 'Corrigendum_01_Spec_Clarification.pdf', sub: 'IR distance revision & pre-bid responses · 4 pages', icon: 'update', format: 'PDF · 420 KB', date: '22 Sep 2026', sig: 'dsc' as const, corrigendum: true },
];

function scrollToSection(id: SectionId) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function TenderDetailsPage() {
  const { ref } = useParams<{ ref: string }>();
  const [bidderState, setBidderState] = useState<BidderState>('draft');
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const cfg = STATE_CONFIG[bidderState];
  const displayRef = ref ? decodeURIComponent(ref) : TENDER_REF;
  // Which Bid Workspace step the CTA resumes at.
  // TODO: resume at the bidder's real last-completed step once drafts persist.
  const bidStartStep = bidderState === 'fresh' ? 1 : bidderState === 'submitted' ? 3 : 2;
  const bidTo = `/tenders/${encodeURIComponent(displayRef)}/bid/${bidStartStep}`;

  return (
    <BidderPortalShell>
      <div className="flex flex-col gap-10">
        {/* Demo state simulator */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-outline-variant bg-surface-container-lowest/60 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-on-surface-variant">
            <Icon name="science" size="sm" className="text-outline" />
            Prototype · bidder relationship state
          </span>
          <Tabs
            variant="pills"
            ariaLabel="Bidder state"
            value={bidderState}
            onChange={setBidderState}
            items={(Object.keys(STATE_CONFIG) as BidderState[]).map((id) => ({ id, label: STATE_CONFIG[id].label }))}
          />
        </div>

        <PageHeader
          breadcrumbs={[{ label: 'Workspace', to: '/dashboard' }, { label: 'Tenders', to: '/tenders' }, { label: displayRef }]}
          eyebrow={
            <>
              <Tag mono>{displayRef}</Tag>
              <StatusBadge status="open">NIT stage · active enquiry</StatusBadge>
              <Tag icon="category">Equipment & Hardware</Tag>
              <Tag>Two-cover (Tech + Fin)</Tag>
              <StatusBadge tone="success" icon="verified">
                MSE exemption applicable
              </StatusBadge>
            </>
          }
          title="Supply of CCTV Cameras for Public Safety Infrastructure"
          description="Chennai Petroleum Corporation Limited · Manali Refinery Operations (Zone-4 perimeter & process areas)"
          actions={
            <>
              <IconButton variant="secondary" icon="bookmark_add" aria-label="Save tender to watchlist" />
              <Button variant="secondary" leftIcon="folder_zip">
                Download (.zip)
              </Button>
              <Button size="lg" to={bidTo} rightIcon="arrow_forward" disabled={cfg.ctaDisabled}>
                {cfg.ctaTitle}
              </Button>
            </>
          }
        />

        {/* Deadline + bidder relationship */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-col divide-y divide-outline-variant lg:flex-row lg:divide-x lg:divide-y-0">
            <div className="flex items-center gap-4 p-5 sm:p-6 lg:w-[380px]">
              <span className={cn('inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-card', bidderState === 'closed' ? 'bg-neutral-container text-neutral' : 'bg-warning-container text-warning-on-container')}>
                <Icon name={bidderState === 'closed' ? 'event_busy' : 'alarm'} size="xl" />
              </span>
              <div>
                <div className="text-[12px] font-medium text-on-surface-variant">{bidderState === 'closed' ? 'Tender concluded' : 'Submission closes'}</div>
                <div className="text-[17px] font-semibold text-on-surface num">04 Oct 2026 · 17:00 IST</div>
                {bidderState !== 'closed' && (
                  <div className="mt-1">
                    <StatusBadge status="closing-soon">2 days remaining</StatusBadge>
                  </div>
                )}
              </div>
            </div>
            {!cfg.bannerHidden ? (
              <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-on-surface">{cfg.bannerTitle}</span>
                    <StatusBadge tone={cfg.chipTone}>{cfg.bannerChip}</StatusBadge>
                  </div>
                  <p className="mt-1 text-body-sm text-on-surface-variant">{cfg.bannerDesc}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-container">
                      <div className={cn('h-full rounded-full transition-all duration-500', cfg.progress === 100 ? 'bg-success' : 'bg-secondary')} style={{ width: `${cfg.progress}%` }} />
                    </div>
                    <span className="text-[13px] font-semibold text-on-surface num">{cfg.progress}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center p-5 sm:p-6 text-body-md text-on-surface-variant">The submission window for this tender has concluded. Records remain available for audit.</div>
            )}
          </div>
        </Card>

        {/* Key facts */}
        <section aria-label="Key facts" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Estimated value" value="₹42.50 L" hint="Excl. 18% GST" />
          <StatCard label="EMD amount" value="₹85,000" hint={<span className="inline-flex items-center gap-1 font-medium text-success-on-container"><Icon name="verified" size="xs" />MSME exemptible</span>} />
          <StatCard label="Cut-off" value="04 Oct" hint="17:00 IST strict" />
          <StatCard label="Technical opening" value="05 Oct" hint="11:00 IST electronic" />
          <StatCard label="Bid validity" value="90 days" hint="From tech opening" />
          <StatCard label="Delivery" value="8 weeks" hint="From LOA / PO" />
        </section>

        {/* Sticky section nav */}
        <div className="sticky top-header z-20 -mx-4 border-y border-outline-variant bg-background/90 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Tabs
              variant="pills"
              ariaLabel="Tender sections"
              value={activeSection}
              onChange={(id) => {
                setActiveSection(id);
                scrollToSection(id);
              }}
              items={SECTION_NAV.map((s) => ({ id: s.id, label: s.label, count: s.count, countTone: s.count ? 'warning' : undefined }))}
            />
            <div className="hidden shrink-0 items-center gap-1 xl:flex">
              <IconButton icon="print" aria-label="Print tender specification" onClick={() => window.print()} />
              <IconButton icon="share" aria-label="Share reference link" />
            </div>
          </div>
        </div>

        <Callout
          tone="warning"
          icon="campaign"
          title={
            <span className="flex flex-wrap items-center gap-2">
              Corrigendum 01 issued · 22 Sep 2026 <Tag mono>CPCL/PROC/2026/041/CORR-1</Tag>
            </span>
          }
          actions={
            <Button variant="secondary" size="sm" onClick={() => scrollToSection('corrigenda')}>
              View details
            </Button>
          }
        >
          After the pre-bid conference on 18 Sep 2026, the minimum IR illumination changed from 30 m to <strong>50 m Smart IR with adaptive intensity</strong>. All technical submissions must follow the revised parameter.
        </Callout>

        {/* 01 Overview */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="overview">
          <SectionHeader index="01" title="Overview & scope of work" description="Procurement objective and installation requirements · Tender document §I (pp. 1–4)" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card padding="lg" className="flex flex-col gap-5 lg:col-span-2">
              <p className="text-body-lg text-on-surface">
                CPCL, a public sector enterprise under the Ministry of Petroleum and Natural Gas, invites domestic online bids from qualified manufacturers, certified system integrators or authorized distributors for the supply, integration, testing and 3-year warranty support of high-resolution IP CCTV cameras across the Manali Refinery Complex.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { label: 'Installation zone', title: 'Zone-4 high-security perimeter', body: 'Entry Gate 2, Gate 4B and hazardous flare monitoring corridors.' },
                  { label: 'Contract type', title: 'Supply, integration & 3-yr warranty', body: 'Turnkey delivery incl. mounting hardware, surge arrestors & patch cords.' },
                ].map((b) => (
                  <div key={b.label} className="rounded-card border border-outline-variant/70 bg-surface-container-low p-4">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-secondary">{b.label}</div>
                    <div className="mt-1.5 text-[15px] font-semibold text-on-surface">{b.title}</div>
                    <div className="mt-1 text-body-sm text-on-surface-variant">{b.body}</div>
                  </div>
                ))}
              </div>
              <p className="text-body-sm text-on-surface-variant">
                All submissions are digital. Physical submissions are prohibited except EMD exemption instruments (MSE) or statutory BG originals within the mandated grace period.
              </p>
            </Card>
            <Card tone="subtle" padding="lg" className="flex flex-col gap-4">
              <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Procurement modality</div>
              <ul className="flex flex-col gap-4">
                {[
                  { icon: 'verified', title: 'Two-cover system', body: 'Cover 1 (pre-qual + technical) is evaluated before Cover 2 (BoQ) is decrypted.' },
                  { icon: 'fingerprint', title: 'Mandatory Class-3 DSC', body: 'Signing and encryption need a valid CCA digital certificate.' },
                  { icon: 'public', title: 'Make in India preference', body: 'Class-I local suppliers get purchase preference per DPIIT orders.' },
                ].map((m) => (
                  <li key={m.title} className="flex gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-container-lowest text-secondary shadow-xs">
                      <Icon name={m.icon} size="sm" />
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold text-on-surface">{m.title}</div>
                      <div className="text-body-sm text-on-surface-variant">{m.body}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* 02 Eligibility */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="eligibility">
          <SectionHeader index="02" title="Pre-qualification & eligibility" description="Auditable criteria required for bid qualification · Tender document §II (pp. 4–10)" actions={<StatusBadge status="eligible">6 of 6 met by your profile</StatusBadge>} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {ELIGIBILITY_CRITERIA.map((c) => (
              <Card key={c.title} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Tag>{c.tag}</Tag>
                  <span className="font-mono text-[11.5px] text-secondary">Tender.pdf · {c.page}</span>
                </div>
                <h3 className="text-[16px] font-semibold text-on-surface">{c.title}</h3>
                <p className="flex-1 text-body-sm text-on-surface-variant">{c.body}</p>
                <div className="flex items-center justify-between gap-2 border-t border-outline-variant/70 pt-3">
                  <span className="text-[12px] text-on-surface-variant">Proof: {c.proof}</span>
                  <Icon name="check_circle" size="md" fill className="text-success" />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* 03 Compliance */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="compliance">
          <SectionHeader index="03" title="Statutory compliance matrix" description="Government mandates and contractual obligations · Tender document §III" />
          <Card padding="none" className="overflow-hidden">
            <Table minWidth={860}>
              <THead>
                <tr>
                  <Th className="pl-6">Requirement</Th>
                  <Th>Category</Th>
                  <Th>Enforcement</Th>
                  <Th>Citation</Th>
                  <Th align="right" className="pr-6">
                    Verification
                  </Th>
                </tr>
              </THead>
              <TBody>
                {COMPLIANCE_ROWS.map((row) => (
                  <Tr key={row.title}>
                    <Td className="pl-6">
                      <CellStack primary={row.title} secondary={row.sub} />
                    </Td>
                    <Td>
                      <Tag>{row.category}</Tag>
                    </Td>
                    <Td>
                      <StatusBadge status={row.enforce} />
                    </Td>
                    <Td className="font-mono text-[12.5px] text-on-surface-variant whitespace-nowrap">{row.cite}</Td>
                    <Td align="right" className="pr-6">
                      <span className={cn('inline-flex items-center gap-1 text-[13px] font-medium whitespace-nowrap', row.ok ? 'text-success-on-container' : 'text-secondary')}>
                        <Icon name={row.ok ? 'check_circle' : 'edit_document'} size="sm" />
                        {row.action}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        </section>

        {/* 04 Required documents */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="documents">
          <SectionHeader index="04" title="Required documents" description="Prepare these before entering the bid submission workspace" actions={<StatusBadge tone="info">8 documents</StatusBadge>} />
          <Callout tone="neutral">
            Files are uploaded inside the bid workspace (step 2). PDF only, max <strong>15 MB</strong> per attachment.
          </Callout>
          <Card padding="none" className="overflow-hidden">
            <Table minWidth={880}>
              <THead>
                <tr>
                  <Th className="pl-6">Document</Th>
                  <Th>Type</Th>
                  <Th>Condition</Th>
                  <Th>Envelope</Th>
                  <Th align="right" className="pr-6">
                    Draft status
                  </Th>
                </tr>
              </THead>
              <TBody>
                {DOCUMENT_CHECKLIST.map((doc) => (
                  <Tr key={doc.name}>
                    <Td className="pl-6">
                      <CellStack primary={doc.name} secondary={doc.sub} />
                    </Td>
                    <Td>
                      <StatusBadge status={doc.type} />
                    </Td>
                    <Td className="text-body-sm text-on-surface-variant">{doc.criteria}</Td>
                    <Td className="text-[13px] text-on-surface-variant whitespace-nowrap">{doc.envelope}</Td>
                    <Td align="right" className="pr-6">
                      {doc.status === 'Pending' ? <StatusBadge status="pending" /> : <StatusBadge status="uploaded">{doc.status}</StatusBadge>}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        </section>

        {/* 05 Technical specs */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="specs">
          <SectionHeader index="05" title="Technical specifications" description="Mandatory engineering parameters for IP CCTV units · Schedule §IV (pp. 14–22)" />
          <Card padding="none" className="overflow-hidden">
            <Table minWidth={820}>
              <THead>
                <tr>
                  <Th className="pl-6">Parameter</Th>
                  <Th>CPCL requirement</Th>
                  <Th>Enforcement</Th>
                  <Th className="pr-6">Citation</Th>
                </tr>
              </THead>
              <TBody>
                {TECH_SPECS.map((spec) => (
                  <Tr key={spec.param} highlight={spec.amended ? 'warning' : undefined}>
                    <Td className="pl-6 font-medium whitespace-nowrap">{spec.param}</Td>
                    <Td className="text-on-surface-variant">
                      {spec.value}
                      {spec.amended && (
                        <span className="ml-2 align-middle">
                          <StatusBadge tone="warning" icon="update">
                            Amended
                          </StatusBadge>
                        </span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status="mandatory" />
                    </Td>
                    <Td className={cn('pr-6 font-mono text-[12.5px] whitespace-nowrap', spec.amended ? 'font-semibold text-warning-on-container' : 'text-on-surface-variant')}>{spec.cite}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        </section>

        {/* 06 Financial */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="financial">
          <SectionHeader index="06" title="Financial requirements, EMD & payment" description="Guarantees, commercial bid rules and disbursement schedule · Tender document §V" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Card className="flex flex-col gap-4">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Earnest money deposit</div>
                <div className="mt-1 text-headline-lg text-on-surface num">₹85,000</div>
                <p className="mt-1.5 text-body-sm text-on-surface-variant">Online NEFT/RTGS or a bank guarantee from a scheduled commercial bank valid for 120 days.</p>
              </div>
              <Callout tone="success" icon="verified" title="MSE exemption applied" className="mt-auto !p-3">
                100% EMD waiver against Udyam UDYAM-TN-02-0048291.
              </Callout>
            </Card>
            <Card className="flex flex-col gap-4">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Performance bank guarantee</div>
                <div className="mt-1 text-headline-lg text-on-surface">3% of contract</div>
                <p className="mt-1.5 text-body-sm text-on-surface-variant">L1 bidder furnishes a PBG within 15 days of LOA, valid 60 days beyond the 3-year warranty.</p>
              </div>
              <div className="mt-auto rounded-control bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface-variant">
                Estimated PBG <strong className="text-on-surface num">₹1,27,500</strong>
              </div>
            </Card>
            <Card className="flex flex-col gap-4">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Price BoQ format</div>
                <div className="mt-1 font-mono text-[20px] font-semibold text-on-surface">Schedule_A.xlsx</div>
                <p className="mt-1.5 text-body-sm text-on-surface-variant">Submit only through the macro-enabled template. Do not modify headers or formulae; totals include GST.</p>
              </div>
              <Button variant="outline" leftIcon="download" className="mt-auto" onClick={() => scrollToSection('corrigenda')}>
                Blank BoQ template
              </Button>
            </Card>
          </div>
          <Card>
            <div className="mb-4 text-[14px] font-semibold text-on-surface">Disbursement milestones</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { pct: '70%', label: 'Material delivery & receipt', body: 'On receipt at CPCL Manali warehouse with inspection certificate.' },
                { pct: '20%', label: 'Testing, integration & FAT', body: 'After site integration, commissioning and acceptance sign-off.' },
                { pct: '10%', label: 'PBG execution / retention', body: 'Released on PBG submission or retained across warranty.' },
              ].map((m) => (
                <div key={m.pct} className="flex gap-4 rounded-card border border-outline-variant/70 bg-surface-container-low p-4">
                  <span className="text-[22px] font-semibold text-secondary num">{m.pct}</span>
                  <div>
                    <div className="text-[14px] font-semibold text-on-surface">{m.label}</div>
                    <div className="mt-0.5 text-body-sm text-on-surface-variant">{m.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* 07 Terms */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="terms">
          <SectionHeader index="07" title="Contractual terms (GCC / SCC)" description="Legal clauses, site safety mandates and liquidated damages" />
          <Card padding="none" className="divide-y divide-outline-variant overflow-hidden">
            {ACCORDIONS.map((acc) => {
              const open = openAccordion === acc.id;
              return (
                <div key={acc.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenAccordion(open ? null : acc.id)}
                    className="focus-ring flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-surface-container-low"
                  >
                    <span className="flex items-center gap-3 text-[15px] font-semibold text-on-surface">
                      <Icon name={acc.icon} size="lg" className="text-secondary" />
                      {acc.title}
                    </span>
                    <Icon name="expand_more" size="lg" className={cn('text-outline transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && <p className="px-6 pb-5 pl-[60px] text-body-md text-on-surface-variant animate-fade-in">{acc.body}</p>}
                </div>
              );
            })}
          </Card>
        </section>

        {/* 08 Official documents */}
        <section className="flex scroll-mt-40 flex-col gap-5" id="corrigenda">
          <SectionHeader
            index="08"
            title="Official documents & corrigenda"
            description="Cryptographically signed source documents and amendments"
            actions={
              <Button variant="secondary" size="sm" leftIcon="download">
                Download all · 3.8 MB
              </Button>
            }
          />
          <Card padding="none" className="overflow-hidden">
            <Table minWidth={820}>
              <THead>
                <tr>
                  <Th className="pl-6">Document</Th>
                  <Th>Format</Th>
                  <Th>Published</Th>
                  <Th>Signature</Th>
                  <Th align="right" className="pr-6">
                    <span className="sr-only">Action</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {OFFICIAL_DOCS.map((doc) => (
                  <Tr key={doc.name} highlight={doc.corrigendum ? 'warning' : undefined}>
                    <Td className="pl-6">
                      <div className="flex items-center gap-3">
                        <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control', doc.corrigendum ? 'bg-warning-container text-warning-on-container' : doc.icon === 'table_chart' ? 'bg-success-container text-success-on-container' : 'bg-danger-container text-danger-on-container')}>
                          <Icon name={doc.icon} size="md" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[13px] font-medium text-on-surface">{doc.name}</span>
                            {doc.corrigendum && <StatusBadge tone="warning">Active</StatusBadge>}
                          </div>
                          <div className="text-body-sm text-on-surface-variant">{doc.sub}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-[13px] text-on-surface-variant whitespace-nowrap num">{doc.format}</Td>
                    <Td className="text-[13px] text-on-surface-variant whitespace-nowrap">{doc.date}</Td>
                    <Td>{doc.sig === 'dsc' ? <StatusBadge status="verified">Valid DSC</StatusBadge> : <StatusBadge tone="neutral" icon="tag">System hash valid</StatusBadge>}</Td>
                    <Td align="right" className="pr-6">
                      <Button variant="ghost" size="sm" leftIcon="download">
                        Download
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        </section>

        {/* Bottom CTA band */}
        <Card tone="brand" padding="lg" className="relative overflow-hidden">
          <span className="absolute inset-x-0 top-0 h-1 bg-saffron" aria-hidden="true" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-2">
              <span className="font-mono text-[12px] text-white/60">{displayRef}</span>
              <h3 className="text-headline-lg text-white">Ready to submit your bid?</h3>
              <p className="text-body-md text-white/75">Review the eligibility conditions and prepare the statutory documents. Your submission is cryptographically sealed and can be saved as a draft at any stage.</p>
              <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="schedule" size="sm" className="text-saffron" /> Closes 04 Oct 2026 · 17:00 IST
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="shield" size="sm" className="text-saffron" /> Class-3 DSC mandated
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col">
              <Button variant="saffron" size="lg" to={bidTo} rightIcon="arrow_forward" disabled={cfg.ctaDisabled}>
                {cfg.bottomLabel}
              </Button>
              <Button variant="ghost" className="!text-white/80 hover:!bg-white/10 hover:!text-white" leftIcon="folder_zip">
                Complete dossier (.zip)
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </BidderPortalShell>
  );
}
