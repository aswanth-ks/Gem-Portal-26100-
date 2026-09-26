// Procurement Officer — Create Tender, Step 4: Review & Publish. Read-only
// summary of Steps 1–3 with edit links, a pre-publish checklist, officer
// declaration and a DSC sign-and-publish flow (confirm → signing → published).
// Same header, stepper, cards and action bar as the previous steps.
//
// TODO: read the saved draft from /api/officer/tenders/drafts/:ref and POST
// publish with the DSC signature.

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import { Button, Card, CardHeader, Checkbox, DescriptionList, Icon, Modal, PageHeader, StatusBadge, Stepper, Tag } from '@/components/primitives';
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, DRAFT_REF } from './createTender';

const SUMMARY: { step: number; icon: string; title: string; to: string; items: { label: string; value: ReactNode }[] }[] = [
  {
    step: 1,
    icon: 'assignment',
    title: 'Tender information',
    to: CREATE_TENDER_ROUTES.info,
    items: [
      { label: 'Title', value: 'Supply of CCTV Cameras for Public Safety Infrastructure' },
      { label: 'Reference', value: <span className="font-mono">CPCL/PROC/2026/041</span> },
      { label: 'Type · category', value: 'Open tender (NCB) · IT & industrial telecom' },
      { label: 'Estimated value', value: <span className="num">₹ 42,50,000</span> },
      { label: 'Submission window', value: '20 Sep 2026, 11:00 → 04 Oct 2026, 17:00 IST' },
      { label: 'Bid opening', value: '04 Oct 2026, 17:30 IST' },
      { label: 'EMD', value: <span className="num">₹ 85,000 (MSME/startups exempt)</span> },
      { label: 'Nodal officer', value: 'Arun Kumar · arun.kumar@cpcl.co.in' },
    ],
  },
  {
    step: 2,
    icon: 'folder_open',
    title: 'Tender documents',
    to: CREATE_TENDER_ROUTES.documents,
    items: [
      { label: 'Documents', value: '3 files · all sealed with DSC' },
      { label: 'Files', value: 'Technical specification · NIT · BOQ & rate schedule' },
    ],
  },
  {
    step: 3,
    icon: 'fact_check',
    title: 'Compliance configuration',
    to: CREATE_TENDER_ROUTES.compliance,
    items: [
      { label: 'Bidder requirements', value: '7 · 6 AI suggested, 1 officer added' },
      { label: 'Evaluation rules', value: '8 · technical & financial, each linked to its source page' },
      { label: 'Officer review', value: 'Flagged items reviewed · final decisions stay with the officer' },
    ],
  },
];

const CHECKS = ['Schedule meets the CVC 14-day minimum', 'All documents fingerprinted and DSC-sealed', 'Requirements and rules reviewed by the officer', 'Integrity Pact applied (value above ₹ 25 Lakh)'];

type Phase = 'idle' | 'confirm' | 'signing' | 'published';

