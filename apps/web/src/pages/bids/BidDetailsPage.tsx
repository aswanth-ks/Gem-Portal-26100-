// Bid Details — ported from Stitch screen "CPCL Bidder Portal - Bid Details
// (BID-2026-00418)" (project 6921642772921774119, screen
// 802fc0c5e7dd4dd2861318803ee9c6f6), rebuilt on the shared design system.
//
// Real GET /api/bids/:bidId. A 403 (someone else's bid) or 404 renders the
// existing empty-state pattern instead of a blank page — this is the
// server-side sealed-bid boundary, not a UI hide. Fabricated content from the
// prototype (fake SHA-256 hashes, DSC signatory name, multi-stage committee
// timeline) is removed since none of it is real yet; only real fields
// (formData, documents, status, bidReference, timestamps) are rendered.
//
// Phase 5.4 — this is also the bidder's post-submission processing-status
// view (BidStep3Page redirects here right after a successful submit, and
// revisiting the same URL later shows exactly the same real backend state —
// there is no separate "just submitted" screen with its own copy of the
// truth). Document-intelligence status (idle/processing/completed/failed on
// each BidDocument, already computed by the existing Phase 5/5.2 pipeline) is
// polled from the real GET /api/bids/:id response — no new endpoint, no
// second processing mechanism, no fake timers. Only document-processing
// status is shown here; PASS/FAIL/compliance/risk belong to the officer
// workflow and are never fetched or rendered on this page.

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import { Button, Card, CardHeader, Callout, DescriptionList, EmptyState, Icon, PageHeader, StatusBadge, Table, TBody, Td, Th, THead, Tr, Tag } from '@/components/primitives';
import { cn } from '@/utils/cn';
import { api, ApiError } from '@/lib/api';
import type { ApiBid, ApiBidDocument, ApiTender } from '@/lib/types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ProcessingBucket = 'queued' | 'processing' | 'processed' | 'attention';

function bucketFor(doc: ApiBidDocument): ProcessingBucket {
  switch (doc.processingStatus) {
    case 'completed':
      return 'processed';
    case 'processing':
      return 'processing';
    case 'failed':
      return 'attention';
    default:
      return 'queued';
  }
}

const BUCKET_META: Record<ProcessingBucket, { label: string; sub: string; tone: 'success' | 'info' | 'warning' | 'neutral'; icon: string; spin?: boolean }> = {
  queued: { label: 'Queued', sub: 'Waiting for processing', tone: 'neutral', icon: 'radio_button_unchecked' },
  processing: { label: 'Processing', sub: 'AI document analysis in progress', tone: 'info', icon: 'sync', spin: true },
  processed: { label: 'Processed', sub: 'Evidence extracted', tone: 'success', icon: 'check_circle' },
  attention: { label: 'Requires attention', sub: 'Could not be processed automatically', tone: 'warning', icon: 'error' },
};

type TimelineState = 'done' | 'active' | 'pending';

function TimelineStep({ index, title, state }: { index: number; title: string; state: TimelineState }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold',
          state === 'done' && 'border-success bg-success text-white',
          state === 'active' && 'border-secondary bg-info-container text-secondary',
          state === 'pending' && 'border-outline-variant bg-surface-container-lowest text-on-surface-variant',
        )}
      >
        {state === 'done' ? <Icon name="check" size="xs" /> : state === 'active' ? <Icon name="progress_activity" size="xs" spin /> : index}
      </span>
      <span className={cn('text-body-sm', state === 'pending' ? 'text-on-surface-variant' : 'font-medium text-on-surface')}>{title}</span>
    </div>
  );
}

