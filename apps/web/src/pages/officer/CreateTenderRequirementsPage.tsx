// Procurement Officer — Create Tender, Step 3: Bidder Requirements. Defines
// only WHAT bidders must submit (documents and information). Scoring and
// evaluation rules belong to Step 4 (Rules & compliance).
//
// Phase 2: real persistence via TenderRequirement (manual entry).
// Phase 3A: adds real AI-assisted extraction — POST .../documents/:id/analyze
// calls the actual apps/ai service (Gemini or local Ollama, per AI_PROVIDER), and
// returns PROPOSALS ONLY. Nothing is written to TenderRequirement until the
// officer clicks Accept/Accept All, which then goes through the exact same
// POST /tenders/:id/requirements used by manual entry — there is no separate
// "AI requirement" model (see the Phase 3A report's data-boundary section).

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import { Button, Callout, Card, CardHeader, DescriptionList, Drawer, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, StatusBadge, Stepper, Table, TBody, Td, Th, THead, Tag, Toast, Tr } from '@/components/primitives';
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, getDraftTenderId } from './createTender';
import { YesNo } from './CreateTenderInfoPage';
import { cn } from '@/utils/cn';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiAiExtractedRequirement, ApiAnalysisStatus, ApiTenderDocument, ApiTenderRequirement, RequirementCategory } from '@/lib/types';

const CATEGORIES: { id: RequirementCategory; label: string }[] = [
  { id: 'statutory', label: 'Statutory' },
  { id: 'financial', label: 'Financial' },
  { id: 'technical', label: 'Technical' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'experience', label: 'Experience' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'contractual', label: 'Contractual' },
  { id: 'tender_specific', label: 'Tender specific' },
  { id: 'other', label: 'Other' },
];
const categoryLabel = (c: RequirementCategory) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

interface FormState {
  code: string;
  title: string;
  category: RequirementCategory;
  mandatory: boolean;
  conditional: boolean;
  description: string;
  sourceDocument: string;
  sourcePage: string;
  sourceClause: string;
  evidenceTypes: string;
}
const BLANK: FormState = { code: '', title: '', category: 'eligibility', mandatory: true, conditional: false, description: '', sourceDocument: '', sourcePage: '', sourceClause: '', evidenceTypes: '' };

function toForm(r: ApiTenderRequirement): FormState {
  return { code: r.code, title: r.title, category: r.category, mandatory: r.mandatory, conditional: r.conditional, description: r.description, sourceDocument: r.sourceDocument, sourcePage: r.sourcePage ? String(r.sourcePage) : '', sourceClause: r.sourceClause, evidenceTypes: r.evidenceTypes.join(', ') };
}

function Requiredness({ r }: { r: Pick<ApiTenderRequirement, 'mandatory' | 'conditional'> }) {
  if (r.conditional) return <StatusBadge status="conditional" />;
  if (r.mandatory) return <StatusBadge status="mandatory" />;
  return <StatusBadge tone="neutral">Optional</StatusBadge>;
}

type DrawerState = { item: ApiTenderRequirement; mode: 'view' | 'edit' } | { item: null; mode: 'new' } | null;

