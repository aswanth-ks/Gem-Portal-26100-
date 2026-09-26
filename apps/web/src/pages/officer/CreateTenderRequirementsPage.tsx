// Procurement Officer — Create Tender, Step 3: Bidder Requirements. Defines
// only WHAT bidders must submit (documents and information). Scoring and
// evaluation rules belong to Step 4 (Technical & financial rules).
//
// The system has already read the Step 2 documents: ?mode=ai (default) opens
// with AI-suggested requirements, each linked to its source page; ?mode=manual
// starts empty. The officer reviews flagged items, edits, adds or removes.
// Items are "AI suggested" until "Officer reviewed"; officer additions are
// "Officer added". Same header, stepper, cards and action bar as other steps.
//
// TODO: GET /api/officer/tenders/drafts/:ref/requirements/suggestions and
// persist requirements. "Continue" routes to Step 4.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import {
  Button,
  Callout,
  Card,
  DescriptionList,
  EmptyState,
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
  Tag,
  Toast,
  Tr,
} from '@/components/primitives';
import { cn } from '@/utils/cn';
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, DRAFT_REF } from './createTender';
import { YesNo } from './CreateTenderInfoPage';

type Origin = 'ai' | 'reviewed' | 'officer';
type ReqType = 'Document' | 'Financial' | 'Eligibility' | 'Statutory' | 'Other';

interface Requirement {
  id: string;
  name: string;
  type: ReqType;
  mandatory: boolean;
  conditional: boolean;
  description: string;
  sourceDoc: string;
  sourcePage: string;
  origin: Origin;
  flag?: string; // why the officer should look at it
}

const TYPES: ReqType[] = ['Document', 'Financial', 'Eligibility', 'Statutory', 'Other'];
const SOURCE_DOCS = ['Tender Document.pdf', 'Technical Specification.pdf', 'Financial Terms.xlsx', 'Special Conditions.docx'];

const ai = (id: string, name: string, type: ReqType, sourceDoc: string, sourcePage: string, description: string, extra: Partial<Requirement> = {}): Requirement => ({
  id,
  name,
  type,
  mandatory: true,
  conditional: false,
  description,
  sourceDoc,
  sourcePage,
  origin: 'ai',
  ...extra,
});

const AI_REQUIREMENTS: Requirement[] = [
  ai('q1', 'PAN Certificate', 'Document', 'Tender Document.pdf', '12', 'Self-attested copy of the bidder’s Permanent Account Number card.'),
  ai('q2', 'GST Registration Certificate', 'Document', 'Tender Document.pdf', '12', 'Valid GST registration certificate for the bidding entity.'),
  ai('q3', 'Average Annual Turnover / Financial Statement', 'Financial', 'Tender Document.pdf', '18', 'Audited financial statements or CA certificate for the last 3 financial years.'),
  ai('q4', 'OEM Authorization', 'Document', 'Technical Specification.pdf', '20', 'Manufacturer authorization for the quoted camera and NVR models.', {
    flag: 'Listed in the Technical Specification but not in the Tender Document eligibility list. Confirm it applies to all bidders.',
  }),
  ai('q5', 'Relevant Experience Certificate', 'Document', 'Tender Document.pdf', '19', 'Work order and completion certificate for similar CCTV/surveillance work.'),
  ai('q6', 'Udyam Registration', 'Document', 'Tender Document.pdf', '13', 'Required only from MSE bidders claiming EMD exemption or purchase preference.', { mandatory: false, conditional: true }),
  ai('q7', 'Technical Compliance Statement', 'Document', 'Technical Specification.pdf', '11', 'Clause-by-clause compliance sheet against the technical specification.'),
];

const BLANK: Requirement = { id: '', name: '', type: 'Document', mandatory: true, conditional: false, description: '', sourceDoc: '', sourcePage: '', origin: 'officer' };

function OriginLabel({ origin }: { origin: Origin }) {
  const m = { ai: ['auto_awesome', 'AI suggested'], reviewed: ['task_alt', 'Officer reviewed'], officer: ['person', 'Officer added'] }[origin];
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-on-surface-variant">
      <Icon name={m[0]} size="xs" />
      {m[1]}
    </span>
  );
}

function Requiredness({ r }: { r: Requirement }) {
  if (r.conditional) return <StatusBadge status="conditional" />;
  if (r.mandatory) return <StatusBadge status="mandatory" />;
  return <StatusBadge tone="neutral">Optional</StatusBadge>;
}

