// Procurement Officer — Create Tender, Step 5: Review & Publish. Real summary
// of Steps 1–4 pulled from MongoDB, a real pre-publish validation check
// (server-side, in officer/tenders.routes.ts's validateForPublish — this page
// just surfaces the same errors), and a real publish: PATCH status=published.
//
// The DSC "sign & publish" ceremony is cosmetic — there is no real officer
// signature/DSC token integration this phase. The publish action underneath
// it is real and is what makes the tender appear on GET /api/tenders.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import { Button, Callout, Card, CardHeader, Checkbox, DescriptionList, Icon, Modal, PageHeader, StatusBadge, Stepper, Tag } from '@/components/primitives';
import { clearDraftTenderId, CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, getDraftTenderId } from './createTender';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiComplianceRule, ApiTender, ApiTenderDocument, ApiTenderRequirement } from '@/lib/types';

type Phase = 'idle' | 'confirm' | 'publishing' | 'published';

export function CreateTenderReviewPage() {
  const navigate = useNavigate();
  // Captured ONCE at mount, not recomputed on every render. Recomputing it
  // via a bare `getDraftTenderId()` call was the actual bug: publish()
  // clearing sessionStorage mid-flow made `tenderId` evaluate to null on the
  // very next render (the one triggered by publish's own setTender/setPhase
  // calls), so the "no draft" guard below fired instead of the success
  // screen — even though the tender had just published correctly.
  const [tenderId] = useState(() => getDraftTenderId());

  const [tender, setTender] = useState<ApiTender | null>(null);
  const [docs, setDocs] = useState<ApiTenderDocument[] | null>(null);
  const [reqs, setReqs] = useState<ApiTenderRequirement[] | null>(null);
  const [rules, setRules] = useState<ApiComplianceRule[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [declared, setDeclared] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');

  async function load() {
    if (!tenderId) return;
    try {
      const [t, d, r, ru] = await Promise.all([
        officerApi.get<ApiTender>(`/tenders/${tenderId}`),
        officerApi.get<ApiTenderDocument[]>(`/tenders/${tenderId}/documents`),
        officerApi.get<ApiTenderRequirement[]>(`/tenders/${tenderId}/requirements`),
        officerApi.get<ApiComplianceRule[]>(`/tenders/${tenderId}/rules`),
      ]);
      setTender(t);
      setDocs(d);
      setReqs(r);
      setRules(ru);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load this tender for review.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function publish() {
    if (!tenderId) return;
    setPhase('publishing');
    setPublishError(null);
    try {
      const published = await officerApi.patch<ApiTender>(`/tenders/${tenderId}`, { status: 'published' });
      setTender(published);
      setPhase('published');
      // Deliberately NOT clearing the draft id here — see the note on
      // `tenderId` above and the comment on the exit buttons below. Clearing
      // now would also break refreshing the success screen (it re-derives
      // its state from `getDraftTenderId()` on remount, same as any other
      // step). The id is cleared only once the officer actually leaves the
      // wizard via the buttons on the success screen.
    } catch (err) {
      setPublishError(err instanceof ApiError ? err.message : 'Publish failed.');
      setPhase('idle');
    }
  }

  if (!tenderId) {
    return (
      <OfficerPortalShell breadcrumb="Create tender">
        <Callout tone="danger" title="No draft tender in progress">
          Start from Step 1 (Tender information) first.
        </Callout>
      </OfficerPortalShell>
    );
  }
  if (loadError) {
    return (
      <OfficerPortalShell breadcrumb="Create tender">
        <Callout tone="danger" title="Could not load this tender">
          {loadError}
        </Callout>
      </OfficerPortalShell>
    );
  }
  if (!tender || !docs || !reqs || !rules) {
    return (
      <OfficerPortalShell breadcrumb="Create tender">
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </OfficerPortalShell>
    );
  }

  if (phase === 'published' || tender.status === 'published') {
    return (
      <OfficerPortalShell breadcrumb="Create tender">
        <div className="mx-auto flex max-w-2xl flex-col gap-8 py-8">
          <Card padding="lg" className="flex flex-col items-center gap-4 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-container text-success">
              <Icon name="check_circle" size="xl" fill />
            </span>
            <div>
              <h1 className="text-headline-md font-semibold text-on-surface">Tender published successfully</h1>
              <p className="mt-1 text-body-md text-on-surface-variant">{tender.title} is now live for bidders.</p>
            </div>
            <DescriptionList
              className="w-full text-left"
              items={[
                { label: 'Tender number', value: <span className="font-mono">{tender.tenderNumber}</span> },
                { label: 'Status', value: <StatusBadge status="open">Published</StatusBadge> },
                { label: 'Published at', value: tender.publishedAt ? new Date(tender.publishedAt).toLocaleString('en-IN') : '—' },
                { label: 'Submission deadline', value: new Date(tender.submissionDeadline).toLocaleString('en-IN') },
              ]}
            />
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button variant="secondary" to={`/tenders/${encodeURIComponent(tender.tenderNumber)}`} onClick={() => clearDraftTenderId()}>
                View tender
              </Button>
              <Button to="/officer/tenders" onClick={() => clearDraftTenderId()}>
                Go to tender management
              </Button>
            </div>
          </Card>
        </div>
      </OfficerPortalShell>
    );
  }

  const dupChecks = [
    { ok: !!tender.title, label: 'Tender information exists' },
    { ok: docs.length > 0, label: `At least one tender document (${docs.length} attached)` },
    { ok: reqs.length > 0, label: `At least one bidder requirement (${reqs.length} configured)` },
    { ok: !!tender.tenderNumber && !tender.tenderNumber.startsWith('DRAFT-'), label: 'Valid tender number assigned' },
    { ok: !!tender.submissionStart && !!tender.submissionDeadline, label: 'Submission window set' },
    { ok: new Date(tender.submissionDeadline).getTime() > new Date(tender.submissionStart).getTime(), label: 'Deadline is after submission start' },
  ];
  const allChecksOk = dupChecks.every((c) => c.ok);

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-6 pb-28">
        <PageHeader
          breadcrumbs={[{ label: 'Officer workspace', to: '/officer/dashboard' }, { label: 'Tenders', to: '/officer/tenders' }, { label: 'Create tender', to: CREATE_TENDER_ROUTES.info }, { label: 'Review & publish' }]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{tender.tenderNumber}</Tag>
            </>
          }
          title="Review & publish"
          description="Check every section before publishing. Once published, the schedule and identity fields lock once submissions open."
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={5} />
        </Card>

        {publishError && (
          <Callout tone="danger" title="Could not publish">
            {publishError}
          </Callout>
        )}

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-6">
            <Card padding="lg" as="section">
              <CardHeader icon="assignment" title="1. Tender information" actions={<Button size="sm" variant="ghost" leftIcon="edit" to={CREATE_TENDER_ROUTES.info}>Edit</Button>} />
              <DescriptionList
                items={[
                  { label: 'Title', value: tender.title || '—' },
                  { label: 'Reference', value: <span className="font-mono">{tender.tenderNumber}</span> },
                  { label: 'Department', value: tender.department || '—' },
                  { label: 'Estimated value', value: tender.value || '—' },
                  { label: 'Submission window', value: `${new Date(tender.submissionStart).toLocaleString('en-IN')} → ${new Date(tender.submissionDeadline).toLocaleString('en-IN')}` },
                  { label: 'Evaluation mode', value: <StatusBadge tone={tender.evaluationMode === 'IMMEDIATE' ? 'warning' : 'neutral'}>{tender.evaluationMode === 'IMMEDIATE' ? 'Immediate Evaluation' : 'Sealed Evaluation'}</StatusBadge> },
                ]}
              />
            </Card>
            <Card padding="lg" as="section">
              <CardHeader icon="folder_open" title="2. Tender documents" actions={<Button size="sm" variant="ghost" leftIcon="edit" to={CREATE_TENDER_ROUTES.documents}>Edit</Button>} />
              <DescriptionList items={[{ label: 'Documents', value: `${docs.length} file${docs.length === 1 ? '' : 's'}` }, { label: 'Files', value: docs.map((d) => d.originalFilename).join(', ') || '—' }]} />
            </Card>
            <Card padding="lg" as="section">
              <CardHeader icon="checklist" title="3. Bidder requirements" actions={<Button size="sm" variant="ghost" leftIcon="edit" to={CREATE_TENDER_ROUTES.requirements}>Edit</Button>} />
              <DescriptionList
                items={[
                  { label: 'Requirements', value: `${reqs.length} total · ${reqs.filter((r) => r.mandatory).length} mandatory · ${reqs.filter((r) => r.conditional).length} conditional` },
                  { label: 'Approved', value: `${reqs.filter((r) => r.status === 'approved').length}` },
                ]}
              />
            </Card>
            <Card padding="lg" as="section">
              <CardHeader icon="rule" title="4. Rules & compliance" actions={<Button size="sm" variant="ghost" leftIcon="edit" to={CREATE_TENDER_ROUTES.rules}>Edit</Button>} />
              <DescriptionList items={[{ label: 'Compliance rules', value: `${rules.length} configured` }]} />
            </Card>
          </div>

          <div className="flex h-fit flex-col gap-8 xl:sticky xl:top-24">
            <Card padding="lg">
              <CardHeader icon="fact_check" title="Pre-publish checks" description="All checks must pass" />
              <ul className="flex flex-col gap-3">
                {dupChecks.map((c) => (
                  <li key={c.label} className="flex items-start gap-2.5 text-[14px] text-on-surface">
                    <Icon name={c.ok ? 'check_circle' : 'cancel'} size="md" fill className={c.ok ? 'mt-0.5 shrink-0 text-success' : 'mt-0.5 shrink-0 text-danger'} />
                    {c.label}
                  </li>
                ))}
              </ul>
            </Card>
            <Card padding="lg">
              <CardHeader icon="gavel" title="Officer declaration" />
              <Checkbox checked={declared} onChange={(e) => setDeclared(e.target.checked)} label="I confirm the tender details are accurate and I am authorised to publish this tender." />
            </Card>
          </div>
        </div>
      </div>

      <BidActionBar
        left={
          <>
            <Button variant="secondary" leftIcon="arrow_back" to={CREATE_TENDER_ROUTES.rules}>
              Back
            </Button>
            <Button variant="ghost" leftIcon="save" onClick={() => navigate('/officer/tenders')}>
              Save draft & exit
            </Button>
          </>
        }
        center={<span className="text-body-sm text-on-surface-variant">{!allChecksOk ? 'Resolve the pre-publish checks first' : declared ? 'Ready to publish' : 'Accept the officer declaration to publish'}</span>}
        right={
          <Button leftIcon="verified_user" disabled={!declared || !allChecksOk} onClick={() => setPhase('confirm')}>
            Sign & publish tender
          </Button>
        }
      />

      <Modal
        open={phase === 'confirm' || phase === 'publishing'}
        onClose={() => phase === 'confirm' && setPhase('idle')}
        icon="verified_user"
        size="md"
        title={phase === 'publishing' ? 'Publishing…' : 'Publish this tender?'}
        description={tender.tenderNumber}
        footer={
          phase === 'confirm' && (
            <>
              <Button variant="secondary" onClick={() => setPhase('idle')}>
                Cancel
              </Button>
              <Button leftIcon="verified_user" onClick={publish}>
                Publish
              </Button>
            </>
          )
        }
      >
        {phase === 'publishing' ? (
          <p className="flex items-center gap-3 text-body-md text-on-surface" aria-live="polite">
            <Icon name="progress_activity" size="lg" spin className="text-secondary" />
            Publishing to MongoDB…
          </p>
        ) : (
          <p className="text-body-md text-on-surface-variant">The tender will be visible to all bidders immediately (GET /api/tenders) and submissions open on schedule. After publishing, schedule fields lock once submissions open.</p>
        )}
      </Modal>
    </OfficerPortalShell>
  );
}
