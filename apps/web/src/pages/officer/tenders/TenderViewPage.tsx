// Procurement Officer — Tender View. Real record of a tender: loads the
// actual Tender, its TenderDocuments, TenderRequirements, ComplianceRules and
// real bid count from the backend. Nothing here is hardcoded — a field that
// isn't persisted is shown as "Not configured" rather than invented.
//
// This route (/officer/tenders/:tenderNumber) stays entirely inside the
// officer application. It must never be confused with the bidder-facing
// /tenders/:tenderNumber route (TenderDetailsPage) — that page renders the
// bidder shell/experience and is a completely separate component.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Callout, Card, CardHeader, DescriptionList, EmptyState, Icon, PageHeader, StatusBadge, Tag } from '@/components/primitives';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiComplianceRule, ApiOfficerBidsForTender, ApiTender, ApiTenderDocument, ApiTenderRequirement } from '@/lib/types';

function isSubmissionOpen(tender: ApiTender): boolean {
  const now = Date.now();
  return tender.status === 'published' && now >= new Date(tender.submissionStart).getTime() && now < new Date(tender.submissionDeadline).getTime();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TenderViewPage() {
  const { tenderNumber: encoded } = useParams<{ tenderNumber: string }>();
  const tenderNumber = encoded ? decodeURIComponent(encoded) : '';

  const [tender, setTender] = useState<ApiTender | null | undefined>(undefined); // undefined = loading, null = not found
  const [documents, setDocuments] = useState<ApiTenderDocument[]>([]);
  const [requirements, setRequirements] = useState<ApiTenderRequirement[]>([]);
  const [rules, setRules] = useState<ApiComplianceRule[]>([]);
  const [bidsData, setBidsData] = useState<ApiOfficerBidsForTender | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await officerApi.get<ApiTender[]>('/tenders');
        const match = all.find((t) => t.tenderNumber === tenderNumber) ?? null;
        if (cancelled) return;
        setTender(match);
        if (!match) return;
        const [docs, reqs, ruleList, bids] = await Promise.all([
          officerApi.get<ApiTenderDocument[]>(`/tenders/${match._id}/documents`).catch(() => []),
          officerApi.get<ApiTenderRequirement[]>(`/tenders/${match._id}/requirements`).catch(() => []),
          officerApi.get<ApiComplianceRule[]>(`/tenders/${match._id}/rules`).catch(() => []),
          officerApi.get<ApiOfficerBidsForTender>(`/tenders/${match._id}/bids`).catch(() => null),
        ]);
        if (cancelled) return;
        setDocuments(docs);
        setRequirements(reqs);
        setRules(ruleList);
        setBidsData(bids);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this tender.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenderNumber]);

  if (loadError) {
    return (
      <OfficerPortalShell breadcrumb="Tender view">
        <Callout tone="danger" title="Could not load this tender">
          {loadError}
        </Callout>
      </OfficerPortalShell>
    );
  }

  if (tender === undefined) {
    return (
      <OfficerPortalShell breadcrumb="Tender view">
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </OfficerPortalShell>
    );
  }

  if (tender === null) {
    return (
      <OfficerPortalShell breadcrumb="Tender view">
        <EmptyState icon="search_off" title="Tender not found" description="Check the link or return to the tenders list." actions={<Button to="/officer/tenders">Back to tenders</Button>} />
      </OfficerPortalShell>
    );
  }

  const submissionOpen = isSubmissionOpen(tender);

  return (
    <OfficerPortalShell breadcrumb={tender.tenderNumber}>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: 'Tenders', to: '/officer/tenders' }, { label: tender.tenderNumber }]}
          eyebrow={
            <>
              <StatusBadge status={tender.status === 'draft' ? 'draft' : tender.status === 'closed' ? 'closed' : 'active'}>{tender.status === 'draft' ? 'Draft' : tender.status === 'closed' ? 'Closed' : 'Published'}</StatusBadge>
              {tender.status === 'published' && <StatusBadge tone={submissionOpen ? 'info' : 'warning'}>{submissionOpen ? 'Submission open' : 'Submission closed'}</StatusBadge>}
            </>
          }
          title={tender.title || 'Untitled tender'}
          description="Real tender record loaded from the database."
          actions={
            <Button variant="secondary" leftIcon="arrow_back" to="/officer/tenders">
              Back to tenders
            </Button>
          }
        />

        <Card padding="lg">
          <h2 className="mb-4 inline-flex items-center gap-2 text-headline-sm font-semibold text-on-surface">
            <Icon name="badge" size="md" className="text-secondary" />
            Tender summary
          </h2>
          <DescriptionList
            columns={2}
            items={[
              { label: 'Tender number', value: <span className="font-mono">{tender.tenderNumber}</span> },
              { label: 'Department / organization', value: tender.department || 'Not configured' },
              { label: 'Status', value: <StatusBadge status={tender.status === 'draft' ? 'draft' : tender.status === 'closed' ? 'closed' : 'active'} /> },
              { label: 'Submission start', value: tender.submissionStart ? new Date(tender.submissionStart).toLocaleString('en-IN') : 'Not configured' },
              { label: 'Submission deadline', value: tender.submissionDeadline ? <span className="num">{new Date(tender.submissionDeadline).toLocaleString('en-IN')}</span> : 'Not configured' },
              { label: 'Published', value: tender.publishedAt ? new Date(tender.publishedAt).toLocaleString('en-IN') : 'Not published' },
              { label: 'Estimated value', value: tender.value?.trim() ? <span className="num">{tender.value}</span> : 'Not configured' },
              { label: 'Bid opening / contract period / EMD', value: <span className="text-on-surface-variant">Not tracked as separate fields in the current tender schema.</span> },
            ]}
          />
        </Card>

        <Card padding="lg">
          <h2 className="mb-2 inline-flex items-center gap-2 text-headline-sm font-semibold text-on-surface">
            <Icon name="description" size="md" className="text-secondary" />
            Description
          </h2>
          <p className="text-[14px] text-on-surface-variant">{tender.description?.trim() || 'No description recorded.'}</p>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
            <CardHeader icon="folder_special" title="Tender documents" />
            <StatusBadge tone="neutral">{documents.length}</StatusBadge>
          </div>
          {documents.length === 0 ? (
            <p className="px-6 py-6 text-center text-body-sm text-on-surface-variant">No tender documents uploaded.</p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {documents.map((d) => (
                <li key={d._id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <span className="font-mono text-[12.5px] text-on-surface">{d.originalFilename}</span>
                  <span className="text-body-sm text-on-surface-variant">{formatSize(d.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
            <CardHeader icon="fact_check" title="Bidder requirements" />
            <StatusBadge tone="neutral">{requirements.length}</StatusBadge>
          </div>
          {requirements.length === 0 ? (
            <p className="px-6 py-6 text-center text-body-sm text-on-surface-variant">No requirements recorded for this tender.</p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {requirements.map((r) => (
                <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3">
                  <div>
                    <span className="font-mono text-[12px] text-on-surface-variant">{r.code}</span>
                    <span className="ml-2 text-[14px] font-medium text-on-surface">{r.title}</span>
                  </div>
                  <StatusBadge status={r.mandatory ? 'mandatory' : r.conditional ? 'conditional' : 'pending'}>{r.mandatory ? 'Mandatory' : r.conditional ? 'Conditional' : 'Optional'}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
            <CardHeader icon="gavel" title="Compliance rules" />
            <StatusBadge tone="neutral">{rules.length}</StatusBadge>
          </div>
          {rules.length === 0 ? (
            <p className="px-6 py-6 text-center text-body-sm text-on-surface-variant">No compliance rules configured for this tender.</p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {rules.map((r) => (
                <li key={r._id} className="px-6 py-3 text-[13px] text-on-surface">
                  <span className="font-mono text-[12px] text-on-surface-variant">{r.field}</span> {r.operator} <span className="font-mono">{JSON.stringify(r.value ?? r.parameters ?? '')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface-container-low text-on-surface-variant">
                <Icon name={bidsData?.sealed ? 'lock' : 'lock_open'} size="lg" />
              </span>
              <div>
                <h2 className="text-[16px] font-semibold text-on-surface">{bidsData ? (bidsData.sealed ? 'Bids sealed' : 'Bid vault open') : 'Bids'}</h2>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  {bidsData
                    ? bidsData.sealed
                      ? `Bidder identities and submissions stay sealed until the submission deadline (${new Date(bidsData.deadline).toLocaleString('en-IN')}).`
                      : 'The submission deadline has passed. Bids are available for review.'
                    : 'Bid data unavailable.'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge tone="neutral">
                <span className="num">{bidsData?.bids.length ?? 0}</span> bids received
              </StatusBadge>
              {bidsData?.sealed ? (
                <Button disabled leftIcon="lock" title="Bids remain sealed until the submission deadline.">
                  View bids
                </Button>
              ) : (
                <Button rightIcon="arrow_forward" to={`/officer/bids?tender=${encodeURIComponent(tender.tenderNumber)}`}>
                  View bids
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Tag icon="info">Compliance evaluation is not implemented yet — this page shows the real tender record only.</Tag>
      </div>
    </OfficerPortalShell>
  );
}