export function BidDetailsPage() {
  const { bidId } = useParams<{ bidId: string }>();
  const [bid, setBid] = useState<ApiBid | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!bidId) return;
    let cancelled = false;
    api
      .get<ApiBid>(`/bids/${bidId}`)
      .then((data) => {
        if (!cancelled) setBid(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this bid.');
      });
    return () => {
      cancelled = true;
    };
  }, [bidId]);

  // Phase 5.4 — poll the real bid record while document-intelligence
  // processing is still running. This is the same GET the page already loads
  // with, re-fetched every few seconds; there is no separate status API and
  // no client-side progress simulation. Stops once every submitted PDF has
  // either completed or failed, or the component unmounts. A transient
  // network failure never marks a document as failed — it just retries.
  useEffect(() => {
    if (!bid || bid.status !== 'submitted') return;
    let cancelled = false;

    function pdfDocsOf(b: ApiBid): ApiBidDocument[] {
      return b.documents.filter((d): d is ApiBidDocument => typeof d !== 'string' && d.mimeType === 'application/pdf');
    }
    // Phase 10C — also keep polling while the automatic evaluation is still
    // running, so "Compliance Processing" reaches a real terminal state
    // without a manual refresh.
    function pipelineStillRunning(b: ApiBid): boolean {
      const docsGoing = pdfDocsOf(b).some((d) => d.processingStatus === 'idle' || d.processingStatus === 'processing');
      const evalGoing = b.complianceEvaluationStatus === 'WAITING_FOR_DOCUMENTS' || b.complianceEvaluationStatus === 'PROCESSING';
      return docsGoing || evalGoing;
    }

    async function poll() {
      try {
        const fresh = await api.get<ApiBid>(`/bids/${bidId}`);
        if (cancelled) return;
        setBid(fresh);
        setPollError(null);
        if (pipelineStillRunning(fresh)) pollTimer.current = setTimeout(poll, 4000);
      } catch {
        if (cancelled) return;
        setPollError("Unable to refresh processing status. We'll try again.");
        pollTimer.current = setTimeout(poll, 4000);
      }
    }

    if (pipelineStillRunning(bid)) pollTimer.current = setTimeout(poll, 4000);

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bid?._id, bid?.status]);

  async function download(doc: ApiBidDocument) {
    const token = localStorage.getItem('gem_portal_token');
    const res = await fetch(`/api/documents/${doc._id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.originalFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loadError) {
    return (
      <BidderPortalShell breadcrumb="My Bids">
        <Card padding="lg">
          <EmptyState
            icon="lock"
            tone="danger"
            title="Could not open this bid"
            description={loadError}
            actions={
              <Button variant="secondary" to="/my-bids">
                Back to my bids
              </Button>
            }
          />
        </Card>
      </BidderPortalShell>
    );
  }

  if (!bid) {
    return (
      <BidderPortalShell breadcrumb="My Bids">
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </BidderPortalShell>
    );
  }

  const tender = typeof bid.tenderId === 'string' ? null : (bid.tenderId as ApiTender);
  const documents = bid.documents.filter((d): d is ApiBidDocument => typeof d !== 'string');
  const pdfDocs = documents.filter((d) => d.mimeType === 'application/pdf');
  const otherDocs = documents.filter((d) => d.mimeType !== 'application/pdf');

  const processedCount = pdfDocs.filter((d) => bucketFor(d) === 'processed').length;
  const attentionCount = pdfDocs.filter((d) => bucketFor(d) === 'attention').length;
  const inProgressCount = pdfDocs.length - processedCount - attentionCount;
  const isSubmitted = bid.status === 'submitted' || bid.status === 'closed';
  const settled = isSubmitted && inProgressCount === 0 && pdfDocs.length > 0;
  const allSucceeded = settled && attentionCount === 0;
  const hasAttention = settled && attentionCount > 0;

  // Real-backend-state timeline — every step is derived from actual data,
  // never a fixed sequence of fake stages.
  const step1: TimelineState = isSubmitted ? 'done' : 'pending';
  const step2: TimelineState = isSubmitted && documents.length > 0 ? 'done' : 'pending';
  const step3: TimelineState = !isSubmitted || pdfDocs.length === 0 ? 'pending' : inProgressCount > 0 ? 'active' : 'done';
  const step4: TimelineState = !isSubmitted || pdfDocs.length === 0 ? 'pending' : inProgressCount > 0 ? 'pending' : 'done';
  const step5: TimelineState = allSucceeded ? 'done' : 'pending';

  return (
    <BidderPortalShell breadcrumb="My Bids">
      <div className="flex flex-col gap-10">
        <PageHeader
          breadcrumbs={[{ label: 'My bids', to: '/my-bids' }, { label: tender?.tenderNumber ?? '' }, { label: 'Bid details' }]}
          eyebrow={
            <>
              {tender && <Tag mono>{tender.tenderNumber}</Tag>}
              <StatusBadge status={bid.status} />
              {bid.bidReference && <Tag mono>{bid.bidReference}</Tag>}
            </>
          }
          title={tender?.title ?? 'Bid'}
          meta={
            bid.submittedAt ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="verified_user" size="sm" className="text-success" />
                Submitted <span className="num">{new Date(bid.submittedAt).toLocaleString('en-IN')}</span>
              </span>
            ) : undefined
          }
          actions={
            <Button variant="secondary" leftIcon="arrow_back" to="/my-bids">
              My bids
            </Button>
          }
        />

        {bid.bidReference && (
          <Card padding="lg" className="flex flex-col gap-3">
            <CardHeader icon="receipt" title="Submission Received" actions={<StatusBadge status={bid.status} />} />
            <p className="text-body-sm text-on-surface-variant">Your bid has been successfully submitted.</p>
            <DescriptionList
              items={[
                { label: 'Bid reference', value: <span className="font-mono font-semibold">{bid.bidReference}</span> },
                { label: 'Submitted', value: bid.submittedAt ? new Date(bid.submittedAt).toLocaleString('en-IN') : '—' },
                { label: 'Bid status', value: <StatusBadge status={bid.status} /> },
              ]}
            />
          </Card>
        )}

        {isSubmitted && pdfDocs.length > 0 && (
          <Card padding="lg" className="flex flex-col gap-6">
            <CardHeader
              icon="fact_check"
              title="Document Processing"
              actions={allSucceeded ? <StatusBadge tone="success" icon="check_circle">Completed</StatusBadge> : hasAttention ? <StatusBadge tone="warning" icon="error">Needs attention</StatusBadge> : <StatusBadge status="processing">In progress</StatusBadge>}
            />
            <p className="-mt-3 text-body-sm text-on-surface-variant">Your submitted documents are being securely processed. AI is extracting document evidence for procurement evaluation.</p>

            {pollError && (
              <Callout tone="neutral" title="Refresh delayed">
                {pollError}
              </Callout>
            )}

            <div className="flex flex-col gap-3 rounded-card border border-outline-variant bg-surface-container-lowest p-5">
              <TimelineStep index={1} title="Bid Submitted" state={step1} />
              <TimelineStep index={2} title="Documents Received" state={step2} />
              <TimelineStep index={3} title="AI Document Processing" state={step3} />
              <TimelineStep index={4} title="Evidence Extraction" state={step4} />
              <TimelineStep index={5} title="Ready for Evaluation" state={step5} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-card border border-outline-variant p-4">
                <div className="text-headline-md num text-on-surface">{processedCount}</div>
                <div className="text-body-sm text-on-surface-variant">Processed</div>
              </div>
              <div className="rounded-card border border-outline-variant p-4">
                <div className="text-headline-md num text-on-surface">{inProgressCount}</div>
                <div className="text-body-sm text-on-surface-variant">Processing</div>
              </div>
              <div className="rounded-card border border-outline-variant p-4">
                <div className="text-headline-md num text-on-surface">{attentionCount}</div>
                <div className="text-body-sm text-on-surface-variant">Requires attention</div>
              </div>
            </div>

            <div className="divide-y divide-outline-variant border-t border-outline-variant">
              {pdfDocs.map((doc) => {
                const meta = BUCKET_META[bucketFor(doc)];
                return (
                  <div key={doc._id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[12.5px] text-on-surface">{doc.originalFilename}</p>
                      <p className="text-body-sm text-on-surface-variant">{meta.sub}</p>
                    </div>
                    <StatusBadge tone={meta.tone} icon={meta.icon} className="shrink-0">
                      {meta.label}
                    </StatusBadge>
                  </div>
                );
              })}
            </div>

            {allSucceeded && (
              <Callout tone="success" icon="check_circle" title="Document Processing Completed">
                <p>
                  {processedCount}/{pdfDocs.length} documents processed. Evidence extracted from submitted documents.
                </p>
                <p className="mt-1">Your bid has been successfully submitted and is now ready for procurement evaluation.</p>
              </Callout>
            )}

            {hasAttention && (
              <Callout tone="warning" icon="error" title="Processing Requires Attention">
                <p>
                  {processedCount} of {pdfDocs.length} documents processed. {attentionCount} document{attentionCount === 1 ? '' : 's'} could not be processed automatically.
                </p>
                <p className="mt-1">Your bid remains submitted. The document{attentionCount === 1 ? ' has' : 's have'} been recorded and {attentionCount === 1 ? 'is' : 'are'} available for procurement review.</p>
              </Callout>
            )}

            {/* Phase 10C — the bidder can see that compliance processing is
                happening, never the result. No PASS/FAIL/REVIEW, no officer
                assessment, no final decision appears here or anywhere else on
                this page — that boundary holds in both evaluation modes. */}
            <div className="rounded-card border border-outline-variant p-4">
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Compliance Processing</p>
              <p className="text-body-sm text-on-surface-variant">
                {bid.complianceEvaluationStatus === 'WAITING_FOR_DOCUMENTS' && 'Waiting for document processing to finish.'}
                {bid.complianceEvaluationStatus === 'PROCESSING' && 'Evaluating your submission against the tender requirements.'}
                {bid.complianceEvaluationStatus === 'COMPLETED' && 'Completed. Your bid is ready for procurement review.'}
                {bid.complianceEvaluationStatus === 'FAILED' && 'Automatic evaluation could not complete — your bid remains submitted and will be reviewed by the procurement officer.'}
                {(bid.complianceEvaluationStatus === 'NOT_STARTED' || !bid.complianceEvaluationStatus) && 'Not started yet.'}
              </p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card padding="lg" className="flex flex-col">
            <CardHeader icon="description" title="Tender summary" className="mb-2" />
            {tender ? (
              <DescriptionList
                items={[
                  { label: 'Tender reference', value: <span className="font-mono">{tender.tenderNumber}</span> },
                  { label: 'Department', value: tender.department },
                  { label: 'Estimated value', value: <span className="num">{tender.value}</span> },
                  { label: 'Submission deadline', value: new Date(tender.submissionDeadline).toLocaleString('en-IN') },
                  { label: 'Tender status', value: <StatusBadge status={tender.status === 'closed' ? 'closed' : 'open'} /> },
                ]}
              />
            ) : (
              <p className="text-body-sm text-on-surface-variant">Tender details unavailable.</p>
            )}
          </Card>
          <Card padding="lg" className="flex flex-col">
            <CardHeader icon="corporate_fare" title="Bidder details (as submitted)" actions={<StatusBadge tone="neutral" icon="lock">{bid.status === 'draft' ? 'Editable' : 'Locked'}</StatusBadge>} className="mb-2" />
            {Object.keys(bid.formData).length > 0 ? (
              <DescriptionList
                columns={2}
                items={Object.entries(bid.formData)
                  .filter(([, v]) => typeof v === 'string' && v)
                  .map(([k, v]) => ({ label: k, value: String(v) }))}
              />
            ) : (
              <p className="text-body-sm text-on-surface-variant">No bidder details entered.</p>
            )}
          </Card>
        </div>

        <Card padding="none" className="overflow-hidden">
          <div className="px-6 pt-6 sm:px-7">
            <CardHeader icon="folder_special" title="Documents" actions={<StatusBadge tone="info">{documents.length} attached</StatusBadge>} />
          </div>
          <Table minWidth={700}>
            <THead>
              <tr>
                <Th className="pl-6">Document</Th>
                <Th>Size</Th>
                <Th>Uploaded</Th>
                <Th align="right" className="pr-6">
                  <span className="sr-only">Action</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {documents.map((doc) => (
                <Tr key={doc._id}>
                  <Td className="pl-6 font-mono text-[12.5px]">{doc.originalFilename}</Td>
                  <Td className="text-[13px] text-on-surface-variant num">{formatSize(doc.size)}</Td>
                  <Td className="text-[13px] text-on-surface-variant">{new Date(doc.uploadedAt).toLocaleString('en-IN')}</Td>
                  <Td align="right" className="pr-6">
                    <Button variant="ghost" size="sm" leftIcon="download" onClick={() => download(doc)}>
                      Download
                    </Button>
                  </Td>
                </Tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <Td colSpan={4} className="py-8 text-center text-body-sm text-on-surface-variant">
                    No documents attached.
                  </Td>
                </tr>
              )}
            </TBody>
          </Table>
          {otherDocs.length > 0 && <p className="border-t border-outline-variant px-6 py-3 text-body-sm text-on-surface-variant">{otherDocs.length} of the documents above are not PDFs and are stored for manual review — automatic document-intelligence processing only applies to PDF documents.</p>}
        </Card>
      </div>
    </BidderPortalShell>
  );
}
