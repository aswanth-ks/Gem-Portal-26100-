// Bid Submission Workspace — Step 2: Documents.
//
// Phase 5.2 — Step 2 is document collection ONLY. It renders a checklist
// driven by the tender's own real TenderRequirement records (never a
// hardcoded document list) and lets the bidder upload/replace/remove a file
// against each one. There is no AI call here — no classification, no
// extraction, no confidence, no compliance status. Document-intelligence
// processing starts only after the bid is submitted (see bids.routes.ts's
// `/submit`, which now triggers it).

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import { Button, Callout, Card, Icon, PageHeader, StatusBadge, Table, TBody, Td, Th, THead, Tr } from '@/components/primitives';
import { BID_TENDER, BidActionBar, BidStepper, TenderContextBanner } from './BidWorkspaceChrome';
import { api, ApiError } from '@/lib/api';
import type { ApiBid, ApiBidDocument, ApiTender, ApiTenderRequirement } from '@/lib/types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function requirementTone(requirement: ApiTenderRequirement): 'danger' | 'warning' | 'neutral' {
  if (requirement.mandatory) return 'danger';
  if (requirement.conditional) return 'warning';
  return 'neutral';
}

function requirementLabel(requirement: ApiTenderRequirement): string {
  if (requirement.mandatory) return 'Mandatory';
  if (requirement.conditional) return 'Conditional';
  return 'Optional';
}

