// Procurement Officer — Create Tender, Step 4: Rules & Compliance. Step 3
// defines WHAT bidders must provide; this step defines HOW the compliance
// engine will evaluate it, as structured conditions (no formulas or code).
//
// Phase 2: real persistence via ComplianceRule, each one required to
// reference a requirement that actually belongs to this same tender (the
// gateway rejects cross-tender references — see officer/rules.routes.ts).
// Phase 4: adds real AI-assisted rule proposals — POST
// .../requirements/:id/propose-rule calls the actual apps/ai service, which
// translates one approved requirement into a rule proposal (or says no safe
// rule applies). Nothing is persisted until the officer accepts/edits it,
// which goes through the exact same POST /tenders/:id/rules as a manual rule.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import { Button, Callout, Card, CardHeader, DescriptionList, Drawer, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, StatusBadge, Stepper, Table, TBody, Td, Th, THead, Tag, Toast, Tr } from '@/components/primitives';
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, getDraftTenderId } from './createTender';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiComplianceRule, ApiProposeRuleResponse, ApiRuleProposal, ApiTenderRequirement, RuleOperator, RuleType } from '@/lib/types';

const RULE_TYPES: { id: RuleType; label: string }[] = [
  { id: 'numeric_threshold', label: 'Numeric threshold' },
  { id: 'date_validity', label: 'Date validity' },
  { id: 'required_document', label: 'Required document' },
  { id: 'boolean_condition', label: 'Boolean condition' },
  { id: 'experience_threshold', label: 'Experience threshold' },
];
const OPERATORS: RuleOperator[] = ['>=', '<=', '>', '<', '==', '!='];

interface FormState {
  requirementId: string;
  type: RuleType;
  field: string;
  operator: RuleOperator;
  value: string;
}
const BLANK: FormState = { requirementId: '', type: 'numeric_threshold', field: '', operator: '>=', value: '' };

function toForm(r: ApiComplianceRule): FormState {
  return { requirementId: r.requirementId, type: r.type, field: r.field, operator: r.operator, value: r.value === undefined || r.value === null ? '' : String(r.value) };
}

type DrawerState = { item: ApiComplianceRule; mode: 'view' | 'edit' } | { item: null; mode: 'new' } | null;