export function CreateTenderReviewPage() {
  const navigate = useNavigate();
  const [declared, setDeclared] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');

  function sign() {
    setPhase('signing');
    setTimeout(() => setPhase('published'), 1600);
  }

  if (phase === 'published') {
    return (
      <OfficerPortalShell breadcrumb="Create tender">
        <div className="mx-auto flex max-w-2xl flex-col gap-8 py-8">
          <Card padding="lg" className="flex flex-col items-center gap-4 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-container text-success">
              <Icon name="check_circle" size="xl" fill />
            </span>
            <div>
              <h1 className="text-headline-md font-semibold text-on-surface">Tender published</h1>
              <p className="mt-1 text-body-md text-on-surface-variant">Supply of CCTV Cameras for Public Safety Infrastructure is now live for bidders.</p>
            </div>
            <DescriptionList
              className="w-full text-left"
              items={[
                { label: 'Tender reference', value: <span className="font-mono">CPCL/PROC/2026/041</span> },
                { label: 'Status', value: <StatusBadge status="open">Submission open</StatusBadge> },
                { label: 'Signed by', value: 'Arun Kumar · CPCL-OFF-4092 (DSC Level-3)' },
                { label: 'Submission deadline', value: '04 Oct 2026, 17:00 IST' },
              ]}
            />
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button variant="secondary" to="/officer/dashboard">
                Go to dashboard
              </Button>
              <Button rightIcon="arrow_forward" to="/officer/tenders">
                View in tenders
              </Button>
            </div>
          </Card>
        </div>
      </OfficerPortalShell>
    );
  }

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-8 pb-28">
        <PageHeader
          breadcrumbs={[
            { label: 'Officer workspace', to: '/officer/dashboard' },
            { label: 'Tenders', to: '/officer/tenders' },
            { label: `Create tender (${DRAFT_REF})`, to: CREATE_TENDER_ROUTES.info },
            { label: 'Review & publish' },
          ]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{DRAFT_REF}</Tag>
              <StatusBadge tone="success">Ready to publish</StatusBadge>
            </>
          }
          title="Review & publish"
          description="Check every section before signing. Once published, changes are only possible through a corrigendum."
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={4} />
        </Card>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-8">
            {SUMMARY.map((s) => (
              <Card key={s.step} padding="lg" as="section">
                <CardHeader
                  icon={s.icon}
                  title={`${s.step}. ${s.title}`}
                  actions={
                    <Button size="sm" variant="ghost" leftIcon="edit" to={s.to}>
                      Edit
                    </Button>
                  }
                />
                <DescriptionList items={s.items} />
              </Card>
            ))}
          </div>

          <div className="flex h-fit flex-col gap-8 xl:sticky xl:top-24">
            <Card padding="lg">
              <CardHeader icon="fact_check" title="Pre-publish checks" description="All checks must pass" />
              <ul className="flex flex-col gap-3">
                {CHECKS.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-[14px] text-on-surface">
                    <Icon name="check_circle" size="md" fill className="mt-0.5 shrink-0 text-success" />
                    {c}
                  </li>
                ))}
              </ul>
            </Card>
            <Card padding="lg">
              <CardHeader icon="gavel" title="Officer declaration" />
              <Checkbox
                checked={declared}
                onChange={(e) => setDeclared(e.target.checked)}
                label="I confirm the tender details are accurate, comply with GFR 2017 and CVC guidelines, and I am authorised to publish this tender."
              />
            </Card>
          </div>
        </div>
      </div>

      <BidActionBar
        left={
          <>
            <Button variant="secondary" leftIcon="arrow_back" to={CREATE_TENDER_ROUTES.compliance}>
              Back
            </Button>
            <Button variant="ghost" leftIcon="save" onClick={() => navigate('/officer/tenders')}>
              Save draft & exit
            </Button>
          </>
        }
        center={<span className="text-body-sm text-on-surface-variant">{declared ? 'Ready to sign with your DSC' : 'Accept the officer declaration to publish'}</span>}
        right={
          <Button leftIcon="verified_user" disabled={!declared} onClick={() => setPhase('confirm')}>
            Sign & publish tender
          </Button>
        }
      />

      <Modal
        open={phase === 'confirm' || phase === 'signing'}
        onClose={() => phase === 'confirm' && setPhase('idle')}
        icon="verified_user"
        size="md"
        title={phase === 'signing' ? 'Signing with DSC…' : 'Publish this tender?'}
        description="CPCL/PROC/2026/041"
        footer={
          phase === 'confirm' && (
            <>
              <Button variant="secondary" onClick={() => setPhase('idle')}>
                Cancel
              </Button>
              <Button leftIcon="verified_user" onClick={sign}>
                Sign & publish
              </Button>
            </>
          )
        }
      >
        {phase === 'signing' ? (
          <p className="flex items-center gap-3 text-body-md text-on-surface" aria-live="polite">
            <Icon name="progress_activity" size="lg" spin className="text-secondary" />
            Applying Level-3 signature and registering in the audit ledger…
          </p>
        ) : (
          <p className="text-body-md text-on-surface-variant">
            The tender will be visible to all bidders immediately and submissions open on schedule. After publishing, changes need a corrigendum.
          </p>
        )}
      </Modal>
    </OfficerPortalShell>
  );
}