function sourceText(r: Requirement) {
  return r.sourceDoc ? `${r.sourceDoc.replace(/\.(pdf|xlsx|docx)$/i, '')}, Pg. ${r.sourcePage || '—'}` : null;
}

type Drawer = { item: Requirement; mode: 'view' | 'edit' | 'new' } | null;

export function CreateTenderRequirementsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const manual = params.get('mode') === 'manual';
  const [reqs, setReqs] = useState<Requirement[]>(manual ? [] : AI_REQUIREMENTS);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [form, setForm] = useState<Requirement>(BLANK);
  const [touched, setTouched] = useState(false);
  const [removeReq, setRemoveReq] = useState<Requirement | null>(null);
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

  const flagged = reqs.filter((r) => r.flag);
  const identified = reqs.filter((r) => r.origin !== 'officer').length;
  const ready = reqs.length - flagged.length;
  const rows = flaggedOnly ? flagged : reqs;

  function patch(id: string, p: Partial<Requirement>) {
    setReqs((all) => all.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  function accept(r: Requirement) {
    patch(r.id, { flag: undefined, origin: r.origin === 'officer' ? 'officer' : 'reviewed' });
    setDrawer(null);
    setToast(`${r.name} accepted`);
    if (flagged.length === 1) setFlaggedOnly(false);
  }

  function openNew() {
    setForm(BLANK);
    setTouched(false);
    setDrawer({ item: BLANK, mode: 'new' });
  }

  function startEdit(r: Requirement) {
    setForm({ ...r });
    setTouched(false);
    setDrawer({ item: r, mode: 'edit' });
  }

  const errors = touched ? { name: !form.name.trim() ? 'Requirement name is required' : undefined } : {};

  function save() {
    setTouched(true);
    if (!form.name.trim()) return;
    if (drawer?.mode === 'new') {
      setReqs((all) => [...all, { ...form, name: form.name.trim(), id: `n-${Date.now()}`, origin: 'officer', flag: undefined }]);
      setToast(`${form.name.trim()} added`);
    } else if (drawer) {
      // Any officer edit counts as review and clears the flag.
      patch(drawer.item.id, { ...form, flag: undefined, origin: drawer.item.origin === 'officer' ? 'officer' : 'reviewed' });
      setToast(`${form.name} updated`);
    }
    setDrawer(null);
  }

  function reviewFlagged() {
    setFlaggedOnly(true);
    if (flagged.length === 1) setDrawer({ item: flagged[0], mode: 'view' });
  }

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-6 pb-28">
        <PageHeader
          breadcrumbs={[
            { label: 'Tenders', to: '/officer/tenders' },
            { label: 'CPCL/PROC/2026/041', to: CREATE_TENDER_ROUTES.info },
            { label: 'Bidder requirements' },
          ]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{DRAFT_REF}</Tag>
            </>
          }
          title="Bidder requirements"
          description="Review the documents and information bidders must submit for this tender."
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={3} />
        </Card>

        {/* AI extraction summary */}
        {!manual && (
          <Card padding="lg">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-info-container text-secondary">
                  <Icon name="fact_check" size="lg" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-headline-sm font-semibold text-on-surface">Tender documents analyzed</h2>
                    <StatusBadge tone="info" icon="task_alt">AI extraction complete</StatusBadge>
                  </div>
                  <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
                    AI identified {identified} bidder requirements from the uploaded tender documents. Review the extracted requirements before continuing.
                  </p>
                  <p className="mt-1 text-[12px] text-on-surface-variant">Each requirement is linked to its source document and page.</p>
                </div>
              </div>
              <dl className="grid shrink-0 grid-cols-4 divide-x divide-outline-variant rounded-card border border-outline-variant">
                {[
                  { label: 'Documents analyzed', value: 4 },
                  { label: 'Identified', value: identified },
                  { label: 'Ready', value: ready, tone: 'text-success-on-container' },
                  { label: 'Needs review', value: flagged.length, tone: flagged.length ? 'text-warning-on-container' : undefined },
                ].map((s) => (
                  <div key={s.label} className="px-4 py-3">
                    <dt className="text-[12px] text-on-surface-variant">{s.label}</dt>
                    <dd className={cn('num text-headline-sm font-semibold text-on-surface', s.tone)}>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card>
        )}

        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-headline-sm font-semibold text-on-surface">What bidders must submit</h2>
              <span className="text-body-sm text-on-surface-variant">{reqs.length} requirements</span>
              {flaggedOnly && (
                <button type="button" onClick={() => setFlaggedOnly(false)} className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-0.5 text-[12px] text-on-surface-variant hover:text-on-surface">
                  Showing flagged only <Icon name="close" size="xs" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {flagged.length > 0 && !flaggedOnly && (
                <div className="flex items-center gap-3 rounded-control border border-warning-border bg-warning-container/50 py-1 pl-3 pr-1">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-warning-on-container">
                    <Icon name="flag" size="sm" />
                    {flagged.length} {flagged.length === 1 ? 'item needs' : 'items need'} review
                  </span>
                  <Button size="sm" variant="secondary" onClick={reviewFlagged}>
                    Review
                  </Button>
                </div>
              )}
              <Button size="sm" leftIcon="add" onClick={openNew}>
                Add requirement
              </Button>
            </div>
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
            <Table minWidth={920}>
              <THead>
                <tr>
                  <Th>Document / requirement</Th>
                  <Th>Type</Th>
                  <Th>Mandatory</Th>
                  <Th>Source</Th>
                  <Th>Status</Th>
                  <Th align="right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <Tr key={r.id} highlight={r.flag ? 'warning' : undefined} className="cursor-pointer" onClick={() => setDrawer({ item: r, mode: 'view' })}>
                    <Td>
                      <button
                        type="button"
                        className="focus-ring rounded-sm text-left font-semibold text-on-surface hover:text-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawer({ item: r, mode: 'view' });
                        }}
                      >
                        {r.name}
                      </button>
                      <div className="mt-0.5">
                        <OriginLabel origin={r.origin} />
                      </div>
                    </Td>
                    <Td>
                      <Tag>{r.type}</Tag>
                    </Td>
                    <Td>
                      <Requiredness r={r} />
                    </Td>
                    <Td className="text-body-sm">
                      <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
                        <Icon name="description" size="sm" />
                        {sourceText(r) ?? 'Officer added'}
                      </span>
                    </Td>
                    <Td>{r.flag ? <StatusBadge tone="warning" icon="flag">Needs review</StatusBadge> : <StatusBadge tone="success">Ready</StatusBadge>}</Td>
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
          This step sets what bidders must submit. How each item is evaluated is set in Step 4 — Technical & financial rules.
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
          <Button rightIcon="arrow_forward" disabled={reqs.length === 0} onClick={() => (flagged.length ? setWarnOpen(true) : navigate(CREATE_TENDER_ROUTES.rules))}>
            Continue to technical & financial rules
          </Button>
        }
      />

      {/* Review / edit / add drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-navy-900/50 backdrop-blur-[2px] animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(null)}>
          <aside role="dialog" aria-modal="true" aria-labelledby="rq-drawer-title" className="flex h-full w-full max-w-[480px] flex-col bg-surface-container-lowest shadow-overlay animate-slide-in-right">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-info-container text-secondary">
                  <Icon name={drawer.mode === 'view' ? 'fact_check' : drawer.mode === 'new' ? 'playlist_add' : 'edit'} size="lg" />
                </span>
                <div>
                  <h2 id="rq-drawer-title" className="text-headline-md text-on-surface">
                    {drawer.mode === 'view' ? 'Review requirement' : drawer.mode === 'edit' ? 'Edit requirement' : 'Add requirement'}
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
                    {drawer.item.flag ? <StatusBadge tone="warning" icon="flag">Needs review</StatusBadge> : <StatusBadge tone="success">Ready</StatusBadge>}
                    <OriginLabel origin={drawer.item.origin} />
                  </div>
                  {drawer.item.flag && (
                    <Callout tone="warning" icon="flag" title="Why this needs review">
                      {drawer.item.flag}
                    </Callout>
                  )}
                  <DescriptionList
                    items={[
                      { label: 'Requirement', value: drawer.item.name },
                      { label: 'Type', value: drawer.item.type },
                      { label: 'Mandatory / conditional', value: drawer.item.conditional ? 'Conditional' : drawer.item.mandatory ? 'Mandatory' : 'Optional' },
                      { label: 'Description', value: drawer.item.description || '—' },
                      { label: 'Source document', value: drawer.item.sourceDoc || 'Officer added (no source)' },
                      { label: 'Source page / section', value: drawer.item.sourcePage ? `Page ${drawer.item.sourcePage}` : '—' },
                    ]}
                  />
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
                  <Button variant="ghost" leftIcon="delete" className="text-danger" onClick={() => setRemoveReq(drawer.item)}>
                    Remove
                  </Button>
                  <div className="flex gap-2.5">
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
                  <Field label="Requirement name" htmlFor="rq-name" required error={errors.name}>
                    <Input id="rq-name" value={form.name} state={errors.name ? 'error' : 'default'} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. ISO 9001:2015 Certificate" />
                  </Field>
                  <Field label="Type" htmlFor="rq-type">
                    <Select id="rq-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ReqType })}>
                      {TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <div className="divide-y divide-outline-variant rounded-card border border-outline-variant">
                    <div className="flex items-center justify-between gap-4 p-4">
                      <div>
                        <div className="text-[14px] font-semibold text-on-surface">Mandatory</div>
                        <div className="text-body-sm text-on-surface-variant">Every bidder must submit this</div>
                      </div>
                      <YesNo label="Mandatory" value={form.mandatory} onChange={(v) => setForm({ ...form, mandatory: v, conditional: v ? false : form.conditional })} />
                    </div>
                    <div className="flex items-center justify-between gap-4 p-4">
                      <div>
                        <div className="text-[14px] font-semibold text-on-surface">Conditional</div>
                        <div className="text-body-sm text-on-surface-variant">Only certain bidders submit this (e.g. MSEs)</div>
                      </div>
                      <YesNo label="Conditional" value={form.conditional} onChange={(v) => setForm({ ...form, conditional: v, mandatory: v ? false : form.mandatory })} />
                    </div>
                  </div>
                  <Field label="Description" htmlFor="rq-desc" aside={<span className="text-[12px] text-on-surface-variant">Optional</span>}>
                    <textarea
                      id="rq-desc"
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="What exactly the bidder must provide"
                      className="w-full rounded-control border border-outline-variant bg-surface-container-lowest px-3.5 py-3 text-[14px] text-on-surface outline-none transition-all placeholder:text-outline hover:border-outline/60 focus:border-secondary focus:shadow-focus"
                    />
                  </Field>
                  <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-4">
                    <Field label="Source document" htmlFor="rq-src">
                      <Select id="rq-src" value={form.sourceDoc} onChange={(e) => setForm({ ...form, sourceDoc: e.target.value })}>
                        <option value="">None (officer added)</option>
                        {SOURCE_DOCS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Page / section" htmlFor="rq-page">
                      <Input id="rq-page" value={form.sourcePage} onChange={(e) => setForm({ ...form, sourcePage: e.target.value })} placeholder="12" />
                    </Field>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2.5 border-t border-outline-variant bg-surface-container-low px-6 py-4">
                  <Button variant="secondary" onClick={() => (drawer.mode === 'edit' ? setDrawer({ item: drawer.item, mode: 'view' }) : setDrawer(null))}>
                    Cancel
                  </Button>
                  <Button leftIcon="check" onClick={save}>
                    {drawer.mode === 'new' ? 'Add requirement' : 'Save'}
                  </Button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      <Modal
        open={!!removeReq}
        onClose={() => setRemoveReq(null)}
        icon="warning"
        size="md"
        title="Remove requirement?"
        description={removeReq?.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveReq(null)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (removeReq) setReqs((all) => all.filter((r) => r.id !== removeReq.id));
                setToast(`${removeReq?.name} removed`);
                setRemoveReq(null);
                setDrawer(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">Bidders will no longer be asked to submit this. You can add it again later.</p>
      </Modal>

      <Modal
        open={warnOpen}
        onClose={() => setWarnOpen(false)}
        icon="flag"
        size="md"
        title={`${flagged.length} ${flagged.length === 1 ? 'requirement needs' : 'requirements need'} review`}
        footer={
          <>
            <Button variant="secondary" onClick={() => navigate(CREATE_TENDER_ROUTES.rules)}>
              Continue
            </Button>
            <Button
              onClick={() => {
                setWarnOpen(false);
                reviewFlagged();
              }}
            >
              Review now
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-2">
          {flagged.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-[14px] text-on-surface">
              <Icon name="flag" size="sm" className="text-warning" />
              {r.name}
            </li>
          ))}
        </ul>
      </Modal>

      {toast && <Toast message={toast} />}
    </OfficerPortalShell>
  );
}