export function CreateTenderRulesPage() {
  const navigate = useNavigate();
  const tenderId = getDraftTenderId();

  const [rules, setRules] = useState<ApiComplianceRule[] | null>(null);
  const [requirements, setRequirements] = useState<ApiTenderRequirement[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeRule, setRemoveRule] = useState<ApiComplianceRule | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Phase 4/10D — AI rule proposals (preview-only, keyed by requirement id).
  const [proposals, setProposals] = useState<Record<string, ApiRuleProposal>>({});
  const [proposing, setProposing] = useState<Set<string>>(new Set());
  const [proposeError, setProposeError] = useState<Record<string, string>>({});
  const [dismissedProposals, setDismissedProposals] = useState<Set<string>>(new Set());
  const [autoGenerating, setAutoGenerating] = useState(false);
  const autoTriggerRanFor = useRef<Set<string>>(new Set());

  async function load() {
    if (!tenderId) return;
    try {
      const [r, req] = await Promise.all([officerApi.get<ApiComplianceRule[]>(`/tenders/${tenderId}/rules`), officerApi.get<ApiTenderRequirement[]>(`/tenders/${tenderId}/requirements`)]);
      setRules(r);
      setRequirements(req);
      return { r, req };
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load compliance rules.');
      return null;
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 10D — the officer approving a requirement in Step 3 is the trigger
  // for an AI rule proposal; since Step 3 and Step 4 are separate page
  // mounts with no proposal persistence between them (proposals are
  // preview-only, exactly like the existing manual "Propose rule with AI"
  // button already was — see the Phase 4 comment above), the practical
  // automatic trigger point is here: the moment Step 4 loads, generate a
  // real proposal for every approved requirement that doesn't have a rule or
  // a proposal yet, without the officer needing to click anything. Requests
  // run one at a time (not in parallel) — concurrent Gemini calls were a
  // real, previously-observed source of failures in this project.
  useEffect(() => {
    if (!requirements || !rules) return;
    const pending = requirements.filter((r) => r.status === 'approved' && !rules.some((ru) => ru.requirementId === r._id) && !proposals[r._id] && !autoTriggerRanFor.current.has(r._id));
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      setAutoGenerating(true);
      for (const r of pending) {
        if (cancelled) break;
        autoTriggerRanFor.current.add(r._id);
        await proposeRule(r._id);
      }
      if (!cancelled) setAutoGenerating(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirements, rules]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const requirementTitle = (id: string) => requirements?.find((r) => r._id === id)?.title ?? '(unknown requirement)';

  function openNew() {
    setForm({ ...BLANK, requirementId: requirements?.[0]?._id ?? '' });
    setTouched(false);
    setFormError(null);
    setDrawer({ item: null, mode: 'new' });
  }
  function startEdit(r: ApiComplianceRule) {
    setForm(toForm(r));
    setTouched(false);
    setFormError(null);
    setDrawer({ item: r, mode: 'edit' });
  }

  const errors = touched ? { requirementId: !form.requirementId ? 'Select a requirement' : undefined, field: !form.field.trim() ? 'Field name is required' : undefined } : {};

  async function save() {
    setTouched(true);
    if (!form.requirementId || !form.field.trim() || !tenderId) return;
    setSaving(true);
    setFormError(null);
    const numericValue = form.value !== '' && !Number.isNaN(Number(form.value)) ? Number(form.value) : form.value;
    const payload = { requirementId: form.requirementId, type: form.type, field: form.field.trim(), operator: form.operator, value: numericValue };
    try {
      if (drawer?.mode === 'new') {
        await officerApi.post(`/tenders/${tenderId}/rules`, payload);
        setToast('Rule added');
      } else if (drawer?.mode === 'edit') {
        await officerApi.patch(`/rules/${drawer.item._id}`, payload);
        setToast('Rule updated');
      }
      setDrawer(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save this rule.');
    } finally {
      setSaving(false);
    }
  }

  async function proposeRule(requirementId: string) {
    if (!tenderId) return;
    setProposing((prev) => new Set(prev).add(requirementId));
    setProposeError((prev) => ({ ...prev, [requirementId]: '' }));
    try {
      const result = await officerApi.post<ApiProposeRuleResponse>(`/tenders/${tenderId}/requirements/${requirementId}/propose-rule`);
      setProposals((prev) => ({ ...prev, [requirementId]: result.proposal }));
      setDismissedProposals((prev) => {
        const next = new Set(prev);
        next.delete(requirementId);
        return next;
      });
    } catch (err) {
      setProposeError((prev) => ({ ...prev, [requirementId]: err instanceof ApiError ? err.message : 'AI service unavailable. A rule can still be entered manually.' }));
    } finally {
      setProposing((prev) => {
        const next = new Set(prev);
        next.delete(requirementId);
        return next;
      });
    }
  }

  async function acceptProposalAsIs(requirementId: string, proposal: ApiRuleProposal) {
    if (!tenderId || !proposal.type || !proposal.operator || !proposal.field) return;
    setSaving(true);
    try {
      await officerApi.post(`/tenders/${tenderId}/rules`, {
        requirementId,
        type: proposal.type,
        field: proposal.field,
        operator: proposal.operator,
        value: proposal.value,
        parameters: proposal.parameters ?? {},
      });
      setToast('Rule accepted');
      setProposals((prev) => {
        const next = { ...prev };
        delete next[requirementId];
        return next;
      });
      await load();
    } catch (err) {
      setProposeError((prev) => ({ ...prev, [requirementId]: err instanceof ApiError ? err.message : 'Could not save this rule.' }));
    } finally {
      setSaving(false);
    }
  }

  function editProposal(requirementId: string, proposal: ApiRuleProposal) {
    setForm({
      requirementId,
      type: (proposal.type ?? 'numeric_threshold') as RuleType,
      field: proposal.field ?? '',
      operator: (proposal.operator ?? '>=') as RuleOperator,
      value: proposal.value === undefined || proposal.value === null ? '' : String(proposal.value),
    });
    setTouched(false);
    setFormError(null);
    setDrawer({ item: null, mode: 'new' });
  }

  function dismissProposal(requirementId: string) {
    setDismissedProposals((prev) => new Set(prev).add(requirementId));
  }

  async function doRemove() {
    if (!removeRule) return;
    try {
      await officerApi.delete(`/rules/${removeRule._id}`);
      setToast('Rule removed');
      setRemoveRule(null);
      setDrawer(null);
      await load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not remove this rule.');
      setRemoveRule(null);
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
        <Callout tone="danger" title="Could not load compliance rules">
          {loadError}
        </Callout>
      </OfficerPortalShell>
    );
  }
  if (!rules || !requirements) {
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
          breadcrumbs={[{ label: 'Tenders', to: '/officer/tenders' }, { label: 'Create tender', to: CREATE_TENDER_ROUTES.info }, { label: 'Rules & compliance' }]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{tenderId.slice(-8)}</Tag>
            </>
          }
          title="Rules & compliance"
          description="Define structured conditions for how each requirement will be evaluated — AI-assisted or manual."
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={4} />
        </Card>

        {requirements.length === 0 ? (
          <Callout tone="warning" title="No requirements yet">
            Add at least one bidder requirement in Step 3 before configuring rules — every rule must reference one.
          </Callout>
        ) : (
          <Card padding="lg">
            <CardHeader icon="auto_awesome" title="AI rule proposals" description="Approving a requirement in Step 3 automatically generates a structured rule proposal here. You review and confirm every one — nothing is saved automatically." />
            {autoGenerating && (
              <div className="mb-3 flex items-center gap-2 rounded-card border border-outline-variant bg-surface-container-lowest p-3 text-body-sm text-on-surface-variant">
                <Icon name="progress_activity" className="animate-spin" size="md" />
                Generating rule proposals…
              </div>
            )}
            <ul className="flex flex-col gap-3">
              {requirements
                .filter((r) => r.status === 'approved')
                .map((r) => {
                  const existingRule = rules.find((ru) => ru.requirementId === r._id);
                  const proposal = proposals[r._id];
                  const dismissed = dismissedProposals.has(r._id);
                  return (
                    <li key={r._id} className="rounded-card border border-outline-variant p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[12.5px] text-on-surface-variant">{r.code}</span>
                            <span className="text-[15px] font-semibold text-on-surface">{r.title}</span>
                          </div>
                          <p className="mt-1 text-[12px] text-on-surface-variant">
                            Source: {r.sourceDocument || 'Tender document'}{r.sourcePage ? ` · Page ${r.sourcePage}` : ''}{r.sourceClause ? ` · Clause ${r.sourceClause}` : ''}
                          </p>
                        </div>
                        {existingRule ? (
                          <StatusBadge tone="success" icon="check_circle">
                            Rule configured
                          </StatusBadge>
                        ) : (
                          <Button size="sm" leftIcon="auto_awesome" loading={proposing.has(r._id)} onClick={() => proposeRule(r._id)}>
                            {proposeError[r._id] ? 'Retry rule proposal' : proposal ? 'Re-propose with AI' : proposing.has(r._id) ? 'Generating…' : 'Propose rule with AI'}
                          </Button>
                        )}
                      </div>

                      {proposeError[r._id] && (
                        <Callout tone="danger" icon="error" title="AI unavailable" className="mt-3">
                          {proposeError[r._id]} A rule can still be added manually below.
                        </Callout>
                      )}

                      {!existingRule && proposal && !dismissed && (
                        <div className="mt-3 rounded-card border border-outline-variant bg-surface-container-low p-4">
                          {proposal.ruleApplicable ? (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge tone="info">AI-proposed rule</StatusBadge>
                                <Tag>{RULE_TYPES.find((t) => t.id === proposal.type)?.label ?? proposal.type}</Tag>
                              </div>
                              <div className="mt-2 font-mono text-[13px] text-on-surface">
                                {proposal.field} {proposal.operator} {String(proposal.value ?? '')}
                              </div>
                              {proposal.parameters && Object.keys(proposal.parameters).length > 0 && (
                                <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-on-surface-variant">
                                  {Object.entries(proposal.parameters).map(([k, v]) => (
                                    <div key={k} className="flex gap-1.5">
                                      <dt className="font-medium">{k}:</dt>
                                      <dd>{String(v)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                              <p className="mt-2 text-[12.5px] text-on-surface-variant">{proposal.reason}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button size="sm" leftIcon="check" loading={saving} onClick={() => acceptProposalAsIs(r._id, proposal)}>
                                  Accept rule
                                </Button>
                                <Button size="sm" variant="secondary" leftIcon="edit" onClick={() => editProposal(r._id, proposal)}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="ghost" leftIcon="close" className="text-danger" onClick={() => dismissProposal(r._id)}>
                                  Reject
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-[13px] font-semibold text-on-surface">No deterministic compliance rule proposed.</p>
                              <p className="mt-1 text-[12.5px] text-on-surface-variant">Reason: {proposal.reason}</p>
                              <Button size="sm" variant="ghost" className="mt-2" onClick={() => dismissProposal(r._id)}>
                                Keep informational
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              {requirements.filter((r) => r.status === 'approved').length === 0 && <p className="text-body-sm text-on-surface-variant">No approved requirements yet — approve at least one in Step 3.</p>}
            </ul>
          </Card>
        )}

        {requirements.length === 0 ? null : (
          <Card padding="none" className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-headline-sm font-semibold text-on-surface">Compliance rules</h2>
                <span className="text-body-sm text-on-surface-variant">{rules.length} rule{rules.length === 1 ? '' : 's'}</span>
              </div>
              <Button size="sm" leftIcon="add" onClick={openNew}>
                Add rule
              </Button>
            </div>

            {rules.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon="rule"
                  title="No rules yet"
                  description="Add a structured condition — e.g. average annual turnover ≥ a numeric threshold."
                  actions={
                    <Button leftIcon="add" onClick={openNew}>
                      Add first rule
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table minWidth={860}>
                <THead>
                  <tr>
                    <Th>Requirement</Th>
                    <Th>Type</Th>
                    <Th>Field</Th>
                    <Th>Condition</Th>
                    <Th align="right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {rules.map((r) => (
                    <Tr key={r._id} className="cursor-pointer" onClick={() => setDrawer({ item: r, mode: 'view' })}>
                      <Td className="font-semibold text-on-surface">{requirementTitle(r.requirementId)}</Td>
                      <Td>
                        <Tag>{RULE_TYPES.find((t) => t.id === r.type)?.label ?? r.type}</Tag>
                      </Td>
                      <Td className="font-mono text-[12.5px]">{r.field}</Td>
                      <Td className="num">
                        {r.operator} {String(r.value ?? '')}
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
        )}
      </div>

      <BidActionBar
        left={
          <Button variant="secondary" leftIcon="arrow_back" to={CREATE_TENDER_ROUTES.requirements}>
            Back to requirements
          </Button>
        }
        center={
          <Button variant="ghost" leftIcon="save" onClick={() => navigate('/officer/tenders')}>
            Save draft & exit
          </Button>
        }
        right={
          <Button rightIcon="arrow_forward" onClick={() => navigate(CREATE_TENDER_ROUTES.review)}>
            Continue to review & publish
          </Button>
        }
      />

      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        icon={drawer?.mode === 'view' ? 'fact_check' : drawer?.mode === 'new' ? 'add_circle' : 'edit'}
        title={drawer?.mode === 'view' ? 'Rule details' : drawer?.mode === 'edit' ? 'Edit rule' : 'Add rule'}
        footer={
          drawer?.mode === 'view' ? (
            <div className="flex w-full items-center justify-between gap-2.5">
              <Button variant="ghost" leftIcon="delete" className="text-danger" onClick={() => setRemoveRule(drawer.item)}>
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
                {drawer.mode === 'new' ? 'Add rule' : 'Save'}
              </Button>
            </>
          ) : undefined
        }
      >
        {drawer?.mode === 'view' ? (
          <DescriptionList
            items={[
              { label: 'Requirement', value: requirementTitle(drawer.item.requirementId) },
              { label: 'Type', value: RULE_TYPES.find((t) => t.id === drawer.item.type)?.label ?? drawer.item.type },
              { label: 'Field', value: <span className="font-mono">{drawer.item.field}</span> },
              { label: 'Condition', value: `${drawer.item.operator} ${String(drawer.item.value ?? '')}` },
            ]}
          />
        ) : drawer ? (
          <div className="flex flex-col gap-5">
            {formError && (
              <Callout tone="danger" title="Could not save">
                {formError}
              </Callout>
            )}
            <Field label="Requirement" htmlFor="ru-req" required error={errors.requirementId}>
              <Select id="ru-req" value={form.requirementId} state={errors.requirementId ? 'error' : 'default'} onChange={(e) => setForm({ ...form, requirementId: e.target.value })}>
                <option value="">Select requirement…</option>
                {requirements.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.code} — {r.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Rule type" htmlFor="ru-type">
              <Select id="ru-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RuleType })}>
                {RULE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Field" htmlFor="ru-field" required error={errors.field} helper="The data field this rule checks, e.g. average_annual_turnover">
              <Input id="ru-field" value={form.field} state={errors.field ? 'error' : 'default'} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="average_annual_turnover" className="font-mono" />
            </Field>
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <Field label="Operator" htmlFor="ru-op">
                <Select id="ru-op" value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value as RuleOperator })}>
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Value" htmlFor="ru-val">
                <Input id="ru-val" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="5000000" />
              </Field>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={!!removeRule}
        onClose={() => setRemoveRule(null)}
        icon="warning"
        size="md"
        title="Remove rule?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveRule(null)}>
              Keep
            </Button>
            <Button variant="danger" onClick={doRemove}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">This permanently deletes the compliance rule.</p>
      </Modal>

      {toast && <Toast message={toast} />}
    </OfficerPortalShell>
  );
}
