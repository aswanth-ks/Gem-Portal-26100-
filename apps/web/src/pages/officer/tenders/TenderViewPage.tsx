// Procurement Officer — Tender View. Read-only record of a published
// tender: once published, a tender is permanently locked (see
// tenderLifecycle.ts) and this page is the only way to look at it — there
// is no Edit action anywhere on it, by design. Bid vault access is gated
// by the same computed deadline check the Bids workspace uses, so it
// unlocks itself the moment the deadline passes rather than needing the
// officer to do anything.
//
// TODO: GET /api/officer/tenders/:ref (published, immutable record).
// A real backend must also reject requests for bid contents before the
// deadline server-side — this page only controls what the UI shows.

import { useParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Callout, Card, DescriptionList, EmptyState, Icon, PageHeader, StatusBadge, Tag } from '@/components/primitives';
import { BIDS, TENDERS, refToSlug, slugToRef, type Tender } from '@/pages/officer/bids/assessmentData';
import { isSealed } from '@/pages/officer/tenderLifecycle';

interface Scope {
  department: string;
  created: string;
  submissionStart: string;
  workDescription: string;
  scopeOfWork: string[];
  technicalRequirements: string[];
  eligibility: string[];
  requiredDocuments: string[];
  value: string;
  terms: string[];
}

const SCOPES: Record<string, Scope> = {
  'CPCL/PROC/2026/041': {
    department: 'Refinery Unit-I Security Wing · Manali Refinery',
    created: '18 Sep 2026',
    submissionStart: '20 Sep 2026, 10:00',
    workDescription: 'Supply, installation, testing and commissioning of an IP-based CCTV surveillance system across Refinery Unit-I perimeter and process areas, with a 3-year comprehensive maintenance contract.',
    scopeOfWork: ['140 Nos. 4K PTZ weatherproof IP cameras (ONVIF Profile S/G/T)', '64-channel NVR with 45-day recording retention', 'Control room VMS integration and operator training', '3-year comprehensive annual maintenance contract'],
    technicalRequirements: ['Camera resolution ≥ 4K, IP67 ingress rating', 'IR night vision, ONVIF-compliant', 'Storage retention ≥ 30 days', 'Warranty ≥ 3 years comprehensive'],
    eligibility: ['Average annual turnover ≥ ₹50 Lakhs (last 3 financial years)', 'Completed one similar CCTV/surveillance work ≥ ₹34 Lakh in the last 7 years', 'Valid OEM authorization for quoted camera and NVR models'],
    requiredDocuments: ['PAN certificate', 'GST registration certificate', 'Audited financial statements (3 years)', 'OEM authorization letter', 'Experience/completion certificates', 'Technical compliance statement'],
    value: '₹ 42,50,000 (excl. GST)',
    terms: ['EMD ₹85,000 (MSME/Startups exempt)', 'Two-envelope (technical, then financial) evaluation', 'Bid validity 90 days from technical bid opening', 'MSE and Make in India purchase preference apply'],
  },
  'CPCL/PROC/2026/039': {
    department: 'Central OT Security Cell · Manali Refinery',
    created: '10 Sep 2026',
    submissionStart: '15 Sep 2026, 10:00',
    workDescription: 'Supply and deployment of next-generation firewalls and intrusion prevention systems across the refinery’s OT/IT network boundary, under a limited expression of interest.',
    scopeOfWork: ['Next-gen firewall pairs at 4 OT/IT boundary points', 'Centralized IPS management console', 'Network segmentation as per IEC 62443 zones/conduits'],
    technicalRequirements: ['Firewall throughput ≥ 10 Gbps', 'IEC 62443-4-2 certified appliances', 'Redundant HA pair per site'],
    eligibility: ['Empanelled OEM partner status', 'Prior OT security deployment in a process industry'],
    requiredDocuments: ['PAN & GST certificates', 'OEM partner certificate', 'Past deployment references'],
    value: '₹ 28,00,000 (excl. GST)',
    terms: ['EMD as specified in the tender', 'Single-stage, single-envelope evaluation', 'Bid validity 90 days'],
  },
  'CPCL/PROC/2026/037': {
    department: 'Refinery-II Central DCS',
    created: '02 Sep 2026',
    submissionStart: '14 Sep 2026, 10:00',
    workDescription: 'Supply, installation and commissioning of a control room video wall matrix and operator display consoles for Refinery-II Central DCS.',
    scopeOfWork: ['9-screen video wall with matrix switcher', 'Operator console furniture and cabling', 'Integration with existing DCS/SCADA feeds'],
    technicalRequirements: ['55" 4K narrow-bezel displays', 'Redundant matrix switcher', 'Uptime SLA 99.9%'],
    eligibility: ['Turnkey control-room integration experience', 'Local service presence in Tamil Nadu'],
    requiredDocuments: ['PAN & GST certificates', 'Experience certificates', 'Technical compliance statement'],
    value: '₹ 61,00,000 (excl. GST)',
    terms: ['EMD as specified in the tender', 'National competitive bidding (NCB)', 'Bid validity 120 days'],
  },
  'CPCL/PROC/2026/035': {
    department: 'Crude Distillation Unit (CDU)',
    created: '25 Aug 2026',
    submissionStart: '01 Sep 2026, 10:00',
    workDescription: 'Supply and installation of a gas detection sensor array and safety monitoring system across the Crude Distillation Unit, under a global tender (ICB).',
    scopeOfWork: ['48 Nos. fixed gas detectors (H2S, LEL, CO)', 'Central safety monitoring panel with SIL-2 rating', 'Cabling and hazardous-area installation'],
    technicalRequirements: ['SIL-2 certified detection loop', 'ATEX/IECEx certified field devices', 'Integration with plant ESD system'],
    eligibility: ['SIL-2 system integration experience', 'ATEX-certified equipment supply record'],
    requiredDocuments: ['PAN & GST certificates', 'SIL-2 competency certificate', 'ATEX/IECEx certificates for offered devices'],
    value: '₹ 74,20,000 (excl. GST)',
    terms: ['EMD as specified in the tender', 'Global tender (ICB), two-envelope evaluation', 'Bid validity 120 days'],
  },
};

