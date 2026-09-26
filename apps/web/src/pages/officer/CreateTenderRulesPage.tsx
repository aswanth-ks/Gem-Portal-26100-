// Procurement Officer — Create Tender, Step 4: Technical & Financial Rules
// (O08). Step 3 (O07) defines WHAT bidders must provide; this step defines
// HOW the compliance engine evaluates it, as simple structured conditions
// (no formulas or code). Every rule keeps a source-document reference.
// Rules are Active or Disabled only; AI never approves rules or decides
// pass/fail. No bidder results are shown here — configuration only.
//
// Same header, stepper, cards and action bar as the other wizard steps.
// Tabs, row menu, add/edit side drawer, view-source and remove dialogs are
// React state.
//
// TODO: persist to /api/officer/tenders/drafts/:ref/rules.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import {
  Button,
  Callout,
  Card,
  Field,
  Icon,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Stepper,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tabs,
  Tag,
  Toast,
  Tr,
} from '@/components/primitives';
import { cn } from '@/utils/cn';
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, DRAFT_REF } from './createTender';
import { YesNo } from './CreateTenderInfoPage';

type Category = 'technical' | 'financial';
type ConditionType = 'gte' | 'lte' | 'eq' | 'contains' | 'required' | 'valid_on_bid_date' | 'exists' | 'matches';
type Evaluation = 'Automatic' | 'Rule-based';

interface Rule {
  id: string;
  name: string;
  category: Category;
  field: string;
  condition: ConditionType;
  value: string;
  unit: string;
  mandatory: boolean;
  sourceDoc: string;
  sourcePage: string;
  evaluation: Evaluation;
  note: string;
  active: boolean;
}

const CONDITIONS: { id: ConditionType; label: string; needsValue: boolean }[] = [
  { id: 'gte', label: 'Greater than or equal to', needsValue: true },
  { id: 'lte', label: 'Less than or equal to', needsValue: true },
  { id: 'eq', label: 'Equal to', needsValue: true },
  { id: 'contains', label: 'Contains', needsValue: true },
  { id: 'required', label: 'Required', needsValue: false },
  { id: 'valid_on_bid_date', label: 'Date valid on bid date', needsValue: false },
  { id: 'exists', label: 'Exists', needsValue: false },
  { id: 'matches', label: 'Matches specified value', needsValue: true },
];

const SOURCE_DOCS = ['Technical Specification.pdf', 'Tender Document (NIT).pdf', 'Financial Terms.xlsx'];

const base = { unit: '', mandatory: true, note: '', active: true };
const INITIAL_RULES: Rule[] = [
  { ...base, id: 't1', name: 'Camera Resolution', category: 'technical', field: 'Resolution', condition: 'gte', value: '4K', sourceDoc: 'Technical Specification.pdf', sourcePage: 'Pg. 7', evaluation: 'Automatic' },
  { ...base, id: 't2', name: 'Night Vision', category: 'technical', field: 'IR night vision', condition: 'required', value: '', sourceDoc: 'Technical Specification.pdf', sourcePage: 'Pg. 7', evaluation: 'Automatic' },
  { ...base, id: 't3', name: 'Ingress Protection', category: 'technical', field: 'IP rating', condition: 'gte', value: 'IP66', sourceDoc: 'Technical Specification.pdf', sourcePage: 'Pg. 8', evaluation: 'Automatic', note: 'IP66 or higher' },
  { ...base, id: 't4', name: 'Storage Capacity', category: 'technical', field: 'Recording retention', condition: 'gte', value: '30', unit: 'days', sourceDoc: 'Technical Specification.pdf', sourcePage: 'Pg. 8', evaluation: 'Automatic' },
  { ...base, id: 't5', name: 'Warranty', category: 'technical', field: 'Comprehensive warranty', condition: 'gte', value: '3', unit: 'years', sourceDoc: 'Technical Specification.pdf', sourcePage: 'Pg. 9', evaluation: 'Automatic' },
  { ...base, id: 't6', name: 'OEM Authorization', category: 'technical', field: 'OEM authorization letter', condition: 'valid_on_bid_date', value: '', sourceDoc: 'Tender Document (NIT).pdf', sourcePage: 'Pg. 20', evaluation: 'Automatic', note: 'Checked against the bid submission date, not today.' },
  { ...base, id: 'f1', name: 'Average Annual Turnover', category: 'financial', field: 'Avg. turnover (last 3 FY)', condition: 'gte', value: '₹50', unit: 'Lakhs', sourceDoc: 'Tender Document (NIT).pdf', sourcePage: 'Pg. 18', evaluation: 'Automatic' },
  { ...base, id: 'f2', name: 'Bid Validity', category: 'financial', field: 'Bid validity period', condition: 'matches', value: 'As specified in tender', sourceDoc: 'Tender Document (NIT).pdf', sourcePage: 'Pg. 21', evaluation: 'Rule-based' },
  { ...base, id: 'f3', name: 'EMD', category: 'financial', field: 'Earnest money deposit', condition: 'matches', value: 'As specified in tender', sourceDoc: 'Financial Terms.xlsx', sourcePage: 'Pg. 22', evaluation: 'Rule-based' },
];

