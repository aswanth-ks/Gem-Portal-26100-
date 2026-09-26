// Procurement Officer — Create Tender, Step 3: Compliance Configuration.
// Replaces the separate O07 (bidder requirements) and O08 (evaluation rules)
// steps with one supervised review: the system extracts requirements and
// rules from the uploaded documents; the officer reviews flagged items, edits
// exceptions, adds anything missing and confirms. AI output is never
// authoritative — items are "AI suggested" until "Officer reviewed".
//
// Same header, stepper, card and action bar as the other wizard steps.
// Tabs, "Review now" filter, review/edit side drawer, remove and
// continue-with-open-items dialogs are React state.
//
// TODO: GET /api/officer/tenders/drafts/:ref/compliance (extraction output)
// and persist officer changes.

import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import {
  Button,
  Callout,
  Card,
  DescriptionList,
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

type Origin = 'ai' | 'reviewed' | 'officer';
type ReqType = 'Document' | 'Eligibility' | 'Technical' | 'Financial';
type ConditionType = 'gte' | 'lte' | 'eq' | 'contains' | 'required' | 'valid_on_bid_date' | 'exists' | 'matches';
type Evaluation = 'Automatic' | 'Rule-based';

interface Base {
  id: string;
  name: string;
  sourceDoc: string;
  sourcePage: string;
  origin: Origin;
  flag?: string; // reason the item needs officer review
}
interface Req extends Base {
  kind: 'req';
  type: ReqType;
  mandatory: boolean;
}
interface Rule extends Base {
  kind: 'rule';
  condition: ConditionType;
  value: string;
  unit: string;
  evaluation: Evaluation;
  active: boolean;
}
type Item = Req | Rule;

const SOURCE_DOCS = ['Tender Document.pdf', 'Technical Specification.pdf', 'Financial Terms.xlsx', 'Special Conditions.docx'];

const CONDITIONS: { id: ConditionType; label: string; needsValue: boolean }[] = [
  { id: 'gte', label: 'Greater than or equal to', needsValue: true },
  { id: 'lte', label: 'Less than or equal to', needsValue: true },
  { id: 'eq', label: 'Equal to', needsValue: true },
  { id: 'contains', label: 'Contains', needsValue: true },
  { id: 'required', label: 'Required', needsValue: false },
  { id: 'valid_on_bid_date', label: 'Valid on bid date', needsValue: false },
  { id: 'exists', label: 'Exists', needsValue: false },
  { id: 'matches', label: 'Matches specified value', needsValue: true },
];

const r = (id: string, name: string, type: ReqType, mandatory: boolean, sourceDoc: string, sourcePage: string, extra: Partial<Req> = {}): Req => ({ kind: 'req', id, name, type, mandatory, sourceDoc, sourcePage, origin: 'ai', ...extra });
const u = (id: string, name: string, condition: ConditionType, value: string, unit: string, sourceDoc: string, sourcePage: string, evaluation: Evaluation = 'Automatic', extra: Partial<Rule> = {}): Rule => ({ kind: 'rule', id, name, condition, value, unit, sourceDoc, sourcePage, evaluation, active: true, origin: 'ai', ...extra });

const INITIAL_REQS: Req[] = [
  r('q1', 'PAN Certificate', 'Document', true, 'Tender Document.pdf', '12'),
  r('q2', 'GST Registration', 'Document', true, 'Tender Document.pdf', '12'),
  r('q3', 'Average Annual Turnover ≥ ₹50 Lakhs', 'Eligibility', true, 'Tender Document.pdf', '18'),
  r('q4', 'OEM Authorization', 'Document', true, 'Technical Specification.pdf', '20', {
    flag: 'Listed in the Technical Specification but not in the Tender Document eligibility list. Confirm it applies to all bidders.',
  }),
  r('q5', 'Relevant Experience — 3 Years', 'Eligibility', true, 'Tender Document.pdf', '19'),
  r('q6', 'Udyam Registration', 'Document', false, 'Tender Document.pdf', '13'),
  r('q7', 'Signed Bidder Declaration', 'Document', true, '', '', { origin: 'officer' }),
];

const INITIAL_RULES: Rule[] = [
  u('e1', 'Camera Resolution', 'gte', '4K', '', 'Technical Specification.pdf', '7'),
  u('e2', 'Night Vision', 'required', '', '', 'Technical Specification.pdf', '7'),
  u('e3', 'Ingress Protection', 'gte', 'IP66', '', 'Technical Specification.pdf', '8'),
  u('e4', 'Storage Capacity', 'gte', '30', 'days', 'Technical Specification.pdf', '8'),
  u('e5', 'Warranty', 'gte', '3', 'years', 'Technical Specification.pdf', '9'),
  u('e6', 'Average Annual Turnover', 'gte', '₹50', 'Lakhs', 'Tender Document.pdf', '18'),
  u('e7', 'OEM Authorization', 'valid_on_bid_date', '', '', 'Tender Document.pdf', '20', 'Automatic', {
    flag: 'The clause does not state which date validity is checked against. Confirm evaluation against the bid submission date.',
  }),
  u('e8', 'Bid Validity', 'matches', 'As specified', '', 'Tender Document.pdf', '21', 'Rule-based'),
];

function conditionText(x: Pick<Rule, 'condition' | 'value' | 'unit'>) {
  const v = [x.value, x.unit].filter(Boolean).join(' ');
  return {
    gte: `≥ ${v}`,
    lte: `≤ ${v}`,
    eq: `= ${v}`,
    contains: `Contains “${v}”`,
    required: 'Required',
    valid_on_bid_date: 'Valid on bid date',
    exists: 'Must exist',
    matches: v,
  }[x.condition];
}

function sourceText(x: Base) {
  return x.sourceDoc ? `${x.sourceDoc.replace(/\.(pdf|xlsx|docx)$/i, '')}, Pg. ${x.sourcePage}` : null;
}

function OriginLabel({ origin }: { origin: Origin }) {
  const map = {
    ai: { icon: 'auto_awesome', label: 'AI suggested' },
    reviewed: { icon: 'task_alt', label: 'Officer reviewed' },
    officer: { icon: 'person', label: 'Officer added' },
  }[origin];
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-on-surface-variant">
      <Icon name={map.icon} size="xs" />
      {map.label}
    </span>
  );
}