export function CreateTenderRequirementsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoAnalyze = searchParams.get('ai') === '1';
  const tenderId = getDraftTenderId();

  const [reqs, setReqs] = useState<ApiTenderRequirement[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeReq, setRemoveReq] = useState<ApiTenderRequirement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Phase 3A — AI analysis state (all preview-only until accepted).
  const [docs, setDocs] = useState<ApiTenderDocument[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ApiAiExtractedRequirement[] | null>(null);
  const [acceptedCodes, setAcceptedCodes] = useState<Set<string>>(new Set());
  const [rejectedCodes, setRejectedCodes] = useState<Set<string>>(new Set());
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [sourceView, setSourceView] = useState<ApiAiExtractedRequirement | null>(null);
  const [editingProposal, setEditingProposal] = useState<ApiAiExtractedRequirement | null>(null);

  async function load() {
    if (!tenderId) return;
    try {
      const [reqData, docData] = await Promise.all([officerApi.get<ApiTenderRequirement[]>(`/tenders/${tenderId}/requirements`), officerApi.get<ApiTenderDocument[]>(`/tenders/${tenderId}/documents`)]);
      setReqs(reqData);
      setDocs(docData);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load requirements.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pdfDocs = (docs ?? []).filter((d) => /\.pdf$/i.test(d.originalFilename));
  const primaryDoc = pdfDocs[0] ?? null;

  // Reliability fix: the real analysis (gateway -> apps/ai -> Ollama) can take
  // several minutes on CPU (an 8m22s real run was measured), so the browser
  // must not block on it. POST returns 202 immediately; this polls the real
  // job status until it leaves 'processing'. No fake progress percentages —
  // only the real states the backend reports (processing/completed/failed).
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopPolling() {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function applyStatus(result: ApiAnalysisStatus) {
    if (result.status === 'completed') {
      setAnalyzing(false);
      setAnalyzeError(null);
      setProposals(result.requirements ?? []);
    } else if (result.status === 'failed') {
      setAnalyzing(false);
      setAnalyzeError(result.error ?? 'AI analysis failed. The tender document is still available and requirements can be entered manually.');
    } else if (result.status === 'processing') {
      setAnalyzing(true);
      stopPolling();
      pollTimer.current = setTimeout(() => void pollStatus(), 5000);
    } else {
      setAnalyzing(false);
    }
  }

  async function pollStatus() {
    if (!tenderId || !primaryDoc) return;
    try {
      const result = await officerApi.get<ApiAnalysisStatus>(`/tenders/${tenderId}/documents/${primaryDoc._id}/analyze`);
      applyStatus(result);
    } catch (err) {
      setAnalyzing(false);
      setAnalyzeError(err instanceof ApiError ? err.message : 'Could not check AI analysis status.');
    }
  }

  // On load (including a page refresh mid-analysis), resume from whatever
  // the backend actually knows — never restart a job that's already running,
  // and load a completed result instead of re-running Llama.
  useEffect(() => {
    if (!tenderId || !primaryDoc) return;
    pollStatus();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId, primaryDoc?._id]);

  // Coming from the Step 2 "AI-assisted setup" choice (?ai=1): trigger the
  // same real analysis this page's "Analyze tender with AI" button calls —
  // no separate AI implementation, just an auto-click once the document is
  // known. Guarded to fire once and to strip the flag so a refresh doesn't
  // re-trigger it.
  const autoAnalyzeFired = useRef(false);
  useEffect(() => {
    if (!autoAnalyze || autoAnalyzeFired.current || !primaryDoc) return;
    autoAnalyzeFired.current = true;
    setSearchParams({}, { replace: true });
    void analyzeWithAi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze, primaryDoc]);

  async function analyzeWithAi() {
    if (!tenderId || !primaryDoc) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setProposals(null);
    setAcceptedCodes(new Set());
    setRejectedCodes(new Set());
    stopPolling();
    try {
      const result = await officerApi.post<ApiAnalysisStatus>(`/tenders/${tenderId}/documents/${primaryDoc._id}/analyze`);
      applyStatus(result);
    } catch (err) {
      setAnalyzing(false);
      setAnalyzeError(err instanceof ApiError ? err.message : 'AI service unavailable. The tender document is still available and requirements can be entered manually.');
    }
  }

  async function acceptProposal(p: ApiAiExtractedRequirement): Promise<boolean> {
    if (!tenderId) return false;
    try {
      await officerApi.post<ApiTenderRequirement>(`/tenders/${tenderId}/requirements`, {
        code: p.code,
        title: p.title,
        description: p.description,
        category: p.category,
        mandatory: p.mandatory,
        conditional: p.conditional,
        evidenceTypes: p.evidenceTypes,
        sourceDocument: primaryDoc?.originalFilename ?? '',
        sourcePage: p.source.documentPage ?? undefined,
        sourceClause: p.source.clause ?? '',
        // The officer accepting an AI-extracted requirement IS the approval
        // step — persist that through the existing TenderRequirement.status
        // field (proposed|approved|rejected) rather than a new one. This is
        // what makes Step 4's "AI rule proposals" list (already gated on
        // status === 'approved') actually populate, and is what now lets
        // Step 4 automatically generate a rule proposal for it — see that
        // page's mount effect.
        status: 'approved',
      });
      setAcceptedCodes((prev) => new Set(prev).add(p.code));
      return true;
    } catch (err) {
      // A 409 here means this exact code was already accepted (e.g. the
      // officer clicked Accept twice, or re-ran Accept All) — the DB's own
      // unique {tenderId, code} index is what prevents the duplicate: treat
      // it as already-accepted rather than an error.
      if (err instanceof ApiError && err.status === 409) {
        setAcceptedCodes((prev) => new Set(prev).add(p.code));
        return true;
      }
      setAnalyzeError(err instanceof ApiError ? err.message : `Could not save ${p.code}.`);
      return false;
    }
  }

  async function acceptAll() {
    if (!proposals) return;
    setAcceptingAll(true);
    const pending = proposals.filter((p) => !acceptedCodes.has(p.code) && !rejectedCodes.has(p.code));
    for (const p of pending) {
      await acceptProposal(p);
    }
    setAcceptingAll(false);
    await load();
    setToast(`${pending.length} requirement${pending.length === 1 ? '' : 's'} accepted`);
  }

  function rejectProposal(p: ApiAiExtractedRequirement) {
    setRejectedCodes((prev) => new Set(prev).add(p.code));
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function openNew() {
    setForm(BLANK);
    setTouched(false);
    setFormError(null);
    setEditingProposal(null);
    setDrawer({ item: null, mode: 'new' });
  }
  function openEditProposal(p: ApiAiExtractedRequirement) {
    setForm({
      code: p.code,
      title: p.title,
      category: p.category,
      mandatory: p.mandatory,
      conditional: p.conditional,
      description: p.description,
      sourceDocument: primaryDoc?.originalFilename ?? '',
      sourcePage: p.source.documentPage ? String(p.source.documentPage) : '',
      sourceClause: p.source.clause ?? '',
      evidenceTypes: p.evidenceTypes.join(', '),
    });
    setTouched(false);
    setFormError(null);
    setEditingProposal(p);
    setDrawer({ item: null, mode: 'new' });
  }
  function startEdit(r: ApiTenderRequirement) {
    setForm(toForm(r));
    setTouched(false);
    setFormError(null);
    setEditingProposal(null);
    setDrawer({ item: r, mode: 'edit' });
  }

  const errors = touched ? { code: !form.code.trim() ? 'Code is required' : undefined, title: !form.title.trim() ? 'Requirement title is required' : undefined } : {};

  async function save() {
    setTouched(true);
    if (!form.code.trim() || !form.title.trim() || !tenderId) return;
    setSaving(true);
    setFormError(null);
    const payload = {
      code: form.code.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      mandatory: form.mandatory,
      conditional: form.conditional,
      evidenceTypes: form.evidenceTypes.split(',').map((s) => s.trim()).filter(Boolean),
      sourceDocument: form.sourceDocument.trim(),
      sourcePage: form.sourcePage ? Number(form.sourcePage) : undefined,
      sourceClause: form.sourceClause.trim(),
    };
    try {
      if (drawer?.mode === 'new') {
        // A requirement created here — whether typed manually or an AI
        // proposal the officer edited before saving — is officer-approved by
        // construction; there is no separate "approve" step for it.
        await officerApi.post(`/tenders/${tenderId}/requirements`, { ...payload, status: 'approved' });
        setToast(editingProposal ? `${payload.title} accepted (edited)` : `${payload.title} added`);
        if (editingProposal) setAcceptedCodes((prev) => new Set(prev).add(editingProposal.code));
      } else if (drawer?.mode === 'edit') {
        await officerApi.patch(`/requirements/${drawer.item._id}`, payload);
        setToast(`${payload.title} updated`);
      }
      setDrawer(null);
      setEditingProposal(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save this requirement.');
    } finally {
      setSaving(false);
    }
  }

  async function doRemove() {
    if (!removeReq) return;
    try {
      await officerApi.delete(`/requirements/${removeReq._id}`);
      setToast(`${removeReq.title} removed`);
      setRemoveReq(null);
      setDrawer(null);
      await load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not remove this requirement.');
      setRemoveReq(null);
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
        <Callout tone="danger" title="Could not load requirements">
          {loadError}
        </Callout>
      </OfficerPortalShell>
    );
  }
  if (!reqs) {
    return (
      <OfficerPortalShell breadcrumb="Create tender">
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </OfficerPortalShell>
    );
  }

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-6 pb-28">
        <PageHeader
          breadcrumbs={[{ label: 'Tenders', to: '/officer/tenders' }, { label: 'Create tender', to: CREATE_TENDER_ROUTES.info }, { label: 'Bidder requirements' }]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{tenderId.slice(-8)}</Tag>
            </>
          }
          title="Bidder requirements"
          description="Define the documents and information bidders must submit for this tender — manually, or AI-assisted from the uploaded tender document."
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={3} />
        </Card>

        {/* Phase 3A — AI Tender Understanding */}
        <Card padding="lg">
          <CardHeader icon="auto_awesome" title="AI tender understanding" description="AI proposes structured requirements from the tender document. You review and confirm every one — nothing is saved automatically." />

          {!primaryDoc ? (
            <Callout tone="warning" title="No tender PDF uploaded yet">
              Upload a PDF in Step 2 (Tender documents) before running AI analysis.
            </Callout>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-outline-variant bg-surface-container-low p-4">
                <div className="flex items-center gap-3">
                  <Icon name="picture_as_pdf" size="lg" className="text-secondary" />
                  <div>
                    <div className="text-[14px] font-semibold text-on-surface">{primaryDoc.originalFilename}</div>
                    <div className="text-[12px] text-on-surface-variant">Tender document · {proposals ? `AI identified ${proposals.length} requirement${proposals.length === 1 ? '' : 's'}` : 'Not analyzed'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {proposals && proposals.some((p) => !acceptedCodes.has(p.code) && !rejectedCodes.has(p.code)) && (
                    <Button size="sm" variant="secondary" leftIcon="done_all" loading={acceptingAll} onClick={acceptAll}>
                      Accept all
                    </Button>
                  )}
                  <Button size="sm" leftIcon="auto_awesome" loading={analyzing} onClick={analyzeWithAi}>
                    {proposals ? 'Re-analyze with AI' : 'Analyze tender with AI'}
                  </Button>
                </div>
              </div>

              {analyzing && (
                <div className="flex items-center gap-3 rounded-card border border-outline-variant bg-surface-container-lowest p-4 text-body-sm text-on-surface-variant">
                  <Icon name="progress_activity" className="animate-spin" size="md" />
                  <div>
                    <div className="font-semibold text-on-surface">AI analysis in progress</div>
                    <div>Your tender document is being analyzed. This may take a few minutes.</div>
                  </div>
                </div>
              )}

              {analyzeError && (
                <Callout tone="danger" icon="error" title="AI analysis unavailable">
                  {analyzeError} Manual entry below still works.
                </Callout>
              )}

              {proposals && proposals.length === 0 && !analyzeError && (
                <Callout tone="neutral" title="No requirements identified">
                  The AI did not find any explicit bidder requirements in this document. Add them manually below.
                </Callout>
              )}

              {proposals && proposals.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {proposals.map((p) => {
                    const accepted = acceptedCodes.has(p.code);
                    const rejected = rejectedCodes.has(p.code);
                    return (
                      <li key={p.code} className={cn('rounded-card border p-4', accepted ? 'border-success-border bg-success-container/30' : rejected ? 'border-outline-variant bg-surface-container-low opacity-60' : 'border-outline-variant')}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[12.5px] text-on-surface-variant">{p.code}</span>
                              <span className="text-[15px] font-semibold text-on-surface">{p.title}</span>
                              <Tag>{categoryLabel(p.category)}</Tag>
                              {p.conditional ? <StatusBadge status="conditional" /> : p.mandatory ? <StatusBadge status="mandatory" /> : <StatusBadge tone="neutral">Optional</StatusBadge>}
                            </div>
                            <p className="mt-1 text-body-sm text-on-surface-variant">{p.description}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-on-surface-variant">
                              <span className="inline-flex items-center gap-1">
                                <Icon name="description" size="xs" />
                                {primaryDoc.originalFilename} · {p.source.documentPage ? `Page ${p.source.documentPage}` : 'Page not specified'} · {p.source.clause ? `Clause ${p.source.clause}` : 'No clause given'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Icon name="analytics" size="xs" />
                                Confidence {Math.round(p.confidence * 100)}%
                              </span>
                              <button type="button" className="focus-ring rounded text-secondary underline underline-offset-2" onClick={() => setSourceView(p)}>
                                View source
                              </button>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {accepted ? (
                              <StatusBadge tone="success" icon="check_circle">
                                Accepted
                              </StatusBadge>
                            ) : rejected ? (
                              <StatusBadge tone="neutral">Removed</StatusBadge>
                            ) : (
                              <>
                                <Button size="sm" leftIcon="check" onClick={() => acceptProposal(p)}>
                                  Accept
                                </Button>
                                <Button size="sm" variant="secondary" leftIcon="edit" onClick={() => openEditProposal(p)}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="ghost" leftIcon="close" className="text-danger" onClick={() => rejectProposal(p)}>
                                  Remove
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-headline-sm font-semibold text-on-surface">What bidders must submit</h2>
              <span className="text-body-sm text-on-surface-variant">{reqs.length} requirement{reqs.length === 1 ? '' : 's'}</span>
            </div>
            <Button size="sm" leftIcon="add" onClick={openNew}>
              Add requirement
            </Button>
          </div>

          {reqs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="playlist_add"
                title="No requirements yet"
                description="Add the documents and information bidders must submit, such as PAN, GST, financial statements or experience certificates."
                actions={
                  <Button leftIcon="add" onClick={openNew}>
                    Add first requirement
                  </Button>
                }
              />
            </div>
          ) : (
            <Table minWidth={820}>
              <THead>
                <tr>
                  <Th>Code</Th>
                  <Th>Requirement</Th>
                  <Th>Category</Th>
                  <Th>Mandatory</Th>
                  <Th align="right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {reqs.map((r) => (
                  <Tr key={r._id} className="cursor-pointer" onClick={() => setDrawer({ item: r, mode: 'view' })}>
                    <Td className="font-mono text-[12.5px]">{r.code}</Td>
                    <Td className="font-semibold text-on-surface">{r.title}</Td>
                    <Td>
                      <Tag>{categoryLabel(r.category)}</Tag>
                    </Td>
                    <Td>
                      <Requiredness r={r} />
                    </Td>
                    <Td align="right">
                      <Icon name="chevron_right" size="md" className="text-outline" />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Icon name="info" size="sm" className="text-outline" />
          This step sets what bidders must submit. How each item is evaluated is set in Step 4 — Rules & compliance.
        </p>
      </div>

      <BidActionBar
        left={
          <Button variant="secondary" leftIcon="arrow_back" to={CREATE_TENDER_ROUTES.documents}>
            Back to tender documents
          </Button>
        }
        center={
          <Button variant="ghost" leftIcon="save" onClick={() => navigate('/officer/tenders')}>
            Save draft & exit
          </Button>
        }
        right={
          <Button rightIcon="arrow_forward" disabled={reqs.length === 0} onClick={() => navigate(CREATE_TENDER_ROUTES.rules)}>
            Continue to rules & compliance
          </Button>
        }
      />

      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        icon={drawer?.mode === 'view' ? 'fact_check' : drawer?.mode === 'new' ? 'playlist_add' : 'edit'}
        title={drawer?.mode === 'view' ? 'Review requirement' : drawer?.mode === 'edit' ? 'Edit requirement' : 'Add requirement'}
        description={drawer && drawer.mode !== 'new' ? drawer.item.title : undefined}
        footer={
          drawer?.mode === 'view' ? (
            <div className="flex w-full items-center justify-between gap-2.5">
              <Button variant="ghost" leftIcon="delete" className="text-danger" onClick={() => setRemoveReq(drawer.item)}>
                Remove
              </Button>
              <Button variant="secondary" leftIcon="edit" onClick={() => startEdit(drawer.item)}>
                Edit
              </Button>
            </div>
          ) : drawer ? (
            <>
              <Button variant="secondary" onClick={() => setDrawer(null)}>
                Cancel
              </Button>
              <Button leftIcon="check" loading={saving} onClick={save}>
                {drawer.mode === 'new' ? 'Add requirement' : 'Save'}
              </Button>
            </>
          ) : undefined
        }
      >
        {drawer?.mode === 'view' ? (
          <DescriptionList
            items={[
              { label: 'Code', value: <span className="font-mono">{drawer.item.code}</span> },
              { label: 'Requirement', value: drawer.item.title },
              { label: 'Category', value: categoryLabel(drawer.item.category) },
              { label: 'Mandatory / conditional', value: drawer.item.conditional ? 'Conditional' : drawer.item.mandatory ? 'Mandatory' : 'Optional' },
              { label: 'Description', value: drawer.item.description || '—' },
              { label: 'Evidence types', value: drawer.item.evidenceTypes.join(', ') || '—' },
              { label: 'Source document', value: drawer.item.sourceDocument || '—' },
              { label: 'Source page / clause', value: [drawer.item.sourcePage ? `Pg. ${drawer.item.sourcePage}` : null, drawer.item.sourceClause || null].filter(Boolean).join(' · ') || '—' },
            ]}
          />
        ) : drawer ? (
          <div className="flex flex-col gap-5">
            {formError && (
              <Callout tone="danger" title="Could not save">
                {formError}
              </Callout>
            )}
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <Field label="Code" htmlFor="rq-code" required error={errors.code}>
                <Input id="rq-code" value={form.code} state={errors.code ? 'error' : 'default'} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="REQ-001" className="font-mono" />
              </Field>
              <Field label="Requirement title" htmlFor="rq-title" required error={errors.title}>
                <Input id="rq-title" value={form.title} state={errors.title ? 'error' : 'default'} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Average Annual Turnover" />
              </Field>
            </div>
            <Field label="Category" htmlFor="rq-cat">
              <Select id="rq-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RequirementCategory })}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="divide-y divide-outline-variant rounded-card border border-outline-variant">
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="text-[14px] font-semibold text-on-surface">Mandatory</div>
                <YesNo label="Mandatory" value={form.mandatory} onChange={(v) => setForm({ ...form, mandatory: v, conditional: v ? false : form.conditional })} />
              </div>
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="text-[14px] font-semibold text-on-surface">Conditional</div>
                <YesNo label="Conditional" value={form.conditional} onChange={(v) => setForm({ ...form, conditional: v, mandatory: v ? false : form.mandatory })} />
              </div>
            </div>
            <Field label="Description" htmlFor="rq-desc">
              <textarea
                id="rq-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-control border border-outline-variant bg-surface-container-lowest px-3.5 py-3 text-[14px] text-on-surface outline-none transition-all placeholder:text-outline hover:border-outline/60 focus:border-secondary focus:shadow-focus"
              />
            </Field>
            <Field label="Evidence types" htmlFor="rq-evidence" helper="Comma-separated">
              <Input id="rq-evidence" value={form.evidenceTypes} onChange={(e) => setForm({ ...form, evidenceTypes: e.target.value })} placeholder="CA Certificate, ITR" />
            </Field>
            <div className="grid grid-cols-[minmax(0,1fr)_100px_100px] gap-4">
              <Field label="Source document" htmlFor="rq-src">
                <Input id="rq-src" value={form.sourceDocument} onChange={(e) => setForm({ ...form, sourceDocument: e.target.value })} placeholder="Tender_041.pdf" />
              </Field>
              <Field label="Page" htmlFor="rq-page">
                <Input id="rq-page" value={form.sourcePage} onChange={(e) => setForm({ ...form, sourcePage: e.target.value.replace(/\D/g, '') })} placeholder="7" />
              </Field>
              <Field label="Clause" htmlFor="rq-clause">
                <Input id="rq-clause" value={form.sourceClause} onChange={(e) => setForm({ ...form, sourceClause: e.target.value })} placeholder="4.2" />
              </Field>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={!!removeReq}
        onClose={() => setRemoveReq(null)}
        icon="warning"
        size="md"
        title="Remove requirement?"
        description={removeReq?.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveReq(null)}>
              Keep
            </Button>
            <Button variant="danger" onClick={doRemove}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">Bidders will no longer be asked to submit this. Any compliance rules referencing it must be removed first.</p>
      </Modal>

      <Modal open={!!sourceView} onClose={() => setSourceView(null)} icon="description" title="Source" description={sourceView ? `${primaryDoc?.originalFilename ?? 'Tender document'} · ${sourceView.source.documentPage ? `Page ${sourceView.source.documentPage}` : 'Page not specified'}${sourceView.source.clause ? ` · Clause ${sourceView.source.clause}` : ''}` : undefined} footer={<Button onClick={() => setSourceView(null)}>Close</Button>}>
        {sourceView && (
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-outline-variant bg-surface-container-low p-4 text-body-sm text-on-surface-variant whitespace-pre-wrap">{sourceView.source.excerpt || 'No excerpt was provided by the AI for this requirement.'}</div>
            <p className="text-[12px] text-on-surface-variant">AI confidence: {Math.round(sourceView.confidence * 100)}%. This is the exact text the requirement was extracted from — verify it before accepting.</p>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast} />}
    </OfficerPortalShell>
  );
}