const GENERIC_SCOPE: Scope = {
  department: 'Chennai Petroleum Corporation Limited',
  created: '—',
  submissionStart: '—',
  workDescription: 'Detailed scope of work as published in the tender document.',
  scopeOfWork: ['As per the published Notice Inviting Tender and technical specification.'],
  technicalRequirements: ['As per the published technical specification.'],
  eligibility: ['As per the published eligibility criteria.'],
  requiredDocuments: ['As per the published bidder requirements.'],
  value: 'As specified in the tender',
  terms: ['As per the published terms and conditions.'],
};

function ScopeSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-outline-variant px-6 py-5 first:border-t-0">
      <h3 className="mb-2 inline-flex items-center gap-2 text-[14px] font-semibold text-on-surface">
        <Icon name={icon} size="sm" className="text-secondary" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((i) => (
        <li key={i} className="flex items-start gap-2 text-[14px] text-on-surface">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-outline" aria-hidden="true" />
          {i}
        </li>
      ))}
    </ul>
  );
}

export function TenderViewPage() {
  const { slug } = useParams();
  const ref = slugToRef(slug ?? '');
  const tender = TENDERS.find((t) => t.ref === ref);

  if (!tender) {
    return (
      <OfficerPortalShell breadcrumb="Tender view">
        <EmptyState icon="search_off" title="Tender not found" description="Check the link or return to the tenders list." actions={<Button to="/officer/tenders">Back to tenders</Button>} />
      </OfficerPortalShell>
    );
  }

  return <TenderView tender={tender} />;
}

