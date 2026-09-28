// Bid Submission Workspace — Step 3: Review & confirm. Ported from Stitch
// screen "Bid Submission Workspace (Step 03: Review & Confirm)" (project
// 6921642772921774119, screen 7476c41c6e4a42d19be361cc8aa22aa5).
//
// Real submit: POST /api/bids/:id/submit. The declarations checklist below is
// still cosmetic (client-side only, not stored or enforced server-side) — the
// gateway's own validation on submit checks formData non-empty and at least
// one document, which is what actually gates submission.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import {
  Button,
  Callout,
  Card,
  CardHeader,
  CellStack,
  Checkbox,
  DescriptionList,
  EmptyState,
  Icon,
  Modal,
  PageHeader,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tag,
} from '@/components/primitives';
import { cn } from '@/utils/cn';
import { BID_TENDER, BidActionBar, BidStepper, TenderContextBanner } from './BidWorkspaceChrome';
import { api, ApiError } from '@/lib/api';
import type { ApiBid, ApiBidDocument, ApiTender } from '@/lib/types';

type ScreenState = 'loading' | 'error-load' | 'default' | 'modal' | 'submitting' | 'submit-error' | 'closed' | 'already-submitted';

const DECLARATIONS = [
  { id: 'decl-1', text: 'The information provided in this bid is accurate, authentic and complete to the best of my knowledge.' },
  { id: 'decl-2', text: 'All uploaded documents belong to the bidder and satisfy tender specifications without misrepresentation.' },
  { id: 'decl-3', text: 'I have reviewed and agree to the tender’s conditions.' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BidStep3Page() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const tenderRef = ref ? decodeURIComponent(ref) : BID_TENDER.ref;

  const [tender, setTender] = useState<ApiTender | null>(null);
  const [bid, setBid] = useState<ApiBid | null>(null);
  const [screen, setScreen] = useState<ScreenState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [declarations, setDeclarations] = useState<Record<string, boolean>>({ 'decl-1': false, 'decl-2': false, 'decl-3': false });

  const declaredCount = Object.values(declarations).filter(Boolean).length;
  const allDeclared = declaredCount === 3;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await api.get<ApiTender>(`/tenders/${encodeURIComponent(tenderRef)}`);
        const bids = await api.get<ApiBid[]>('/bids');
        const mine = bids.find((b) => (typeof b.tenderId === 'string' ? b.tenderId : b.tenderId._id) === t._id);
        if (!mine) throw new ApiError(404, 'No draft bid found for this tender.');
        const full = await api.get<ApiBid>(`/bids/${mine._id}`);
        if (cancelled) return;
        setTender(t);
        setBid(full);
        const closed = t.status === 'closed' || new Date(t.submissionDeadline).getTime() <= Date.now();
        if (full.status === 'submitted' || full.status === 'closed') setScreen('already-submitted');
        else if (closed) setScreen('closed');
        else setScreen('default');
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this bid.');
        setScreen('error-load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenderRef]);

  function openConfirmationModal() {
    if (!allDeclared) {
      window.alert('Please affirm all three declarations before submitting.');
      return;
    }
    setScreen('modal');
  }

  async function doSubmit() {
    if (!bid) return;
    setScreen('submitting');
    setSubmitError(null);
    try {
      const submitted = await api.post<ApiBid>(`/bids/${bid._id}/submit`);
      // Phase 5.4 — the bidder lands directly on the real submission-status /
      // document-processing view (BidDetailsPage), not a local mock "success"
      // screen. That page polls the same real backend state whether the
      // bidder just submitted or is revisiting later.
      navigate(`/my-bids/${submitted._id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Submission failed.');
      setScreen('submit-error');
    }
  }

  const documents = (bid?.documents ?? []).filter((d): d is ApiBidDocument => typeof d !== 'string');
  const showWorkspace = screen === 'default' || screen === 'modal' || screen === 'submitting';

  if (screen === 'loading') {
    return (
      <BidderPortalShell breadcrumb="Bid Submission">
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </BidderPortalShell>
    );
  }

  if (screen === 'error-load') {
    return (
      <BidderPortalShell breadcrumb="Bid Submission">
        <Callout tone="danger" title="Could not open this bid">
          {loadError}
        </Callout>
      </BidderPortalShell>
    );
  }

  return (
    <BidderPortalShell breadcrumb="Bid Submission">
      <div className={cn('flex flex-col gap-8', showWorkspace && 'pb-28')}>
        {showWorkspace && tender && bid && (
          <>
            <PageHeader
              breadcrumbs={[{ label: 'Tenders', to: '/tenders' }, { label: tenderRef, to: `/tenders/${encodeURIComponent(tenderRef)}` }, { label: 'Bid submission' }]}
              eyebrow={<StatusBadge tone="info">Step 3 of 3 · final</StatusBadge>}
              title="Review & confirm"
              description="Check your details and documents, affirm the declarations, then submit."
            />

            <TenderContextBanner tenderRef={tenderRef} title={tender.title} authority={tender.department} draftId="Draft" deadline={new Date(tender.submissionDeadline).toLocaleString('en-IN')} daysRemaining="Editable draft" />

            <BidStepper current={3} />

            <Callout tone="warning" title="This action is irreversible">
              Once submitted, the bid cannot be edited. The gateway rejects any further edits or resubmissions after this point.
            </Callout>

            <Card padding="lg">
              <CardHeader
                icon="corporate_fare"
                title="1 · Bidder details"
                actions={
                  <Button variant="secondary" size="sm" leftIcon="edit" onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/1`)}>
                    Edit
                  </Button>
                }
              />
              <DescriptionList
                columns={3}
                items={Object.entries(bid.formData)
                  .filter(([, v]) => typeof v === 'string' && v)
                  .map(([k, v]) => ({ label: k, value: String(v) }))}
              />
              {Object.keys(bid.formData).length === 0 && <p className="text-body-sm text-on-surface-variant">No bidder details entered yet.</p>}
            </Card>

            <Card padding="none" className="overflow-hidden">
              <div className="px-6 pt-6 sm:px-7">
                <CardHeader
                  icon="folder_managed"
                  title="2 · Uploaded documents"
                  actions={
                    <>
                      <StatusBadge status="uploaded">{documents.length} staged</StatusBadge>
                      <Button variant="secondary" size="sm" leftIcon="visibility" onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/2`)}>
                        Review
                      </Button>
                    </>
                  }
                />
              </div>
              <Table minWidth={600}>
                <THead>
                  <tr>
                    <Th className="pl-6">Document</Th>
                    <Th align="right" className="pr-6">
                      Size
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {documents.map((doc) => (
                    <Tr key={doc._id}>
                      <Td className="pl-6 font-mono text-[12.5px]">{doc.originalFilename}</Td>
                      <Td align="right" className="pr-6 text-[13px] text-on-surface-variant num">
                        {formatSize(doc.size)}
                      </Td>
                    </Tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <Td colSpan={2} className="py-6 text-center text-body-sm text-on-surface-variant">
                        No documents uploaded.
                      </Td>
                    </tr>
                  )}
                </TBody>
              </Table>
            </Card>

            <Card padding="lg">
              <CardHeader icon="assignment_turned_in" title="3 · Declarations" actions={<StatusBadge tone={allDeclared ? 'success' : 'danger'}>{declaredCount} of 3 affirmed</StatusBadge>} />
              <div className="flex flex-col gap-3">
                {DECLARATIONS.map((decl) => (
                  <Checkbox key={decl.id} checked={declarations[decl.id]} onChange={(e) => setDeclarations((prev) => ({ ...prev, [decl.id]: e.target.checked }))} label={decl.text} />
                ))}
              </div>
            </Card>
          </>
        )}

        {screen === 'submit-error' && (
          <Card>
            <EmptyState
              tone="danger"
              icon="error"
              title="Submission couldn't be completed"
              description={submitError ?? 'The server rejected this submission.'}
              actions={
                <Button variant="secondary" onClick={() => setScreen('default')}>
                  Return to review
                </Button>
              }
            />
          </Card>
        )}

        {screen === 'closed' && (
          <Card>
            <EmptyState
              icon="timer_off"
              title="Submission window closed"
              description={`The deadline for ${tenderRef} has passed. No further bids or revisions can be accepted.`}
              actions={
                <Button variant="secondary" leftIcon="space_dashboard" onClick={() => navigate('/dashboard')}>
                  Back to dashboard
                </Button>
              }
            />
          </Card>
        )}

        {screen === 'already-submitted' && bid && (
          <Card padding="none" className="overflow-hidden">
            <div className="h-1 bg-success" aria-hidden="true" />
            <EmptyState
              tone="success"
              icon="verified"
              title="This bid has already been submitted"
              description={bid.bidReference ? `Reference ${bid.bidReference}` : undefined}
              actions={
                <Button variant="secondary" leftIcon="visibility" onClick={() => navigate(`/my-bids/${bid._id}`)}>
                  View submission details
                </Button>
              }
            />
          </Card>
        )}

      </div>

      {showWorkspace && (
        <BidActionBar
          left={
            <Button variant="ghost" leftIcon="arrow_back" onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/2`)}>
              Back to documents
            </Button>
          }
          right={
            <Button size="lg" leftIcon="lock" disabled={!allDeclared} onClick={openConfirmationModal}>
              Submit bid
            </Button>
          }
        />
      )}

      <Modal
        open={screen === 'modal'}
        onClose={() => setScreen('default')}
        icon="lock"
        title="Confirm final bid submission"
        description={<span className="font-mono">Tender {tenderRef}</span>}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScreen('default')}>
              Cancel
            </Button>
            <Button leftIcon="lock" onClick={doSubmit}>
              Confirm & submit
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-body-md text-on-surface">
            You're about to submit your bid for <strong>{tender?.title}</strong>. This cannot be undone.
          </p>
          <Callout tone="danger" icon="warning" title="This action is irreversible">
            The bid will be locked and recorded as submitted server-side.
          </Callout>
        </div>
      </Modal>

      {screen === 'submitting' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-900/60 p-6 backdrop-blur-sm animate-fade-in" role="alertdialog" aria-modal="true" aria-label="Submitting bid">
          <div className="w-full max-w-md rounded-panel bg-surface-container-lowest p-8 text-center shadow-overlay animate-scale-in">
            <div className="relative mx-auto mb-6 h-16 w-16">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-surface-container border-t-secondary" />
              <Icon name="vpn_key" size="xl" className="absolute inset-0 m-auto h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-headline-md text-on-surface">Submitting your bid…</h3>
            <p className="mt-1.5 text-body-sm text-on-surface-variant">Don't refresh or leave while this completes.</p>
          </div>
        </div>
      )}
    </BidderPortalShell>
  );
}