function ItemStatus({ item }: { item: Item }) {
  if (item.kind === 'rule' && !item.active) return <StatusBadge tone="neutral">Disabled</StatusBadge>;
  if (item.flag) return <StatusBadge tone="warning" icon="flag">Needs review</StatusBadge>;
  return <StatusBadge tone="success">Ready</StatusBadge>;
}

type Tab = 'req' | 'rule';
type Drawer = { item: Item; mode: 'view' | 'edit' } | { item: Item; mode: 'new' } | null;

const NEW_REQ: Req = { kind: 'req', id: '', name: '', type: 'Document', mandatory: true, sourceDoc: '', sourcePage: '', origin: 'officer' };
const NEW_RULE: Rule = { kind: 'rule', id: '', name: '', condition: 'gte', value: '', unit: '', sourceDoc: '', sourcePage: '', evaluation: 'Automatic', active: true, origin: 'officer' };

export function ComplianceConfigPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('req');
  const [reqs, setReqs] = useState<Req[]>(INITIAL_REQS);
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [form, setForm] = useState<Item>(NEW_REQ);
  const [touched, setTouched] = useState(false);
  const [removeItem, setRemoveItem] = useState<Item | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);
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

  const flagged = [...reqs, ...rules].filter((x) => x.flag && !(x.kind === 'rule' && !x.active));
  const flaggedIn = (t: Tab) => flagged.filter((x) => x.kind === t).length;
  const aiReqs = reqs.filter((x) => x.origin !== 'officer').length;
  const aiRules = rules.filter((x) => x.origin !== 'officer').length;
  const list: Item[] = (tab === 'req' ? reqs : rules).filter((x) => !flaggedOnly || (x.flag && !(x.kind === 'rule' && !x.active)));

  function update(item: Item, patch: Partial<Item>) {
    if (item.kind === 'req') setReqs((all) => all.map((x) => (x.id === item.id ? ({ ...x, ...patch } as Req) : x)));
    else setRules((all) => all.map((x) => (x.id === item.id ? ({ ...x, ...patch } as Rule) : x)));
  }

  function accept(item: Item) {
    update(item, { flag: undefined, origin: item.origin === 'officer' ? 'officer' : 'reviewed' });
    setDrawer(null);
    setToast(`${item.name} accepted`);
  }

  function openNew() {
    const blank = tab === 'req' ? { ...NEW_REQ } : { ...NEW_RULE };
    setForm(blank);
    setTouched(false);
    setDrawer({ item: blank, mode: 'new' });
  }

  function startEdit(item: Item) {
    setForm({ ...item });
    setTouched(false);
    setDrawer({ item, mode: 'edit' });
  }

  const needsValue = form.kind === 'rule' && CONDITIONS.find((c) => c.id === form.condition)!.needsValue;
  const errors = touched
    ? {
        name: !form.name.trim() ? 'Name is required' : undefined,
        value: needsValue && form.kind === 'rule' && !form.value.trim() ? 'Expected value is required for this condition' : undefined,
        source: !form.sourceDoc ? 'Link the source document' : undefined,
      }
    : {};

  function saveForm() {
    setTouched(true);
    if (!form.name.trim() || !form.sourceDoc || (form.kind === 'rule' && needsValue && !form.value.trim())) return;
    if (drawer?.mode === 'new') {
      const created = { ...form, id: `n-${Date.now()}`, origin: 'officer' as Origin, flag: undefined };
      if (created.kind === 'req') setReqs((all) => [...all, created]);
      else setRules((all) => [...all, created]);
      setToast(`${form.name} added`);
    } else if (drawer) {
      // Editing is an officer review: clears the flag.
      update(drawer.item, { ...form, flag: undefined, origin: drawer.item.origin === 'officer' ? 'officer' : 'reviewed' });
      setToast(`${form.name} updated`);
    }
    setDrawer(null);
  }

  function goReview() {
    const firstTab: Tab = flaggedIn('req') ? 'req' : 'rule';
    setTab(firstTab);
    setFlaggedOnly(true);
  }

  const kindLabel = (t: Tab) => (t === 'req' ? 'requirement' : 'rule');

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-8 pb-28">
        <PageHeader
          breadcrumbs={[
            { label: 'Tenders', to: '/officer/tenders' },
            { label: 'CPCL/PROC/2026/041', to: CREATE_TENDER_ROUTES.info },
            { label: 'Compliance configuration' },
          ]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{DRAFT_REF}</Tag>
              <StatusBadge tone="info" icon="task_alt">AI analysis complete</StatusBadge>
            </>
          }
          title="Compliance configuration"
          description="Review the requirements and evaluation rules identified from your tender documents."
          meta={
            <>
              <span className="num"><strong className="font-semibold text-on-surface">{reqs.length}</strong> bidder requirements</span>
              <span aria-hidden="true">·</span>
              <span className="num"><strong className="font-semibold text-on-surface">{rules.length}</strong> evaluation rules</span>
              <span aria-hidden="true">·</span>
              <span className={cn('num', flagged.length ? 'font-semibold text-warning-on-container' : 'text-success-on-container')}>
                {flagged.length ? `${flagged.length} ${flagged.length === 1 ? 'item needs' : 'items need'} review` : 'All items reviewed'}
              </span>
              <span aria-hidden="true">·</span>
              <span>4 source documents</span>
            </>
          }
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={3} />
        </Card>

        <Callout tone="info" icon="fact_check" title="Tender analysis complete">
          Requirements and evaluation rules were extracted from the uploaded tender documents. Review the flagged items before publishing.
          <span className="mt-1 block text-[12px] text-on-surface-variant">Each item is linked to its source document and page.</span>
        </Callout>

        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-col gap-4 px-6 pt-5 lg:flex-row lg:items-end lg:justify-between">
            <Tabs
              ariaLabel="Configuration type"
              value={tab}
              onChange={(id) => setTab(id as Tab)}
              items={[
                { id: 'req', label: 'Bidder requirements', count: reqs.length, countTone: flaggedIn('req') ? 'warning' : undefined },
                { id: 'rule', label: 'Evaluation rules', count: rules.length, countTone: flaggedIn('rule') ? 'warning' : undefined },
              ]}
            />
            <div className="pb-3">
              {flagged.length > 0 ? (
                <div className="flex items-center gap-3 rounded-control border border-warning-border bg-warning-container/50 py-1.5 pl-3.5 pr-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-warning-on-container">
                    <Icon name="flag" size="sm" />
                    {flagged.length} {flagged.length === 1 ? 'item needs' : 'items need'} review
                  </span>
                  <Button size="sm" variant={flaggedOnly ? 'ghost' : 'secondary'} onClick={() => (flaggedOnly ? setFlaggedOnly(false) : goReview())}>
                    {flaggedOnly ? 'Show all' : 'Review now'}
                  </Button>
                </div>
              ) : (
                <StatusBadge tone="success" icon="check_circle">All items reviewed</StatusBadge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-3">
            <span className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Icon name="auto_awesome" size="sm" className="text-secondary" />
              AI identified {tab === 'req' ? aiReqs : aiRules} {tab === 'req' ? 'requirements' : 'evaluation rules'}
              {flaggedOnly && <Tag>Showing flagged only</Tag>}
            </span>
            <Button size="sm" variant="secondary" leftIcon="add" onClick={openNew}>
              Add {kindLabel(tab)}
            </Button>
          </div>

          <Table minWidth={920}>
            <THead>
              <tr>
                <Th>{tab === 'req' ? 'Requirement' : 'Rule'}</Th>
                <Th>{tab === 'req' ? 'Type' : 'Condition'}</Th>
                {tab === 'req' && <Th>Mandatory</Th>}
                <Th>Source</Th>
                {tab === 'rule' && <Th>Evaluation</Th>}
                <Th>Status</Th>
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {list.length === 0 ? (
                <tr>
                  <Td colSpan={6} className="py-12 text-center text-on-surface-variant">
                    {flaggedOnly ? `No flagged ${kindLabel(tab)}s on this tab.` : `No ${kindLabel(tab)}s yet.`}
                  </Td>
                </tr>
              ) : (
                list.map((item) => (
                  <Tr
                    key={item.id}
                    highlight={item.flag && !(item.kind === 'rule' && !item.active) ? 'warning' : undefined}
                    className={cn('cursor-pointer', item.kind === 'rule' && !item.active && 'opacity-60')}
                    onClick={() => setDrawer({ item, mode: 'view' })}
                  >
                    <Td>
                      <button type="button" className="text-left font-semibold text-on-surface hover:text-secondary focus-ring rounded-sm" onClick={(e) => { e.stopPropagation(); setDrawer({ item, mode: 'view' }); }}>
                        {item.name}
                      </button>
                      <div className="mt-0.5">
                        <OriginLabel origin={item.origin} />
                      </div>
                    </Td>
                    {item.kind === 'req' ? (
                      <>
                        <Td>
                          <Tag>{item.type}</Tag>
                        </Td>
                        <Td>{item.mandatory ? <StatusBadge status="mandatory" /> : <StatusBadge status="conditional" />}</Td>
                      </>
                    ) : (
                      <Td>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium">
                          {item.condition === 'valid_on_bid_date' && <Icon name="event_available" size="sm" className="text-secondary" />}
                          {conditionText(item)}
                        </span>
                      </Td>
                    )}
                    <Td className="text-body-sm">
                      {sourceText(item) ? (
                        <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
                          <Icon name="description" size="sm" />
                          {sourceText(item)}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">Officer added</span>
                      )}
                    </Td>
                    {item.kind === 'rule' && (
                      <Td>
                        <Tag>{item.evaluation}</Tag>
                      </Td>
                    )}
                    <Td>
                      <ItemStatus item={item} />
                    </Td>
                    <Td align="right">
                      <Icon name="chevron_right" size="md" className="text-outline" />
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
          <Button rightIcon="arrow_forward" onClick={() => (flagged.length ? setWarnOpen(true) : navigate(CREATE_TENDER_ROUTES.review))}>
            Continue to review & publish
          </Button>
        }
      />

      {/* Review / edit drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-navy-900/50 backdrop-blur-[2px] animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(null)}>
          <aside role="dialog" aria-modal="true" aria-labelledby="cc-drawer-title" className="flex h-full w-full max-w-[480px] flex-col bg-surface-container-lowest shadow-overlay animate-slide-in-right">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-info-container text-secondary">
                  <Icon name={drawer.mode === 'view' ? 'fact_check' : drawer.mode === 'new' ? 'add_task' : 'edit'} size="lg" />
                </span>
                <div>
                  <h2 id="cc-drawer-title" className="text-headline-md text-on-surface">
                    {drawer.mode === 'new' ? 'Add' : drawer.mode === 'edit' ? 'Edit' : 'Review'} {drawer.item.kind === 'req' ? 'requirement' : 'evaluation rule'}
                  </h2>
                  {drawer.mode !== 'new' && <p className="mt-0.5 text-body-sm text-on-surface-variant">{drawer.item.name}</p>}
                </div>
              </div>
              <IconButton icon="close" aria-label="Close" onClick={() => setDrawer(null)} />
            </div>

            {drawer.mode === 'view' ? (
              <>
                <div className="flex flex-1 flex-col gap-5 overflow-y-auto scroll-thin px-6 py-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <ItemStatus item={drawer.item} />
                    <OriginLabel origin={drawer.item.origin} />
                  </div>
                  {drawer.item.flag && (
                    <Callout tone="warning" icon="flag" title="Why this needs review">
                      {drawer.item.flag}
                    </Callout>
                  )}
                  <DescriptionList
                    items={
                      [
                        { label: drawer.item.kind === 'req' ? 'Requirement' : 'Rule', value: drawer.item.name },
                        ...(drawer.item.kind === 'req'
                          ? [
                              { label: 'Type', value: drawer.item.type },
                              { label: 'Mandatory / conditional', value: drawer.item.mandatory ? 'Mandatory' : 'Conditional' },
                            ]
                          : [
                              { label: 'Condition', value: CONDITIONS.find((c) => c.id === (drawer.item as Rule).condition)!.label },
                              { label: 'Expected value', value: (drawer.item as Rule).value ? [(drawer.item as Rule).value, (drawer.item as Rule).unit].filter(Boolean).join(' ') : '—' },
                              { label: 'Evaluation method', value: (drawer.item as Rule).evaluation },
                            ]),
                        { label: 'Source document', value: drawer.item.sourceDoc || 'Officer added (no source)' },
                        { label: 'Source page', value: drawer.item.sourcePage ? `Page ${drawer.item.sourcePage}` : '—' },
                      ] as { label: string; value: ReactNode }[]
                    }
                  />
                  {drawer.item.kind === 'rule' && drawer.item.condition === 'valid_on_bid_date' && (
                    <Callout tone="info" icon="event_available" title="Valid on bid date">
                      The system checks whether the evidence was valid on the relevant bid/tender date, not simply today.
                    </Callout>
                  )}
                  {drawer.item.sourceDoc && (
                    <div className="rounded-card border border-outline-variant bg-surface-container-low p-4">
                      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Source</div>
                      <div className="font-mono text-[12px] text-on-surface">
                        {drawer.item.sourceDoc} — Page {drawer.item.sourcePage}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2.5 border-t border-outline-variant bg-surface-container-low px-6 py-4">
                  <Button variant="ghost" leftIcon="delete" className="text-danger" onClick={() => setRemoveItem(drawer.item)}>
                    Remove
                  </Button>
                  <div className="flex gap-2.5">
                    {drawer.item.kind === 'rule' && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const it = drawer.item as Rule;
                          update(it, { active: !it.active });
                          setToast(`${it.name} ${it.active ? 'disabled' : 'enabled'}`);
                          setDrawer(null);
                        }}
                      >
                        {drawer.item.active ? 'Disable' : 'Enable'}
                      </Button>
                    )}
                    <Button variant="secondary" leftIcon="edit" onClick={() => startEdit(drawer.item)}>
                      Edit
                    </Button>
                    <Button leftIcon="check" onClick={() => accept(drawer.item)}>
                      Accept
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-1 flex-col gap-5 overflow-y-auto scroll-thin px-6 py-6">
                  <Field label={form.kind === 'req' ? 'Requirement name' : 'Rule'} htmlFor="cc-name" required error={errors.name}>
                    <Input id="cc-name" value={form.name} state={errors.name ? 'error' : 'default'} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={form.kind === 'req' ? 'e.g. ISO 9001:2015 Certificate' : 'e.g. Camera Resolution'} />
                  </Field>
                  {form.kind === 'req' ? (
                    <>
                      <Field label="Type" htmlFor="cc-type">
                        <Select id="cc-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ReqType })}>
                          {(['Document', 'Eligibility', 'Technical', 'Financial'] as ReqType[]).map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </Select>
                      </Field>
                      <div className="flex items-center justify-between gap-4 rounded-card border border-outline-variant p-4">
                        <div>
                          <div className="text-[14px] font-semibold text-on-surface">Mandatory</div>
                          <div className="text-body-sm text-on-surface-variant">No = conditional (applies only when relevant)</div>
                        </div>
                        <YesNo label="Mandatory" value={form.mandatory} onChange={(v) => setForm({ ...form, mandatory: v })} />
                      </div>
                    </>
                  ) : (
                    <>
                      <Field
                        label="Condition"
                        htmlFor="cc-cond"
                        required
                        helper={form.condition === 'valid_on_bid_date' ? 'Evidence is checked against the bid/tender date, not today. Use for certificates, registrations, licences and OEM authorizations.' : undefined}
                      >
                        <Select id="cc-cond" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as ConditionType })}>
                          {CONDITIONS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      {needsValue && (
                        <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-4">
                          <Field label="Expected value" htmlFor="cc-val" required error={errors.value}>
                            <Input id="cc-val" value={form.value} state={errors.value ? 'error' : 'default'} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="e.g. 4K" />
                          </Field>
                          <Field label="Unit" htmlFor="cc-unit" aside={<span className="text-[12px] text-on-surface-variant">Optional</span>}>
                            <Input id="cc-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="days" />
                          </Field>
                        </div>
                      )}
                      <Field label="Evaluation method" htmlFor="cc-eval">
                        <Select id="cc-eval" value={form.evaluation} onChange={(e) => setForm({ ...form, evaluation: e.target.value as Evaluation })}>
                          <option>Automatic</option>
                          <option>Rule-based</option>
                        </Select>
                      </Field>
                    </>
                  )}
                  <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-4">
                    <Field label="Source document" htmlFor="cc-src" required error={errors.source}>
                      <Select id="cc-src" value={form.sourceDoc} state={errors.source ? 'error' : 'default'} onChange={(e) => setForm({ ...form, sourceDoc: e.target.value })}>
                        <option value="">Select document…</option>
                        {SOURCE_DOCS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Page" htmlFor="cc-page">
                      <Input id="cc-page" inputMode="numeric" value={form.sourcePage} onChange={(e) => setForm({ ...form, sourcePage: e.target.value })} placeholder="12" />
                    </Field>
                  </div>
                  {form.kind === 'rule' && needsValue && form.value && (
                    <div className="rounded-card bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
                      Preview: <span className="font-semibold text-on-surface">{form.name || 'Rule'}</span> {conditionText(form)}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2.5 border-t border-outline-variant bg-surface-container-low px-6 py-4">
                  <Button variant="secondary" onClick={() => (drawer.mode === 'edit' ? setDrawer({ item: drawer.item, mode: 'view' }) : setDrawer(null))}>
                    Cancel
                  </Button>
                  <Button leftIcon="check" onClick={saveForm}>
                    Save
                  </Button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      <Modal
        open={!!removeItem}
        onClose={() => setRemoveItem(null)}
        icon="warning"
        size="md"
        title={`Remove ${removeItem?.kind === 'rule' ? 'rule' : 'requirement'}?`}
        description={removeItem?.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveItem(null)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (removeItem?.kind === 'req') setReqs((all) => all.filter((x) => x.id !== removeItem.id));
                if (removeItem?.kind === 'rule') setRules((all) => all.filter((x) => x.id !== removeItem.id));
                setToast(`${removeItem?.name} removed`);
                setRemoveItem(null);
                setDrawer(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">
          {removeItem?.kind === 'rule' ? 'This condition will no longer be evaluated. To pause it, disable it instead.' : 'Bidders will no longer be asked for this. You can add it again later.'}
        </p>
      </Modal>

      <Modal
        open={warnOpen}
        onClose={() => setWarnOpen(false)}
        icon="flag"
        size="md"
        title={`${flagged.length} ${flagged.length === 1 ? 'item still requires' : 'items still require'} review before publication`}
        footer={
          <>
            <Button variant="secondary" onClick={() => navigate(CREATE_TENDER_ROUTES.review)}>
              Continue anyway
            </Button>
            <Button
              onClick={() => {
                setWarnOpen(false);
                goReview();
              }}
            >
              Review items
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-2">
          {flagged.map((x) => (
            <li key={x.id} className="flex items-center gap-2 text-[14px] text-on-surface">
              <Icon name="flag" size="sm" className="text-warning" />
              {x.name}
              <span className="text-body-sm text-on-surface-variant">· {x.kind === 'req' ? 'Requirement' : 'Evaluation rule'}</span>
            </li>
          ))}
        </ul>
      </Modal>

      {toast && <Toast message={toast} />}
    </OfficerPortalShell>
  );
}