export function BidStep2Page() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const tenderRef = ref ? decodeURIComponent(ref) : BID_TENDER.ref;
  const rowFileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const supportingFileInput = useRef<HTMLInputElement>(null);

  const [tender, setTender] = useState<ApiTender | null>(null);
  const [bid, setBid] = useState<ApiBid | null>(null);
  const [requirements, setRequirements] = useState<ApiTenderRequirement[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function refresh() {
    const t = await api.get<ApiTender>(`/tenders/${encodeURIComponent(tenderRef)}`);
    const reqs = await api.get<ApiTenderRequirement[]>(`/tenders/${encodeURIComponent(tenderRef)}/requirements`).catch(() => []);
    const bids = await api.get<ApiBid[]>('/bids');
    const mine = bids.find((b) => (typeof b.tenderId === 'string' ? b.tenderId : b.tenderId._id) === t._id);
    if (!mine) throw new Error('No draft bid found for this tender.');
    const full = await api.get<ApiBid>(`/bids/${mine._id}`);
    setTender(t);
    setRequirements(reqs);
    setBid(full);
  }

  useEffect(() => {
    let cancelled = false;
    refresh().catch((err) => {
      if (cancelled) return;
      setLoadError(err instanceof ApiError ? err.message : err.message || 'Could not load this bid draft.');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderRef]);

  const readOnly = !bid || bid.status !== 'draft';
  const documents = (bid?.documents ?? []).filter((d): d is ApiBidDocument => typeof d !== 'string');

  // A requirement only shows up as a document row when it actually names
  // evidence types — a pure eligibility criterion with no evidenceTypes has
  // nothing to upload against and is out of scope for this checklist.
  const documentRequirements = requirements.filter((r) => r.evidenceTypes.length > 0);
  const mandatoryRequirements = documentRequirements.filter((r) => r.mandatory);

  function docFor(requirementId: string): ApiBidDocument | undefined {
    return documents.find((d) => d.requirementId === requirementId);
  }

  const uploadedMandatoryCount = mandatoryRequirements.filter((r) => docFor(r._id)).length;
  const canContinue = readOnly || uploadedMandatoryCount === mandatoryRequirements.length;
  const supportingDocuments = documents.filter((d) => !d.requirementId);

  async function uploadFile(file: File, requirementId: string | null, key: string) {
    if (!bid) return;
    setUploadError(null);
    setBusyKey(key);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('documentType', file.name);
      if (requirementId) form.append('requirementId', requirementId);
      await api.upload(`/documents/bids/${bid._id}`, form);
      await refresh();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setBusyKey(null);
    }
  }

  async function removeDocument(doc: ApiBidDocument, key: string) {
    setUploadError(null);
    setBusyKey(key);
    try {
      await api.delete(`/documents/${doc._id}`);
      await refresh();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Could not remove this document.');
    } finally {
      setBusyKey(null);
    }
  }

  async function replaceDocument(existing: ApiBidDocument, file: File, requirementId: string | null, key: string) {
    setUploadError(null);
    setBusyKey(key);
    try {
      await api.delete(`/documents/${existing._id}`);
      const form = new FormData();
      form.append('file', file);
      form.append('documentType', file.name);
      if (requirementId) form.append('requirementId', requirementId);
      await api.upload(`/documents/bids/${bid!._id}`, form);
      await refresh();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Could not replace this document.');
    } finally {
      setBusyKey(null);
    }
  }

  async function download(doc: ApiBidDocument) {
    try {
      const token = localStorage.getItem('gem_portal_token');
      const res = await fetch(`/api/documents/${doc._id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setUploadError('Could not download this document.');
    }
  }

  if (loadError) {
    return (
      <BidderPortalShell breadcrumb="Bid Submission">
        <Callout tone="danger" title="Could not open this bid">
          {loadError}
        </Callout>
      </BidderPortalShell>
    );
  }

  if (!tender || !bid) {
    return (
      <BidderPortalShell breadcrumb="Bid Submission">
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </BidderPortalShell>
    );
  }

  return (
    <BidderPortalShell breadcrumb="Bid Submission">
      <div className="flex flex-col gap-6 pb-28">
        <PageHeader
          breadcrumbs={[{ label: 'Tenders', to: '/tenders' }, { label: tenderRef, to: `/tenders/${encodeURIComponent(tenderRef)}` }, { label: 'Bid submission' }]}
          eyebrow={<StatusBadge tone="info">Step 2 of 3</StatusBadge>}
          title="Required Documents"
          description="Upload the documents required for this tender. Documents marked Mandatory must be uploaded before you can submit your bid."
        />

        <TenderContextBanner tenderRef={tenderRef} title={tender.title} authority={tender.department} draftId={bid.status === 'draft' ? 'Draft' : bid.bidReference ?? bid.status} deadline={new Date(tender.submissionDeadline).toLocaleString('en-IN')} daysRemaining={readOnly ? bid.status : 'Editable draft'} closed={readOnly} />
        <BidStepper current={2} />

        {readOnly && (
          <Callout tone="warning" title="This bid is no longer editable">
            The bid has status "{bid.status}" — documents cannot be added or removed.
          </Callout>
        )}
        {uploadError && (
          <Callout tone="danger" title="Upload problem">
            {uploadError}
          </Callout>
        )}

        <Callout tone="neutral" title={`${mandatoryRequirements.length} mandatory document${mandatoryRequirements.length === 1 ? '' : 's'} · ${uploadedMandatoryCount} uploaded`}>
          {uploadedMandatoryCount < mandatoryRequirements.length
            ? `${mandatoryRequirements.length - uploadedMandatoryCount} mandatory document${mandatoryRequirements.length - uploadedMandatoryCount === 1 ? '' : 's'} still required.`
            : 'All mandatory documents have been uploaded.'}
        </Callout>

        <Card padding="none" className="overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-headline-md text-on-surface">Tender document checklist</h2>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">PDF, JPG, PNG or Word. Max 25 MB per file.</p>
          </div>
          <div className="divide-y divide-outline-variant border-t border-outline-variant">
            {documentRequirements.length === 0 && <p className="px-6 py-8 text-center text-body-sm text-on-surface-variant">This tender has no document requirements published yet.</p>}
            {documentRequirements.map((requirement) => {
              const doc = docFor(requirement._id);
              const key = requirement._id;
              const busy = busyKey === key;
              return (
                <div key={key} className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-body-md font-semibold text-on-surface">{requirement.title}</h3>
                      <StatusBadge tone={requirementTone(requirement)}>{requirementLabel(requirement).toUpperCase()}</StatusBadge>
                    </div>
                    {requirement.description && <p className="mt-1 text-body-sm text-on-surface-variant">{requirement.description}</p>}
                    {doc && (
                      <p className="mt-2 flex items-center gap-1.5 text-body-sm text-success">
                        <Icon name="check_circle" size="sm" />
                        <span className="font-mono text-[12.5px] text-on-surface">{doc.originalFilename}</span>
                        <span className="text-on-surface-variant">· {formatSize(doc.size)}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      ref={(el) => {
                        rowFileInputs.current[key] = el;
                      }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (doc) void replaceDocument(doc, file, requirement._id, key);
                        else void uploadFile(file, requirement._id, key);
                        e.target.value = '';
                      }}
                    />
                    {!doc && !readOnly && (
                      <Button size="sm" leftIcon="upload_file" loading={busy} onClick={() => rowFileInputs.current[key]?.click()}>
                        Upload
                      </Button>
                    )}
                    {doc && (
                      <>
                        <Button variant="ghost" size="sm" leftIcon="download" onClick={() => download(doc)}>
                          Download
                        </Button>
                        {!readOnly && (
                          <>
                            <Button variant="secondary" size="sm" leftIcon="sync" loading={busy} onClick={() => rowFileInputs.current[key]?.click()}>
                              Replace
                            </Button>
                            <Button variant="ghost" size="sm" leftIcon="delete" loading={busy} onClick={() => void removeDocument(doc, key)}>
                              Remove
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-4">
            <div>
              <h2 className="text-headline-md text-on-surface">Additional Supporting Documents</h2>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">Optional — upload any additional documents relevant to your bid.</p>
            </div>
            <StatusBadge status="uploaded">{supportingDocuments.length} uploaded</StatusBadge>
          </div>
          <Table minWidth={600}>
            <THead>
              <tr>
                <Th className="pl-6">Document</Th>
                <Th>Size</Th>
                <Th align="right" className="pr-6">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {supportingDocuments.map((doc) => (
                <Tr key={doc._id}>
                  <Td className="pl-6 font-mono text-[12.5px]">{doc.originalFilename}</Td>
                  <Td className="text-[13px] text-on-surface-variant num">{formatSize(doc.size)}</Td>
                  <Td align="right" className="pr-6">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" leftIcon="download" onClick={() => download(doc)}>
                        Download
                      </Button>
                      {!readOnly && (
                        <Button variant="ghost" size="sm" leftIcon="delete" loading={busyKey === doc._id} onClick={() => void removeDocument(doc, doc._id)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
              {supportingDocuments.length === 0 && (
                <tr>
                  <Td colSpan={3} className="py-6 text-center text-body-sm text-on-surface-variant">
                    No supporting documents uploaded.
                  </Td>
                </tr>
              )}
            </TBody>
          </Table>
          {!readOnly && (
            <div className="border-t border-outline-variant bg-surface-container-low/60 p-4">
              <input
                ref={supportingFileInput}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file, null, 'supporting');
                  e.target.value = '';
                }}
              />
              <Button variant="secondary" size="sm" leftIcon="add" loading={busyKey === 'supporting'} onClick={() => supportingFileInput.current?.click()}>
                Add Supporting Document
              </Button>
            </div>
          )}
        </Card>

        <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-body-sm text-on-surface-variant">
            <div>
              Required documents · <span className="font-semibold text-on-surface">{mandatoryRequirements.length} mandatory</span>
            </div>
            <div>
              Uploaded ·{' '}
              <span className="font-semibold text-on-surface">
                {uploadedMandatoryCount} / {mandatoryRequirements.length}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <BidActionBar
        right={
          <>
            <Button variant="ghost" leftIcon="arrow_back" onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/1`)}>
              Back
            </Button>
            <Button size="lg" rightIcon="arrow_forward" disabled={!canContinue} onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/3`)}>
              Continue to review
            </Button>
          </>
        }
      />
    </BidderPortalShell>
  );
}