function TenderView({ tender }: { tender: Tender }) {
  const scope = SCOPES[tender.ref] ?? GENERIC_SCOPE;
  const sealed = isSealed(tender.deadlineISO);
  const bidCount = (BIDS[tender.ref] ?? []).length || tender.bids;

  return (
    <OfficerPortalShell breadcrumb={tender.ref}>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: 'Tenders', to: '/officer/tenders' }, { label: tender.ref }]}
          eyebrow={
            <>
              <StatusBadge tone="neutral" icon="lock">Published & locked</StatusBadge>
              <StatusBadge tone={sealed ? 'info' : 'warning'}>{sealed ? 'Bidding open' : 'Submission closed'}</StatusBadge>
            </>
          }
          title={tender.title}
          description="This is the permanent, read-only record of the published tender. It cannot be edited, reversed or modified."
          actions={
            <Button variant="secondary" leftIcon="arrow_back" to="/officer/tenders">
              Back to tenders
            </Button>
          }
        />

        {/* Tender summary */}
        <Card padding="lg">
          <h2 className="mb-4 inline-flex items-center gap-2 text-headline-sm font-semibold text-on-surface">
            <Icon name="badge" size="md" className="text-secondary" />
            Tender summary
          </h2>
          <DescriptionList
            columns={2}
            items={[
              { label: 'Tender ID', value: <span className="font-mono">{tender.ref}</span> },
              { label: 'Department / client', value: scope.department },
              { label: 'Created', value: scope.created },
              { label: 'Submission start', value: scope.submissionStart },
              { label: 'Submission deadline', value: <span className="num">{tender.deadline} IST</span> },
              { label: 'Current status', value: sealed ? <StatusBadge tone="info">Bidding open</StatusBadge> : <StatusBadge tone="warning">Submission closed</StatusBadge> },
            ]}
          />
        </Card>

        {/* Predefined scope — locked */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-6 py-4">
            <h2 className="inline-flex items-center gap-2 text-headline-sm font-semibold text-on-surface">
              <Icon name="lock" size="md" className="text-secondary" />
              Predefined scope — Locked
            </h2>
            <Tag icon="verified_user">No edit action exists for a published tender</Tag>
          </div>
          <ScopeSection icon="description" title="Work description">
            <p className="text-[14px] text-on-surface-variant">{scope.workDescription}</p>
          </ScopeSection>
          <ScopeSection icon="list_alt" title="Scope of work">
            <BulletList items={scope.scopeOfWork} />
          </ScopeSection>
          <ScopeSection icon="engineering" title="Technical requirements">
            <BulletList items={scope.technicalRequirements} />
          </ScopeSection>
          <ScopeSection icon="fact_check" title="Eligibility criteria">
            <BulletList items={scope.eligibility} />
          </ScopeSection>
          <ScopeSection icon="folder_open" title="Required documents">
            <BulletList items={scope.requiredDocuments} />
          </ScopeSection>
          <ScopeSection icon="payments" title="Tender value / budget">
            <p className="num text-[14px] font-semibold text-on-surface">{scope.value}</p>
          </ScopeSection>
          <ScopeSection icon="gavel" title="Terms and conditions">
            <BulletList items={scope.terms} />
          </ScopeSection>
          <div className="border-t border-outline-variant bg-surface-container-low px-6 py-4">
            <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
              <Icon name="info" size="sm" className="mt-0.5 shrink-0 text-outline" />
              This scope was fixed at publication and cannot be changed through the normal workflow. A correction requires a formal corrigendum issued outside this screen.
            </p>
          </div>
        </Card>

        {/* Bid vault */}
        <Card padding="lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className={sealed ? 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface-container-low text-on-surface-variant' : 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-success-container text-success'}>
                <Icon name={sealed ? 'lock' : 'lock_open'} size="lg" />
              </span>
              <div>
                <h2 className="text-[16px] font-semibold text-on-surface">{sealed ? 'Bids sealed' : 'Bid vault open'}</h2>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  {sealed
                    ? `Bid details will become available after the submission deadline (${tender.deadline} IST).`
                    : 'The submission deadline has passed. Bidder identities, amounts and documents are now available for assessment.'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge tone="neutral">
                <span className="num">{bidCount}</span> bids received
              </StatusBadge>
              {sealed ? (
                <Button disabled leftIcon="lock" title="Bids remain sealed until the submission deadline.">
                  View bids
                </Button>
              ) : (
                <Button rightIcon="arrow_forward" to={`/officer/bids?tender=${refToSlug(tender.ref)}`}>
                  View bids
                </Button>
              )}
            </div>
          </div>
          {sealed && (
            <Callout tone="neutral" icon="shield" className="mt-4">
              Bidder names, bid amounts, documents and assessment findings stay locked for every officer until the deadline passes. Only the aggregate count above is visible before then.
            </Callout>
          )}
        </Card>
      </div>
    </OfficerPortalShell>
  );
}