function conditionText(r: Pick<Rule, 'condition' | 'value' | 'unit'>) {
  const v = [r.value, r.unit].filter(Boolean).join(' ');
  switch (r.condition) {
    case 'gte':
      return `≥ ${v}`;
    case 'lte':
      return `≤ ${v}`;
    case 'eq':
      return `= ${v}`;
    case 'contains':
      return `Contains “${v}”`;
    case 'required':
      return 'Required';
    case 'valid_on_bid_date':
      return 'Valid on bid date';
    case 'exists':
      return 'Must exist';
    case 'matches':
      return v;
  }
}

const EMPTY: Omit<Rule, 'id' | 'active'> = {
  name: '',
  category: 'technical',
  field: '',
  condition: 'gte',
  value: '',
  unit: '',
  mandatory: true,
  sourceDoc: '',
  sourcePage: '',
  evaluation: 'Automatic',
  note: '',
};

/** Row "⋮" menu. Rendered fixed so the table's horizontal scroll can't clip it. */
function RowMenu({ rule, onEdit, onSource, onToggle, onRemove }: { rule: Rule; onEdit: () => void; onSource: () => void; onToggle: () => void; onRemove: () => void }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  const items = [
    { icon: 'edit', label: 'Edit', run: onEdit },
    { icon: 'find_in_page', label: 'View source', run: onSource },
    { icon: rule.active ? 'block' : 'check_circle', label: rule.active ? 'Disable' : 'Enable', run: onToggle },
    { icon: 'delete', label: 'Remove', run: onRemove, danger: true },
  ];

  return (
    <>
      <span ref={btnRef} className="inline-flex">
      <IconButton
        icon="more_vert"
        aria-label={`Actions for ${rule.name}`}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={() => {
          const r = btnRef.current?.getBoundingClientRect();
          if (r) setPos(pos ? null : { top: r.bottom + 4, right: window.innerWidth - r.right });
        }}
      />
      </span>
      {pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <ul role="menu" style={{ top: pos.top, right: pos.right }} className="fixed z-50 w-44 rounded-card border border-outline-variant bg-surface-container-lowest py-1.5 shadow-overlay animate-scale-in">
            {items.map((it) => (
              <li key={it.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPos(null);
                    it.run();
                  }}
                  className={cn('flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[14px] transition-colors hover:bg-surface-container-low', it.danger ? 'text-danger' : 'text-on-surface')}
                >
                  <Icon name={it.icon} size="sm" className={it.danger ? 'text-danger' : 'text-on-surface-variant'} />
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export function CreateTenderRulesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Category>('technical');
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES);
  const [drawer, setDrawer] = useState<Rule | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const [sourceRule, setSourceRule] = useState<Rule | null>(null);
  const [removeRule, setRemoveRule] = useState<Rule | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(null);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  const visible = rules.filter((r) => r.category === tab);
  const count = (c: Category) => rules.filter((r) => r.category === c).length;
  const activeCount = rules.filter((r) => r.active).length;
  const cond = CONDITIONS.find((c) => c.id === form.condition)!;

  function openDrawer(r: Rule | 'new') {
    setForm(r === 'new' ? { ...EMPTY, category: tab } : { ...r });
    setTouched(false);
    setDrawer(r);
  }

  const errors = touched
    ? {
        name: !form.name.trim() ? 'Rule name is required' : undefined,
        field: !form.field.trim() ? 'Specify the requirement or field evaluated' : undefined,
        value: cond.needsValue && !form.value.trim() ? 'Expected value is required for this condition' : undefined,
        source: !form.sourceDoc ? 'Every rule needs a source document' : undefined,
      }
    : {};

  function save() {
    setTouched(true);
    if (!form.name.trim() || !form.field.trim() || (cond.needsValue && !form.value.trim()) || !form.sourceDoc) return;
    const clean = { ...form, value: cond.needsValue ? form.value : '', unit: cond.needsValue ? form.unit : '' };
    if (drawer === 'new') {
      setRules((all) => [...all, { ...clean, id: `r-${Date.now()}`, active: true }]);
      setToast(`Rule “${form.name}” added`);
    } else if (drawer) {
      setRules((all) => all.map((r) => (r.id === drawer.id ? { ...r, ...clean } : r)));
      setToast(`Rule “${form.name}” updated`);
    }
    setTab(form.category);
    setDrawer(null);
  }

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-6 pb-28">
        <PageHeader
          breadcrumbs={[
            { label: 'Tenders', to: '/officer/tenders' },
            { label: 'CPCL/PROC/2026/041', to: CREATE_TENDER_ROUTES.info },
            { label: 'Technical & financial rules' },
          ]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{DRAFT_REF}</Tag>
            </>
          }
          title="Technical & financial rules"
          description="Define the objective conditions used to evaluate bidder submissions."
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={4} />
        </Card>

        <Callout tone="neutral" icon="account_tree" title="Step 3 set what bidders must provide. This step sets how it is evaluated.">
          AI can help interpret tender clauses, but rules are fixed conditions that you configure. The system never approves rules and gives no final pass/fail decision.
        </Callout>

        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-col gap-4 px-6 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <Tabs
              ariaLabel="Rule category"
              value={tab}
              onChange={(id) => setTab(id as Category)}
              items={[
                { id: 'technical', label: 'Technical rules', count: count('technical') },
                { id: 'financial', label: 'Financial rules', count: count('financial') },
              ]}
            />
            <div className="flex flex-col items-start gap-1.5 pb-3 sm:items-end">
              <Button leftIcon="add" onClick={() => openDrawer('new')}>
                Add rule
              </Button>
            </div>
          </div>
          <p className="border-b border-outline-variant px-6 py-3 text-body-sm text-on-surface-variant">
            Configure objective conditions used by the compliance engine to evaluate bidder evidence.
          </p>

          <Table minWidth={960}>
            <THead>
              <tr>
                <Th>Rule</Th>
                <Th>Condition</Th>
                <Th>Source</Th>
                <Th>Evaluation</Th>
                <Th>Status</Th>
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {visible.length === 0 ? (
                <tr>
                  <Td colSpan={6} className="py-12 text-center text-on-surface-variant">
                    No {tab} rules yet.{' '}
                    <button type="button" className="font-semibold text-secondary hover:underline" onClick={() => openDrawer('new')}>
                      Add the first rule
                    </button>
                  </Td>
                </tr>
              ) : (
                visible.map((r) => (
                  <Tr key={r.id} className={cn(!r.active && 'opacity-60')}>
                    <Td>
                      <div className="font-semibold text-on-surface">{r.name}</div>
                      <div className="text-body-sm text-on-surface-variant">
                        {r.field}
                        {!r.mandatory && ' · optional'}
                      </div>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium">
                        {r.condition === 'valid_on_bid_date' && <Icon name="event_available" size="sm" className="text-secondary" />}
                        {conditionText(r)}
                      </span>
                    </Td>
                    <Td>
                      <button type="button" onClick={() => setSourceRule(r)} className="inline-flex items-center gap-1.5 text-left text-body-sm text-secondary hover:underline">
                        <Icon name="description" size="sm" />
                        {r.sourceDoc.replace(/\.(pdf|xlsx)$/i, '')}, {r.sourcePage}
                      </button>
                    </Td>
                    <Td>
                      <Tag>{r.evaluation}</Tag>
                    </Td>
                    <Td>{r.active ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="neutral">Disabled</StatusBadge>}</Td>
                    <Td align="right">
                      <RowMenu
                        rule={r}
                        onEdit={() => openDrawer(r)}
                        onSource={() => setSourceRule(r)}
                        onToggle={() => {
                          setRules((all) => all.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)));
                          setToast(`${r.name} ${r.active ? 'disabled' : 'enabled'}`);
                        }}
                        onRemove={() => setRemoveRule(r)}
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </div>

      <BidActionBar
        left={
          <Button variant="secondary" leftIcon="arrow_back" to={`${CREATE_TENDER_ROUTES.requirements}?mode=ai`}>
            Back to bidder requirements
          </Button>
        }
        center={<span className="text-body-sm text-on-surface-variant">{activeCount} active rules · {rules.length - activeCount} disabled</span>}
        right={
          <>
            <Button variant="secondary" leftIcon="save" onClick={() => navigate('/officer/tenders')}>
              Save draft & exit
            </Button>
            <Button rightIcon="arrow_forward" disabled={activeCount === 0} onClick={() => navigate(CREATE_TENDER_ROUTES.review)}>
              Continue to review & publish
            </Button>
          </>
        }
      />

      {/* Add / edit drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-navy-900/50 backdrop-blur-[2px] animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(null)}>
          <aside role="dialog" aria-modal="true" aria-labelledby="rule-drawer-title" className="flex h-full w-full max-w-[480px] flex-col bg-surface-container-lowest shadow-overlay animate-slide-in-right">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-info-container text-secondary">
                  <Icon name={drawer === 'new' ? 'add_task' : 'edit'} size="lg" />
                </span>
                <div>
                  <h2 id="rule-drawer-title" className="text-headline-md text-on-surface">
                    {drawer === 'new' ? 'Add evaluation rule' : 'Edit evaluation rule'}
                  </h2>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">A fixed condition checked against bidder evidence.</p>
                </div>
              </div>
              <IconButton icon="close" aria-label="Close" onClick={() => setDrawer(null)} />
            </div>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto scroll-thin px-6 py-6">
              <Field label="Rule name" htmlFor="ru-name" required error={errors.name}>
                <Input id="ru-name" value={form.name} state={errors.name ? 'error' : 'default'} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Camera Resolution" />
              </Field>
              <Field label="Category" htmlFor="ru-cat">
                <Select id="ru-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
                  <option value="technical">Technical</option>
                  <option value="financial">Financial</option>
                </Select>
              </Field>
              <Field label="Requirement / field" htmlFor="ru-field" required error={errors.field}>
                <Input id="ru-field" value={form.field} state={errors.field ? 'error' : 'default'} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="e.g. Resolution" />
              </Field>
              <Field
                label="Condition type"
                htmlFor="ru-cond"
                required
                helper={form.condition === 'valid_on_bid_date' ? 'Evidence must be valid on the bid submission date, not just today. Use for certificates, registrations, licences and OEM authorizations.' : undefined}
              >
                <Select id="ru-cond" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as ConditionType })}>
                  {CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {cond.needsValue && (
                <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-4">
                  <Field label="Expected value" htmlFor="ru-val" required error={errors.value}>
                    <Input id="ru-val" value={form.value} state={errors.value ? 'error' : 'default'} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="e.g. 4K" />
                  </Field>
                  <Field label="Unit" htmlFor="ru-unit" aside={<span className="text-[12px] text-on-surface-variant">Optional</span>}>
                    <Input id="ru-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="days" />
                  </Field>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 rounded-card border border-outline-variant p-4">
                <div>
                  <div className="text-[14px] font-semibold text-on-surface">Mandatory</div>
                  <div className="text-body-sm text-on-surface-variant">Bids that fail a mandatory rule are flagged for the officer</div>
                </div>
                <YesNo label="Mandatory" value={form.mandatory} onChange={(v) => setForm({ ...form, mandatory: v })} />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-4">
                <Field label="Source document" htmlFor="ru-src" required error={errors.source}>
                  <Select id="ru-src" value={form.sourceDoc} state={errors.source ? 'error' : 'default'} onChange={(e) => setForm({ ...form, sourceDoc: e.target.value })}>
                    <option value="">Select document…</option>
                    {SOURCE_DOCS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Page / section" htmlFor="ru-page">
                  <Input id="ru-page" value={form.sourcePage} onChange={(e) => setForm({ ...form, sourcePage: e.target.value })} placeholder="Pg. 7" />
                </Field>
              </div>
              <Field label="Evaluation" htmlFor="ru-eval">
                <Select id="ru-eval" value={form.evaluation} onChange={(e) => setForm({ ...form, evaluation: e.target.value as Evaluation })}>
                  <option>Automatic</option>
                  <option>Rule-based</option>
                </Select>
              </Field>
              <Field label="Description / evaluation note" htmlFor="ru-note" aside={<span className="text-[12px] text-on-surface-variant">Optional</span>}>
                <textarea
                  id="ru-note"
                  rows={3}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Guidance for the evaluation committee"
                  className="w-full rounded-control border border-outline-variant bg-surface-container-lowest px-3.5 py-3 text-[14px] text-on-surface outline-none transition-all placeholder:text-outline hover:border-outline/60 focus:border-secondary focus:shadow-focus"
                />
              </Field>
              {cond.needsValue && form.value && (
                <div className="rounded-card bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
                  Preview: <span className="font-semibold text-on-surface">{form.field || 'Field'}</span> {conditionText(form)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-outline-variant bg-surface-container-low px-6 py-4">
              <Button variant="secondary" onClick={() => setDrawer(null)}>
                Cancel
              </Button>
              <Button leftIcon="check" onClick={save}>
                Save rule
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* View source */}
      <Modal
        open={!!sourceRule}
        onClose={() => setSourceRule(null)}
        icon="find_in_page"
        size="md"
        title={sourceRule?.name}
        description={sourceRule && `${sourceRule.sourceDoc} · ${sourceRule.sourcePage}`}
        footer={<Button onClick={() => setSourceRule(null)}>Close</Button>}
      >
        {sourceRule && (
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-outline-variant bg-surface-container-low p-4 font-mono text-[12px] leading-relaxed text-on-surface-variant">
              <p>[{sourceRule.sourceDoc} — {sourceRule.sourcePage}]</p>
              <p className="mt-2 text-on-surface">
                … {sourceRule.field}: {conditionText(sourceRule)} …
              </p>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Clause excerpt linked to this rule. The full document stays in Step 2 (Tender documents).
            </p>
          </div>
        )}
      </Modal>

      {/* Remove */}
      <Modal
        open={!!removeRule}
        onClose={() => setRemoveRule(null)}
        icon="warning"
        size="md"
        title="Remove rule?"
        description={removeRule?.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveRule(null)}>
              Keep rule
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (removeRule) setRules((all) => all.filter((r) => r.id !== removeRule.id));
                setToast('Rule removed');
                setRemoveRule(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">This condition will no longer be evaluated. To pause it temporarily, disable it instead.</p>
      </Modal>

      {toast && <Toast message={toast} />}
    </OfficerPortalShell>
  );
}
