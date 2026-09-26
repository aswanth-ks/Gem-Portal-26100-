// Procurement Officer — Create Tender, Step 3: Bidder Documents &
// Requirements (O07). Reached from the Requirement Setup modal on Tender
// Documents: ?mode=ai pre-fills AI-suggested requirements (with source
// references, each needing officer approval); ?mode=manual starts empty.
// Both paths share this one editable workspace. Same stepper, header and
// action bar as Steps 1–2.
//
// TODO: GET /api/officer/tenders/drafts/:ref/requirements/suggestions and
// persist requirements. "Continue" routes to Step 4 (Technical & financial rules).

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import {
  Button,
  Callout,
  Card,
  CardHeader,
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
  Tag,
  Toast,
} from '@/components/primitives';
import { cn } from '@/utils/cn';
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, DRAFT_REF } from './createTender';

type Category = 'Eligibility' | 'Technical' | 'Financial' | 'Compliance';
type Origin = 'ai' | 'approved' | 'officer';

interface Requirement {
  id: string;
  title: string;
  category: Category;
  level: 'mandatory' | 'conditional';
  evidence: string;
  source?: string;
  origin: Origin;
}

const CATEGORIES: Category[] = ['Eligibility', 'Technical', 'Financial', 'Compliance'];

const AI_SUGGESTIONS: Requirement[] = [
  { id: 'r1', title: 'Minimum average annual turnover of ₹ 1.25 Cr over the last 3 financial years', category: 'Financial', level: 'mandatory', evidence: 'CA-certified turnover statement', source: 'NIT_Master_CPCL_041.pdf · Clause 6.2', origin: 'ai' },
  { id: 'r2', title: 'Completed at least one similar CCTV/surveillance work of ₹ 34 Lakh in the last 7 years', category: 'Eligibility', level: 'mandatory', evidence: 'Work order + completion certificate', source: 'NIT_Master_CPCL_041.pdf · Clause 6.1', origin: 'ai' },
  { id: 'r3', title: 'Cameras compliant with ONVIF Profile S/G/T and IP67 ingress rating', category: 'Technical', level: 'mandatory', evidence: 'OEM datasheet & test certificate', source: 'Technical_Specification_v1.2.pdf · §1.1–1.2', origin: 'ai' },
  { id: 'r4', title: 'OEM authorization letter for quoted camera and NVR models', category: 'Technical', level: 'mandatory', evidence: 'Manufacturer authorization form (MAF)', source: 'Technical_Specification_v1.2.pdf · §4.3', origin: 'ai' },
  { id: 'r5', title: 'Signed Integrity Pact', category: 'Compliance', level: 'mandatory', evidence: 'Integrity Pact on stamp paper', source: 'NIT_Master_CPCL_041.pdf · Clause 14.2', origin: 'ai' },
  { id: 'r6', title: 'Local content declaration (Make in India, Class-I/II supplier)', category: 'Compliance', level: 'conditional', evidence: 'Self-certification of local content', source: 'NIT_Master_CPCL_041.pdf · Clause 18.1', origin: 'ai' },
  { id: 'r7', title: 'EMD of ₹ 85,000 or valid MSME/Startup exemption certificate', category: 'Financial', level: 'conditional', evidence: 'EMD receipt or Udyam certificate', source: 'Step 1 · Governance protocol', origin: 'ai' },
];

const EMPTY_FORM: Omit<Requirement, 'id' | 'origin'> = { title: '', category: 'Eligibility', level: 'mandatory', evidence: '', source: '' };

