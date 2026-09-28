// Procurement Officer — real bid assessment workspace (opened by "View bid").
//
// Phase 7 turns this into the real investigation workspace: a LEFT list of
// the tender's real requirements (each showing its real deterministic
// PASS/FAIL/REVIEW result, or an honest "Rule not configured"/"Evaluation
// not run" state) and a RIGHT panel with the selected requirement's full
// traceability chain — requirement → rule → ComplianceEvaluation → evidence
// → document/page/source text — plus a place for the officer to record their
// own human judgment (OfficerAssessment), completely separate from the
// machine result. The officer never edits PASS/FAIL/REVIEW itself.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Callout, Card, CardHeader, DescriptionList, Icon, PageHeader, Select, StatusBadge, Table, TBody, Td, Th, THead, Tr, Tag } from '@/components/primitives';
import { cn } from '@/utils/cn';
import { TranslateAssist } from '@/components/TranslateAssist';
import { officerApi, ApiError, getOfficerToken, handleOfficerAuthFailure } from '@/lib/api';
import type { ApiAuditEvent, ApiBidDocument, ApiComplianceEvaluation, ApiComplianceRule, ApiDocumentEvidence, ApiFinalBidDecision, ApiOfficerAssessment, ApiOfficerBidDetail, ApiTenderRequirement, FinalDecisionValue, OfficerAssessmentValue } from '@/lib/types';

const RESULT_META: Record<'PASS' | 'FAIL' | 'REVIEW', { tone: 'success' | 'danger' | 'warning'; icon: string }> = {
  PASS: { tone: 'success', icon: 'check_circle' },
  FAIL: { tone: 'danger', icon: 'cancel' },
  REVIEW: { tone: 'warning', icon: 'error' },
};

const PROCESSING_META: Record<NonNullable<ApiBidDocument['processingStatus']>, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' }> = {
  idle: { label: 'Not processed', tone: 'neutral' },
  processing: { label: 'Processing', tone: 'info' },
  completed: { label: 'Evidence extracted', tone: 'success' },
  failed: { label: 'Processing failed', tone: 'warning' },
};

const ASSESSMENT_META: Record<OfficerAssessmentValue, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  NEEDS_REVIEW: { label: 'Needs review', tone: 'warning' },
  NOT_ACCEPTED: { label: 'Not accepted', tone: 'danger' },
};

const DECISION_META: Record<FinalDecisionValue, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  REVIEW: { label: 'Review', tone: 'warning' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

function actionLabel(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

type FilterTab = 'all' | 'PASS' | 'FAIL' | 'REVIEW' | 'unassessed';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BidResultPage() {
  const { bidId } = useParams<{ bidId: string }>();
  const [bid, setBid] = useState<ApiOfficerBidDetail | null>(null);
  const [requirements, setRequirements] = useState<ApiTenderRequirement[]>([]);
  const [rules, setRules] = useState<ApiComplianceRule[]>([]);
  const [assessments, setAssessments] = useState<ApiOfficerAssessment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sealedMessage, setSealedMessage] = useState<string | null>(null);

  const [evaluation, setEvaluation] = useState<ApiComplianceEvaluation | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const [evidence, setEvidence] = useState<Record<string, ApiDocumentEvidence>>({});
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');

  const [draftAssessment, setDraftAssessment] = useState<OfficerAssessmentValue>('NEEDS_REVIEW');
  const [draftComment, setDraftComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [decision, setDecision] = useState<ApiFinalBidDecision | null>(null);
  const [decisionChoice, setDecisionChoice] = useState<FinalDecisionValue | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const [showAudit, setShowAudit] = useState(false);
  const [auditEvents, setAuditEvents] = useState<ApiAuditEvent[] | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  async function loadDecision() {
    if (!bidId) return;
    try {
      const d = await officerApi.get<ApiFinalBidDecision | null>(`/bids/${bidId}/decision`);
      setDecision(d);
      if (d) {
        setDecisionChoice(d.decision);
        setDecisionComment(d.comment);
        setDecisionReason(d.reason);
      }
    } catch {
      // sealed/not-found is already surfaced by the main bid load
    }
  }

  async function saveDecision() {
    if (!bidId || !decisionChoice) return;
    setSavingDecision(true);
    setDecisionError(null);
    try {
      const saved = await officerApi.post<ApiFinalBidDecision>(`/bids/${bidId}/decision`, { decision: decisionChoice, comment: decisionComment, reason: decisionReason });
      setDecision(saved);
    } catch (err) {
      setDecisionError(err instanceof ApiError ? err.message : 'Could not save the final decision.');
    } finally {
      setSavingDecision(false);
    }
  }

  async function toggleAudit() {
    const next = !showAudit;
    setShowAudit(next);
    if (next && !auditEvents) {
      try {
        const events = await officerApi.get<ApiAuditEvent[]>(`/bids/${bidId}/audit`);
        setAuditEvents(events);
      } catch (err) {
        setAuditError(err instanceof ApiError ? err.message : 'Could not load the audit trail.');
      }
    }
  }

  async function loadAll() {
    if (!bidId) return;
    try {
      const b = await officerApi.get<ApiOfficerBidDetail>(`/bids/${bidId}`);
      setBid(b);
      setSealedMessage(null);
      const [reqs, ruleList, assessmentList] = await Promise.all([
        officerApi.get<ApiTenderRequirement[]>(`/tenders/${b.tenderId}/requirements`).catch(() => []),
        officerApi.get<ApiComplianceRule[]>(`/tenders/${b.tenderId}/rules`).catch(() => []),
        officerApi.get<ApiOfficerAssessment[]>(`/bids/${bidId}/assessment`).catch(() => []),
      ]);
      setRequirements(reqs);
      setRules(ruleList);
      setAssessments(assessmentList);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSealedMessage(err.message);
      } else {
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this bid.');
      }
    }
  }

  async function loadEvaluation() {
    if (!bidId) return;
    try {
      const ev = await officerApi.get<ApiComplianceEvaluation>(`/bids/${bidId}/evaluate`);
      setEvaluation(ev);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 403)) {
        setEvalError(err instanceof ApiError ? err.message : 'Could not load compliance evaluation.');
      }
    }
  }

  async function runEvaluation() {
    if (!bidId) return;
    setEvaluating(true);
    setEvalError(null);
    try {
      const ev = await officerApi.post<ApiComplianceEvaluation>(`/bids/${bidId}/evaluate`);
      setEvaluation({ ...ev, evaluated: true });
    } catch (err) {
      setEvalError(err instanceof ApiError ? err.message : 'Compliance evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  }

  useEffect(() => {
    void loadAll();
    void loadEvaluation();
    void loadDecision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidId]);

  async function loadEvidenceFor(docId: string) {
    if (evidence[docId]) return;
    try {
      const ev = await officerApi.get<ApiDocumentEvidence>(`/bid-documents/${docId}/evidence`);
      setEvidence((prev) => ({ ...prev, [docId]: ev }));
    } catch (err) {
      setEvidence((prev) => ({ ...prev, [docId]: { status: 'failed', error: err instanceof ApiError ? err.message : 'Could not load evidence.', linkStatus: 'unmatched', fields: [] } }));
    }
  }

  async function download(doc: ApiBidDocument) {
    const res = await fetch(`/api/officer/bid-documents/${doc._id}/download`, { headers: { Authorization: `Bearer ${getOfficerToken() ?? ''}` } });
    handleOfficerAuthFailure(res.status);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.originalFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const ruleByRequirement = useMemo(() => new Map(rules.map((r) => [r.requirementId, r])), [rules]);
  const resultByRequirement = useMemo(() => new Map((evaluation?.results ?? []).map((r) => [r.requirementId, r])), [evaluation]);
  const assessmentByRequirement = useMemo(() => new Map(assessments.map((a) => [a.requirementId, a])), [assessments]);
  const documentByRequirement = useMemo(() => {
    const map = new Map<string, ApiBidDocument[]>();
    for (const doc of bid?.documents ?? []) {
      if (!doc.requirementId) continue;
      if (!map.has(doc.requirementId)) map.set(doc.requirementId, []);
      map.get(doc.requirementId)!.push(doc);
    }
    return map;
  }, [bid]);

  function bucketOf(requirementId: string): 'PASS' | 'FAIL' | 'REVIEW' | 'unconfigured' | 'not_run' {
    if (!ruleByRequirement.has(requirementId)) return 'unconfigured';
    const result = resultByRequirement.get(requirementId);
    if (!result) return 'not_run';
    return result.result;
  }

  const counts = useMemo(() => {
    const c = { all: requirements.length, PASS: 0, FAIL: 0, REVIEW: 0, unassessed: 0 };
    for (const r of requirements) {
      const b = bucketOf(r._id);
      if (b === 'PASS' || b === 'FAIL' || b === 'REVIEW') c[b]++;
      else c.unassessed++;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirements, ruleByRequirement, resultByRequirement]);

  const filteredRequirements = useMemo(() => {
    if (filter === 'all') return requirements;
    if (filter === 'unassessed') return requirements.filter((r) => !['PASS', 'FAIL', 'REVIEW'].includes(bucketOf(r._id)));
    return requirements.filter((r) => bucketOf(r._id) === filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirements, filter, ruleByRequirement, resultByRequirement]);

  const selectedRequirement = requirements.find((r) => r._id === selectedRequirementId) ?? null;
  const selectedRule = selectedRequirement ? ruleByRequirement.get(selectedRequirement._id) : undefined;
  const selectedResult = selectedRequirement ? resultByRequirement.get(selectedRequirement._id) : undefined;
  const selectedAssessment = selectedRequirement ? assessmentByRequirement.get(selectedRequirement._id) : undefined;
  const selectedDocuments = selectedRequirement ? (documentByRequirement.get(selectedRequirement._id) ?? []) : [];

  useEffect(() => {
    if (selectedAssessment) {
      setDraftAssessment(selectedAssessment.assessment);
      setDraftComment(selectedAssessment.comment);
    } else {
      setDraftAssessment('NEEDS_REVIEW');
      setDraftComment('');
    }
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequirementId]);

  useEffect(() => {
    for (const doc of selectedDocuments) void loadEvidenceFor(doc._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequirementId]);

  async function saveAssessment() {
    if (!bidId || !selectedRequirement) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await officerApi.post<ApiOfficerAssessment>(`/bids/${bidId}/requirements/${selectedRequirement._id}/assessment`, { assessment: draftAssessment, comment: draftComment });
      setAssessments((prev) => [...prev.filter((a) => a.requirementId !== saved.requirementId), saved]);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save this assessment.');
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <OfficerPortalShell breadcrumb="Bids">
        <Callout tone="danger" title="Could not load this bid">
          {loadError}
        </Callout>
      </OfficerPortalShell>
    );
  }

  if (sealedMessage) {
    return (
      <OfficerPortalShell breadcrumb="Bids">
        <Callout tone="neutral" icon="lock" title="Bid assessment sealed until submission deadline">
          {sealedMessage}
        </Callout>
      </OfficerPortalShell>
    );
  }

  if (!bid) {
    return (
      <OfficerPortalShell breadcrumb="Bids">
        <div className="flex h-64 items-center justify-center text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" size="lg" />
        </div>
      </OfficerPortalShell>
    );
  }

  const processedDocs = bid.documents.filter((d) => d.processingStatus === 'completed').length;
  const processingDocs = bid.documents.filter((d) => d.processingStatus === 'idle' || d.processingStatus === 'processing').length;
  const failedDocs = bid.documents.filter((d) => d.processingStatus === 'failed').length;
  const assessedCount = assessments.length;

  return (
    <OfficerPortalShell breadcrumb="Bids">
      <div className="flex flex-col gap-8">
        <PageHeader
          breadcrumbs={[{ label: 'Bids', to: '/officer/bids' }, { label: bid.tenderNumber }, { label: bid.bidReference ?? 'Bid' }]}
          eyebrow={
            <>
              <Tag mono>{bid.tenderNumber}</Tag>
              <StatusBadge status={bid.status} />
              {bid.bidReference && <Tag mono>{bid.bidReference}</Tag>}
            </>
          }
          title={bid.organizationName}
          description={bid.tenderTitle}
          actions={
            <Button variant="secondary" leftIcon="arrow_back" to="/officer/bids">
              Back to bids
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card padding="lg">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Submission</p>
            <p className="mt-1 text-[14px] font-medium text-on-surface">{bid.submittedAt ? new Date(bid.submittedAt).toLocaleString('en-IN') : '—'}</p>
            <p className="text-body-sm text-on-surface-variant">{bid.organizationName}</p>
          </Card>
          <Card padding="lg">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Document processing</p>
            <div className="mt-1 flex gap-3 text-body-sm">
              <span className="text-success">{processedDocs} processed</span>
              <span className="text-secondary">{processingDocs} processing</span>
              <span className="text-warning-on-container">{failedDocs} needs attention</span>
            </div>
          </Card>
          <Card padding="lg">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Compliance assessment</p>
            {evaluation?.evaluated && evaluation.summary ? (
              <>
                <div className="mt-1 flex gap-3 text-body-sm">
                  <span className="text-success">{evaluation.summary.pass} PASS</span>
                  <span className="text-danger">{evaluation.summary.fail} FAIL</span>
                  <span className="text-warning-on-container">{evaluation.summary.review} REVIEW</span>
                </div>
                <p className="mt-1 text-[12px] font-semibold text-success">Assessment Ready</p>
              </>
            ) : (
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {bid.complianceEvaluationStatus === 'WAITING_FOR_DOCUMENTS' && 'Waiting for document processing'}
                {bid.complianceEvaluationStatus === 'PROCESSING' && 'Evaluation in progress'}
                {(bid.complianceEvaluationStatus === 'NOT_STARTED' || !bid.complianceEvaluationStatus) && 'Not evaluated yet'}
                {bid.complianceEvaluationStatus === 'FAILED' && 'Automatic evaluation failed — try Run Evaluation below'}
              </p>
            )}
          </Card>
        </div>

        <Card padding="lg" className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-on-surface">System Evaluation vs Officer Assessment</p>
            <p className="text-body-sm text-on-surface-variant">
              Officer assessed {assessedCount} / {requirements.length} requirements.
            </p>
          </div>
          <Button leftIcon="play_arrow" loading={evaluating} onClick={() => void runEvaluation()}>
            {evaluation?.evaluated ? 'Re-run Evaluation' : 'Run Compliance Evaluation'}
          </Button>
        </Card>
        {evalError && (
          <Callout tone="danger" title="Evaluation failed">
            {evalError}
          </Callout>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,38fr)_minmax(0,62fr)]">
          {/* LEFT — requirements/results */}
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-outline-variant px-4 py-3">
              <Select size="sm" aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value as FilterTab)}>
                <option value="all">All {counts.all}</option>
                <option value="PASS">PASS {counts.PASS}</option>
                <option value="FAIL">FAIL {counts.FAIL}</option>
                <option value="REVIEW">REVIEW {counts.REVIEW}</option>
                <option value="unassessed">Not assessed {counts.unassessed}</option>
              </Select>
            </div>
            <ul className="max-h-[600px] divide-y divide-outline-variant overflow-y-auto">
              {filteredRequirements.map((req) => {
                const bucket = bucketOf(req._id);
                const active = req._id === selectedRequirementId;
                const officerJudgment = assessmentByRequirement.get(req._id);
                return (
                  <li key={req._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRequirementId(req._id)}
                      className={cn('flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors', active ? 'bg-info-container/50' : 'hover:bg-surface-container-low')}
                    >
                      <span className="text-[13.5px] font-medium text-on-surface">{req.title}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {bucket === 'unconfigured' && <StatusBadge tone="neutral">Rule not configured</StatusBadge>}
                        {bucket === 'not_run' && <StatusBadge tone="neutral">Evaluation not run</StatusBadge>}
                        {(bucket === 'PASS' || bucket === 'FAIL' || bucket === 'REVIEW') && (
                          <StatusBadge tone={RESULT_META[bucket].tone} icon={RESULT_META[bucket].icon}>
                            {bucket}
                          </StatusBadge>
                        )}
                        {officerJudgment && <StatusBadge tone={ASSESSMENT_META[officerJudgment.assessment].tone}>{ASSESSMENT_META[officerJudgment.assessment].label}</StatusBadge>}
                      </div>
                    </button>
                  </li>
                );
              })}
              {filteredRequirements.length === 0 && <li className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No requirements match this filter.</li>}
            </ul>
          </Card>

          {/* RIGHT — requirement detail / evidence / assessment */}
          <Card padding="lg" className="flex flex-col gap-5">
            {!selectedRequirement && <p className="text-body-sm text-on-surface-variant">Select a requirement on the left to investigate it.</p>}

            {selectedRequirement && (
              <>
                <div className="flex flex-col gap-2">
                  <h2 className="text-headline-sm font-semibold text-on-surface">{selectedRequirement.title}</h2>
                  <p className="text-body-sm text-on-surface-variant">{selectedRequirement.description || 'No description recorded.'}</p>
                  {selectedRequirement.description && <TranslateAssist text={selectedRequirement.description} />}
                </div>

                <DescriptionList
                  columns={2}
                  items={[
                    { label: 'Category', value: selectedRequirement.category },
                    { label: 'Mandatory', value: selectedRequirement.mandatory ? 'Yes' : selectedRequirement.conditional ? 'Conditional' : 'No' },
                    { label: 'Tender source', value: selectedRequirement.sourceDocument || 'Source reference not available.' },
                    { label: 'Page', value: selectedRequirement.sourcePage ?? '—' },
                    { label: 'Clause', value: selectedRequirement.sourceClause || 'Source reference not available.' },
                  ]}
                />

                <div className="rounded-card border border-outline-variant p-4">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Compliance rule</p>
                  {selectedRule ? (
                    <p className="font-mono text-[13px] text-on-surface">
                      {selectedRule.type} · {selectedRule.field} {selectedRule.operator} {JSON.stringify(selectedRule.value ?? selectedRule.parameters ?? '')}
                    </p>
                  ) : (
                    <p className="text-body-sm text-on-surface-variant">Rule not configured.</p>
                  )}
                </div>

                <div className="rounded-card border border-outline-variant p-4">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">System evaluation result</p>
                  {!selectedRule && <p className="text-body-sm text-on-surface-variant">Rule not configured — this requirement cannot be evaluated.</p>}
                  {selectedRule && !selectedResult && evaluation?.evaluated && <p className="text-body-sm text-on-surface-variant">Evaluation not run for this requirement.</p>}
                  {selectedRule && !evaluation?.evaluated && <p className="text-body-sm text-on-surface-variant">Evaluation not run. {evaluation === null ? '' : 'Run compliance evaluation above.'}</p>}
                  {selectedResult && (
                    <div className="flex flex-col gap-2">
                      <StatusBadge tone={RESULT_META[selectedResult.result].tone} icon={RESULT_META[selectedResult.result].icon}>
                        {selectedResult.result}
                      </StatusBadge>
                      {selectedResult.finding && (
                        <p className="text-body-sm text-on-surface">
                          <span className="font-semibold">Finding: </span>
                          {selectedResult.finding}
                        </p>
                      )}
                      <p className="text-body-sm text-on-surface-variant">
                        <span className="font-semibold text-on-surface">Reason: </span>
                        {selectedResult.reason}
                      </p>
                      {evaluation?.evaluatedAt && (
                        <p className="text-[12px] text-on-surface-variant">
                          Evaluated {new Date(evaluation.evaluatedAt).toLocaleString('en-IN')} · evaluator v{evaluation.evaluatorVersion}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-card border border-outline-variant p-4">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Evidence</p>
                  {selectedDocuments.length === 0 && <p className="text-body-sm text-on-surface-variant">No document was uploaded against this requirement.</p>}
                  {selectedDocuments.map((doc) => {
                    const ev = evidence[doc._id];
                    return (
                      <div key={doc._id} className="mb-3 last:mb-0">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-mono text-[12.5px] text-on-surface">{doc.originalFilename}</span>
                          <Button variant="ghost" size="sm" leftIcon="download" onClick={() => download(doc)}>
                            Download
                          </Button>
                        </div>
                        {!ev && (
                          <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                            <Icon name="progress_activity" size="sm" className="animate-spin" /> Loading evidence…
                          </div>
                        )}
                        {ev && ev.status === 'processing' && <p className="text-body-sm text-on-surface-variant">Evidence processing pending.</p>}
                        {ev && ev.status === 'idle' && <p className="text-body-sm text-on-surface-variant">Document processing has not started.</p>}
                        {ev && ev.status === 'failed' && <p className="text-body-sm text-warning-on-container">Evidence processing requires attention: {ev.error ?? 'processing failed.'}</p>}
                        {ev && ev.status === 'completed' && ev.fields.length === 0 && <p className="text-body-sm text-on-surface-variant">No evidence fields were extracted.</p>}
                        {ev && ev.status === 'completed' && ev.fields.length > 0 && (
                          <Table minWidth={500}>
                            <THead>
                              <tr>
                                <Th>Field</Th>
                                <Th>Value</Th>
                                <Th>Page</Th>
                                <Th>Status</Th>
                              </tr>
                            </THead>
                            <TBody>
                              {ev.fields.map((f) => (
                                <Tr key={f._id}>
                                  <Td className="font-mono text-[12px]">{f.field}</Td>
                                  <Td className="text-[13px]">{f.value}</Td>
                                  <Td className="text-[13px] text-on-surface-variant">{f.sourcePage ?? '—'}</Td>
                                  <Td>
                                    <StatusBadge tone={f.status === 'extracted' ? 'success' : 'warning'}>{f.status === 'extracted' ? 'Extracted' : 'Review required'}</StatusBadge>
                                  </Td>
                                </Tr>
                              ))}
                            </TBody>
                          </Table>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-card border border-outline-variant p-4">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Officer assessment</p>
                  <p className="mb-3 text-[12px] text-on-surface-variant">Your own judgment about this result — separate from the system evaluation above, which cannot be edited here.</p>
                  <div className="flex flex-col gap-3">
                    <Select size="sm" aria-label="Officer assessment" value={draftAssessment} onChange={(e) => setDraftAssessment(e.target.value as OfficerAssessmentValue)} className="w-full sm:max-w-xs">
                      <option value="ACCEPTED">Accepted</option>
                      <option value="NEEDS_REVIEW">Needs review</option>
                      <option value="NOT_ACCEPTED">Not accepted</option>
                    </Select>
                    <textarea
                      rows={3}
                      placeholder="Add a comment explaining this assessment…"
                      value={draftComment}
                      onChange={(e) => setDraftComment(e.target.value)}
                      className="w-full rounded-control border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-[14px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-secondary focus:shadow-focus"
                    />
                    {saveError && <p className="text-body-sm text-danger">{saveError}</p>}
                    <div className="flex items-center gap-3">
                      <Button size="sm" leftIcon="save" loading={saving} onClick={() => void saveAssessment()}>
                        Save Assessment
                      </Button>
                      {selectedAssessment && <span className="text-[12px] text-on-surface-variant">Last saved {new Date(selectedAssessment.updatedAt).toLocaleString('en-IN')} by {selectedAssessment.officerId}</span>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        <Card padding="none" className="overflow-hidden">
          <div className="px-6 pt-6 sm:px-7">
            <CardHeader icon="folder_special" title="Submitted documents" />
          </div>
          <Table minWidth={700}>
            <THead>
              <tr>
                <Th className="pl-6">Document</Th>
                <Th>Size</Th>
                <Th>Uploaded</Th>
                <Th>Processing</Th>
                <Th align="right" className="pr-6">
                  <span className="sr-only">Action</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {bid.documents.map((doc) => {
                const meta = doc.processingStatus ? PROCESSING_META[doc.processingStatus] : undefined;
                return (
                  <Tr key={doc._id}>
                    <Td className="pl-6 font-mono text-[12.5px]">{doc.originalFilename}</Td>
                    <Td className="text-[13px] text-on-surface-variant num">{formatSize(doc.size)}</Td>
                    <Td className="text-[13px] text-on-surface-variant">{new Date(doc.uploadedAt).toLocaleString('en-IN')}</Td>
                    <Td>{meta ? <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge> : <StatusBadge tone="neutral">Not applicable</StatusBadge>}</Td>
                    <Td align="right" className="pr-6">
                      <Button variant="ghost" size="sm" leftIcon="download" onClick={() => download(doc)}>
                        Download
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
              {bid.documents.length === 0 && (
                <tr>
                  <Td colSpan={5} className="py-8 text-center text-body-sm text-on-surface-variant">
                    No documents attached.
                  </Td>
                </tr>
              )}
            </TBody>
          </Table>
        </Card>

        {/* Phase 8 — Final Bid Decision. Deliberately below and visually
            distinct from Officer Assessment: SYSTEM RESULT (read-only) →
            OFFICER ASSESSMENT (per-requirement judgment) → FINAL BID DECISION
            (the one human procurement decision for the whole bid). Nothing
            here is preselected or derived from PASS/FAIL/REVIEW counts. */}
        <Card padding="lg" className="flex flex-col gap-4 border-2 border-outline">
          <CardHeader icon="gavel" title="FINAL BID DECISION" description="Final decision is made by the Procurement Officer after reviewing the compliance assessment and evidence." />

          <div className="flex flex-col gap-2">
            {(['ACCEPTED', 'REVIEW', 'REJECTED'] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 text-[14px] text-on-surface">
                <input type="radio" name="final-decision" checked={decisionChoice === v} onChange={() => setDecisionChoice(v)} />
                {v === 'ACCEPTED' ? 'Accept Bid' : v === 'REVIEW' ? 'Keep for Review' : 'Reject Bid'}
              </label>
            ))}
          </div>

          {decisionChoice === 'REJECTED' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-on-surface">Reason (required)</label>
              <textarea
                rows={2}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full rounded-control border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-[14px] text-on-surface outline-none focus:border-secondary focus:shadow-focus"
              />
            </div>
          )}
          {(decisionChoice === 'ACCEPTED' || decisionChoice === 'REVIEW') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-on-surface">Comment (optional)</label>
              <textarea
                rows={2}
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                className="w-full rounded-control border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-[14px] text-on-surface outline-none focus:border-secondary focus:shadow-focus"
              />
            </div>
          )}

          {decisionError && <p className="text-body-sm text-danger">{decisionError}</p>}

          <div className="flex items-center gap-3">
            <Button leftIcon="gavel" disabled={!decisionChoice} loading={savingDecision} onClick={() => void saveDecision()}>
              Save Final Decision
            </Button>
            <Button variant="ghost" leftIcon="history" onClick={() => void toggleAudit()}>
              View Audit Trail
            </Button>
          </div>

          {decision && (
            <div className="rounded-card border border-outline-variant bg-surface-container-lowest p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Final Decision</span>
                <StatusBadge tone={DECISION_META[decision.decision].tone}>{DECISION_META[decision.decision].label}</StatusBadge>
              </div>
              <DescriptionList
                items={[
                  { label: 'Officer', value: decision.officerId },
                  { label: 'Decision time', value: new Date(decision.updatedAt).toLocaleString('en-IN') },
                  { label: decision.decision === 'REJECTED' ? 'Reason' : 'Comment', value: (decision.decision === 'REJECTED' ? decision.reason : decision.comment) || '—' },
                ]}
              />
            </div>
          )}

          {showAudit && (
            <div className="rounded-card border border-outline-variant p-4">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Audit Trail</p>
              {auditError && <p className="text-body-sm text-danger">{auditError}</p>}
              {!auditError && !auditEvents && (
                <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                  <Icon name="progress_activity" size="sm" className="animate-spin" /> Loading audit trail…
                </div>
              )}
              {auditEvents && auditEvents.length === 0 && <p className="text-body-sm text-on-surface-variant">No audit events recorded for this bid yet.</p>}
              {auditEvents && auditEvents.length > 0 && (
                <ol className="flex flex-col gap-3">
                  {auditEvents.map((e) => (
                    <li key={e._id} className="border-b border-outline-variant pb-2 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="num text-on-surface-variant">{new Date(e.timestamp).toLocaleString('en-IN')}</span>
                        <span className="font-semibold text-on-surface">{actionLabel(e.action)}</span>
                        {e.result && <Tag mono>{e.result}</Tag>}
                      </div>
                      {Object.keys(e.context ?? {}).length > 0 && <p className="mt-0.5 text-[12px] text-on-surface-variant">{Object.entries(e.context).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </Card>
      </div>
    </OfficerPortalShell>
  );
}