export function CreateTenderRequirementsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'ai' ? 'ai' : 'manual';
  const [reqs, setReqs] = useState<Requirement[]>(mode === 'ai' ? AI_SUGGESTIONS : []);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Requirement | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [removeReq, setRemoveReq] = useState<Requirement | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const pendingAi = reqs.filter((r) => r.origin === 'ai').length;
  const canContinue = reqs.length > 0 && pendingAi === 0;

  function openEditor(r: Requirement | 'new') {
    setForm(r === 'new' ? EMPTY_FORM : { title: r.title, category: r.category, level: r.level, evidence: r.evidence, source: r.source ?? '' });
    setTouched(false);
    setEditing(r);
  }

  function saveEditor() {
    setTouched(true);
    if (!form.title.trim() || !form.evidence.trim()) return;
    if (editing === 'new') {
      setReqs((all) => [...all, { ...form, id: `r-${Date.now()}`, origin: 'officer' }]);
      setToast('Requirement added');
    } else if (editing) {
      // Editing an AI suggestion counts as officer review → approved.
      setReqs((all) => all.map((r) => (r.id === editing.id ? { ...r, ...form, origin: r.origin === 'ai' ? 'approved' : r.origin } : r)));
      setToast('Requirement updated');
    }
    setEditing(null);
  }

  const errors = touched ? { title: !form.title.trim() ? 'Describe the requirement' : undefined, evidence: !form.evidence.trim() ? 'Specify the proof bidders must submit' : undefined } : {};

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-8 pb-28">
        <PageHeader
          breadcrumbs={[
            { label: 'Officer workspace', to: '/officer/dashboard' },
            { label: 'Tenders', to: '/officer/tenders' },
            { label: `Create tender (${DRAFT_REF})`, to: CREATE_TENDER_ROUTES.info },
            { label: 'Bidder requirements' },
          ]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{DRAFT_REF}</Tag>
              <Tag>{mode === 'ai' ? 'AI-assisted setup' : 'Manual setup'}</Tag>
            </>
          }
          title="Bidder documents & requirements"
          description="Define what bidders must meet and the proof they must submit. You control the final list."
          actions={
            <Button leftIcon="add" onClick={() => openEditor('new')}>
              Add requirement
            </Button>
          }
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={3} />
        </Card>

        {mode === 'ai' && (
          <Callout
            tone={pendingAi ? 'info' : 'success'}
            icon={pendingAi ? 'document_scanner' : 'check_circle'}
            title={pendingAi ? `${pendingAi} AI-suggested ${pendingAi === 1 ? 'requirement needs' : 'requirements need'} your review` : 'All suggestions reviewed'}
            actions={
              pendingAi > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon="done_all"
                  onClick={() => {
                    setReqs((all) => all.map((r) => (r.origin === 'ai' ? { ...r, origin: 'approved' } : r)));
                    setToast(`${pendingAi} requirements approved`);
                  }}
                >
                  Approve all
                </Button>
              )
            }
          >
            Extracted from your uploaded documents, each with its source reference. AI provides recommendations only — approve, edit or remove each item.
          </Callout>
        )}

        <Card padding="lg">
          <CardHeader
            icon="checklist"
            title="Requirements"
            description="Mandatory items disqualify bidders who miss them; conditional items apply only when relevant."
            actions={reqs.length > 0 && <StatusBadge tone={pendingAi ? 'warning' : 'success'}>{reqs.length} total{pendingAi ? ` · ${pendingAi} to review` : ''}</StatusBadge>}
          />

          {reqs.length === 0 ? (
            <EmptyState
              icon="playlist_add"
              title="No requirements yet"
              description="Add eligibility, technical, financial or compliance requirements and the documents bidders must submit as proof."
              actions={
                <Button leftIcon="add" onClick={() => openEditor('new')}>
                  Add first requirement
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {reqs.map((r) => {
                const ai = r.origin === 'ai';
                return (
                  <li key={r.id} className={cn('flex flex-col gap-4 rounded-card border p-4 transition-all lg:flex-row lg:items-center', ai ? 'border-info-border bg-info-container/30' : 'border-outline-variant')}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag>{r.category}</Tag>
                        <StatusBadge status={r.level} />
                        {ai ? (
                          <StatusBadge tone="info" icon="auto_awesome">AI suggested</StatusBadge>
                        ) : r.origin === 'approved' ? (
                          <StatusBadge tone="success" icon="check">Officer approved</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral" icon="person">Officer added</StatusBadge>
                        )}
                      </div>
                      <div className="mt-2 text-[15px] font-semibold text-on-surface">{r.title}</div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
                        <span className="inline-flex items-center gap-1">
                          <Icon name="description" size="xs" /> Proof: {r.evidence}
                        </span>
                        {r.source && (
                          <span className="inline-flex items-center gap-1">
                            <Icon name="link" size="xs" /> Source: <span className="font-mono text-[12px]">{r.source}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {ai && (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon="check"
                          onClick={() => setReqs((all) => all.map((x) => (x.id === r.id ? { ...x, origin: 'approved' } : x)))}
                        >
                          Approve
                        </Button>
                      )}
                      <IconButton icon="edit" aria-label={`Edit ${r.title}`} onClick={() => openEditor(r)} />
                      <IconButton icon="delete" aria-label={`Remove ${r.title}`} onClick={() => setRemoveReq(r)} />
                    </div>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={() => openEditor('new')}
                  className="focus-ring flex w-full items-center justify-center gap-3 rounded-card border-2 border-dashed border-outline-variant px-6 py-5 transition-all hover:border-secondary/50 hover:bg-info-container/30"
                >
                  <Icon name="add_circle" size="lg" className="text-secondary" />
                  <span className="text-[14px] font-semibold text-on-surface">Add another requirement</span>
                </button>
              </li>
            </ul>
          )}
        </Card>
      </div>

      <BidActionBar
        left={
          <>
            <Button variant="secondary" leftIcon="arrow_back" to={CREATE_TENDER_ROUTES.documents}>
              Back
            </Button>
            <Button variant="ghost" leftIcon="save" onClick={() => navigate('/officer/tenders')}>
              Save draft & exit
            </Button>
          </>
        }
        center={
          <span className="text-body-sm text-on-surface-variant">
            {reqs.length === 0 ? 'Add at least one requirement to continue' : pendingAi ? `Review ${pendingAi} AI-suggested ${pendingAi === 1 ? 'item' : 'items'} to continue` : `${reqs.length} requirements ready`}
          </span>
        }
        right={
          <Button rightIcon="arrow_forward" disabled={!canContinue} onClick={() => navigate(CREATE_TENDER_ROUTES.rules)}>
            Continue to evaluation rules
          </Button>
        }
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        icon={editing === 'new' ? 'playlist_add' : 'edit'}
        title={editing === 'new' ? 'Add requirement' : 'Edit requirement'}
        description={editing !== 'new' && editing?.origin === 'ai' ? 'Saving marks this AI suggestion as officer approved.' : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button leftIcon="check" onClick={saveEditor}>
              Save requirement
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="Requirement" htmlFor="rq-title" required error={errors.title}>
            <Input id="rq-title" value={form.title} state={errors.title ? 'error' : 'default'} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Valid ISO 9001:2015 certification" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="rq-cat" required>
              <Select id="rq-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Type" htmlFor="rq-level" required>
              <Select id="rq-level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as Requirement['level'] })}>
                <option value="mandatory">Mandatory</option>
                <option value="conditional">Conditional</option>
              </Select>
            </Field>
          </div>
          <Field label="Proof bidders must submit" htmlFor="rq-ev" required error={errors.evidence}>
            <Input id="rq-ev" value={form.evidence} state={errors.evidence ? 'error' : 'default'} onChange={(e) => setForm({ ...form, evidence: e.target.value })} placeholder="e.g. Certificate copy, self-attested" />
          </Field>
          <Field label="Source reference" htmlFor="rq-src" aside={<span className="text-[12px] text-on-surface-variant">Optional</span>}>
            <Input id="rq-src" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. NIT_Master_CPCL_041.pdf · Clause 6.3" className="font-mono text-[13px]" />
          </Field>
        </div>
      </Modal>

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
            <Button
              variant="danger"
              onClick={() => {
                if (removeReq) setReqs((all) => all.filter((r) => r.id !== removeReq.id));
                setRemoveReq(null);
                setToast('Requirement removed');
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">Bidders will no longer be asked to meet this requirement. You can add it again later.</p>
      </Modal>

      {toast && <Toast message={toast} />}
    </OfficerPortalShell>
  );
}
