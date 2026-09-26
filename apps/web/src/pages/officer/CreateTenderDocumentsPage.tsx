// Procurement Officer — Create Tender, Step 2: Tender Documents (dynamic
// intake). Ported from Stitch screen "O05 — Create Tender: Tender Documents
// (Dynamic Intake)" (project 6921642772921774119, screen
// 5353cde7a6364c4aacec46a9d1766805) on the shared OfficerPortalShell, the
// same stepper/action bar as Step 1 and design-system primitives.
//
// No mandatory checklist: the officer attaches only what the scope needs.
// Document list, prototype states, add/replace/remove/inspect modals and the
// sample packet are React state; file selection is local only.
//
// TODO: POST /api/officer/tenders/drafts/:ref/documents (multipart + DSC seal)
// "Continue" runs document analysis, then opens Compliance Configuration.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tabs,
  Tag,
  Toast,
} from '@/components/primitives';
import { cn } from '@/utils/cn';
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, DRAFT_REF } from './createTender';
import { DocumentAnalysisModal } from './DocumentAnalysisModal';

type DocState = 'ready' | 'action-required';

interface TenderDoc {
  id: string;
  title: string;
  category: string;
  cover?: string;
  file: string;
  size: string;
  hash: string;
  uploaded: string;
  state: DocState;
  preview?: string[];
}

const CATEGORIES = [
  'NIT / Tender document',
  'Technical specification',
  'BOQ / Price schedule',
  'Terms & conditions (GCC/SCC)',
  'Annexure / Schedule',
  'Eligibility criteria',
  'Financial document',
  'Drawings / Schematic',
  'Other statutory instrument',
];

const SAMPLE_DOCS: TenderDoc[] = [
  {
    id: 'tech',
    title: 'Technical Specification Package',
    category: 'Technical specification',
    cover: 'Cover 1 · Technical',
    file: 'Technical_Specification_v1.2.pdf',
    size: '7.2 MB',
    hash: '41a9bf88c83a73c9e0fa91e028b809fa8827419e912f90119b4f9104fae8902d',
    uploaded: '26 Sep 2026, 13:20 IST · Arun Kumar (CPCL-OFF-4092)',
    state: 'ready',
    preview: [
      '[CPCL TENDER INSTRUMENT: REF CPCL/PROC/2026/041]',
      'SECTION 1.0 — SCOPE OF SUPPLY: INDUSTRIAL IP CCTV INTEGRATION',
      '1.1 The contractor shall engineer, supply, calibrate and commission 140 Nos. 4K Ultra-HD PTZ weatherproof cameras adhering to ONVIF Profile S/G/T…',
      '1.2 Minimum IP67 ingress certification required.',
      '1.3 NDA & cyber-security vetting mandatory per MoP&NG 2024 directives.',
    ],
  },
  {
    id: 'nit',
    title: 'Notice Inviting Tender (NIT)',
    category: 'NIT / Tender document',
    cover: 'Statutory notice',
    file: 'NIT_Master_CPCL_041.pdf',
    size: '4.8 MB',
    hash: '7f8c02d1e94a5b7c61f0a2e8d93b4c5f7a1e6d2c8b9f0e3a4d5c6b7a8e9f33b1',
    uploaded: '26 Sep 2026, 13:18 IST · Digitally sealed',
    state: 'ready',
  },
  {
    id: 'boq',
    title: 'Commercial BOQ & Rate Schedule',
    category: 'BOQ / Price schedule',
    cover: 'Cover 2 · Financial',
    file: 'BOQ_Schedule_Rev1.xlsx',
    size: '1.1 MB',
    hash: '820d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2bf429',
    uploaded: '26 Sep 2026, 13:22 IST · Verified format template',
    state: 'ready',
  },
];

const PENDING_DOC: TenderDoc = {
  id: 'scc',
  title: 'Special Conditions of Contract (SCC)',
  category: 'Terms & conditions (GCC/SCC)',
  file: 'SCC_Annexure_Draft.docx',
  size: '2.4 MB',
  hash: '',
  uploaded: 'Just now · officer must re-confirm signature',
  state: 'action-required',
};

type SimState = 'populated' | 'empty' | 'processing';

function fileIcon(file: string) {
  if (/\.xlsx?$/i.test(file)) return 'table_chart';
  if (/\.docx?$/i.test(file)) return 'article';
  return 'picture_as_pdf';
}

function shortHash(h: string) {
  return `${h.slice(0, 4)}…${h.slice(-4)}`;
}

function fakeHash() {
  return Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
}

function formatSize(bytes: number) {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function CreateTenderDocumentsPage() {
  const navigate = useNavigate();
  const [sim, setSim] = useState<SimState>('populated');
  const [docs, setDocs] = useState<TenderDoc[]>(SAMPLE_DOCS);
  const [savedAgo, setSavedAgo] = useState(18);
  const [toast, setToast] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [replaceDoc, setReplaceDoc] = useState<TenderDoc | null>(null);
  const [removeDoc, setRemoveDoc] = useState<TenderDoc | null>(null);
  const [inspectDoc, setInspectDoc] = useState<TenderDoc | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSavedAgo((s) => s + 10), 10_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const savedLabel = savedAgo < 60 ? `${savedAgo}s ago` : `${Math.floor(savedAgo / 60)}m ago`;
  const ready = docs.filter((d) => d.state === 'ready').length;
  const pending = docs.length - ready;
  const canContinue = ready > 0 && pending === 0;

  function applySim(state: SimState) {
    setSim(state);
    if (state === 'empty') setDocs([]);
    if (state === 'populated') setDocs(SAMPLE_DOCS);
    if (state === 'processing') setDocs([...SAMPLE_DOCS, PENDING_DOC]);
  }

  function openAdd() {
    setNewTitle('');
    setNewCat('');
    setNewFile(null);
    setTouched(false);
    setAddOpen(true);
  }

  function confirmAdd() {
    setTouched(true);
    if (!newTitle.trim() || !newCat || !newFile) return;
    setDocs((d) => [
      ...d,
      {
        id: `doc-${Date.now()}`,
        title: newTitle.trim(),
        category: newCat,
        file: newFile.name,
        size: formatSize(newFile.size),
        hash: fakeHash(),
        uploaded: 'Just now · Arun Kumar (CPCL-OFF-4092)',
        state: 'ready',
      },
    ]);
    setAddOpen(false);
    setToast(`"${newTitle.trim()}" added and sealed with DSC`);
  }

  const addErrors = touched
    ? { title: !newTitle.trim() ? 'Document title is required' : undefined, cat: !newCat ? 'Select a category' : undefined, file: !newFile ? 'Attach a file' : undefined }
    : {};

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-8 pb-28">
        {/* Prototype states — same quiet strip as the bidder listing */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-outline-variant bg-surface-container-lowest/60 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-on-surface-variant">
            <Icon name="science" size="sm" className="text-outline" />
            Prototype states
          </span>
          <Tabs
            variant="pills"
            ariaLabel="Prototype state"
            value={sim}
            onChange={(id) => applySim(id as SimState)}
            items={[
              { id: 'populated', label: '3 documents' },
              { id: 'empty', label: 'Empty' },
              { id: 'processing', label: 'Action required' },
            ]}
          />
        </div>

        <PageHeader
          breadcrumbs={[
            { label: 'Officer workspace', to: '/officer/dashboard' },
            { label: 'Tenders', to: '/officer/tenders' },
            { label: `Create tender (${DRAFT_REF})`, to: CREATE_TENDER_ROUTES.info },
            { label: 'Documents' },
          ]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{DRAFT_REF}</Tag>
              <Tag mono>CPCL/PROC/2026/041</Tag>
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success-on-container">
                <Icon name="check_circle" size="xs" fill /> Draft saved ({savedLabel}) · Rev 1.0
              </span>
            </>
          }
          title="Tender documents"
          description="Upload the authoritative source documents for “Supply of CCTV Cameras for Public Safety Infrastructure”. Attach only the instruments this procurement needs."
          actions={
            <Button leftIcon="add" onClick={openAdd}>
              Add document
            </Button>
          }
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={2} />
        </Card>

        <Callout tone="info" icon="verified_user" title={<span className="flex flex-wrap items-center gap-2">Officer document control <Tag>No mandatory checklist</Tag></span>}>
          Under revised CPCL procurement norms, no mandatory file checklist or quota is imposed. Attach technical specifications, a customised NIT, rate schedules or annexures only as the project scope requires.
        </Callout>

        <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Documents */}
          <Card padding="lg">
            <CardHeader
              icon="folder_open"
              title="Uploaded source documents"
              description="Each file is fingerprinted (SHA-256) and sealed with your DSC on upload."
              actions={
                docs.length > 0 && (
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={pending ? 'warning' : 'success'}>
                      {docs.length} {docs.length === 1 ? 'document' : 'documents'}
                      {pending ? ` · ${pending} pending` : ''}
                    </StatusBadge>
                  </div>
                )
              }
            />

            {docs.length === 0 ? (
              <EmptyState
                icon="upload_file"
                title="No tender documents added yet"
                description="Add the documents that define and evaluate this tender: NIT, technical specifications, commercial schedules, terms or annexures."
                actions={
                  <>
                    <Button leftIcon="add" onClick={openAdd}>
                      Add document
                    </Button>
                    <Button
                      variant="secondary"
                      leftIcon="inventory_2"
                      onClick={() => {
                        setDocs(SAMPLE_DOCS);
                        setSim('populated');
                        setToast('Official sample packet loaded (3 documents)');
                      }}
                    >
                      Load sample packet
                    </Button>
                  </>
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {docs.map((d) => {
                  const warn = d.state === 'action-required';
                  return (
                    <li
                      key={d.id}
                      className={cn(
                        'flex flex-col gap-4 rounded-card border p-4 transition-all sm:flex-row sm:items-center',
                        warn ? 'border-warning-border bg-warning-container/40' : 'border-outline-variant hover:border-outline/60 hover:shadow-card',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control',
                          warn ? 'bg-warning-container text-warning-on-container' : 'bg-info-container text-secondary',
                        )}
                      >
                        <Icon name={warn ? 'hourglass_top' : fileIcon(d.file)} size="lg" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-on-surface">{d.title}</span>
                          <Tag>{d.category}</Tag>
                          {d.cover && <Tag>{d.cover}</Tag>}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-on-surface-variant">
                          <span className="font-mono text-[12px] text-on-surface">{d.file}</span>
                          <span aria-hidden="true">·</span>
                          <span className="num">{d.size}</span>
                          <span aria-hidden="true">·</span>
                          {d.hash ? <span className="font-mono text-[12px]">SHA-256 {shortHash(d.hash)}</span> : <span>Hash validation incomplete</span>}
                        </div>
                        <div className="mt-1 text-[12px] text-outline">Uploaded {d.uploaded}</div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        {warn ? (
                          <>
                            <StatusBadge status="action-required">Checksum mismatch</StatusBadge>
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon="sync"
                              onClick={() => {
                                setDocs((all) => all.map((x) => (x.id === d.id ? { ...x, state: 'ready', hash: fakeHash(), uploaded: 'Just now · re-sealed with DSC' } : x)));
                                setToast(`${d.title} re-uploaded and verified`);
                              }}
                            >
                              Re-upload
                            </Button>
                          </>
                        ) : (
                          <>
                            <StatusBadge status="verified">Ready</StatusBadge>
                            <Button size="sm" variant="ghost" leftIcon="visibility" onClick={() => setInspectDoc(d)}>
                              Inspect
                            </Button>
                            <IconButton icon="sync" aria-label={`Replace ${d.title}`} onClick={() => setReplaceDoc(d)} />
                          </>
                        )}
                        <IconButton icon="delete" aria-label={`Remove ${d.title}`} onClick={() => setRemoveDoc(d)} />
                      </div>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={openAdd}
                    className="focus-ring group flex w-full items-center justify-center gap-3 rounded-card border-2 border-dashed border-outline-variant px-6 py-5 text-center transition-all hover:border-secondary/50 hover:bg-info-container/30"
                  >
                    <Icon name="add_circle" size="lg" className="text-secondary" />
                    <span className="text-left">
                      <span className="block text-[14px] font-semibold text-on-surface">Add another document</span>
                      <span className="block text-body-sm text-on-surface-variant">Specifications, annexures, drawings or statutory schedules</span>
                    </span>
                  </button>
                </li>
              </ul>
            )}
          </Card>

          {/* Document intelligence (advisory) */}
          <Card padding="lg" className="h-fit">
            <CardHeader icon="auto_awesome" title="Document integrity" description="Automated checks · officer advisory only" />
            {docs.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Checks run automatically once a document is attached.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {[
                  { icon: 'verified', title: 'Metadata hygiene', body: `${ready} ${ready === 1 ? 'file has' : 'files have'} no hidden revision history or officer comments. Clean for publishing.` },
                  { icon: 'security', title: 'SHA-256 non-repudiation', body: 'Hashes generated on your workstation with the Level-3 token and registered in the audit log.' },
                  { icon: 'balance', title: 'CVC clause cross-check', body: 'Integrity Pact and Make in India references found in the NIT (clauses 14.2 & 18.1).' },
                ].map((c) => (
                  <li key={c.title} className="flex gap-3">
                    <Icon name={c.icon} size="md" className="mt-0.5 shrink-0 text-success" />
                    <div>
                      <div className="text-[14px] font-semibold text-on-surface">{c.title}</div>
                      <div className="text-body-sm text-on-surface-variant">{c.body}</div>
                    </div>
                  </li>
                ))}
                {pending > 0 && (
                  <li className="flex gap-3">
                    <Icon name="warning" size="md" className="mt-0.5 shrink-0 text-warning" />
                    <div>
                      <div className="text-[14px] font-semibold text-on-surface">Verification pending</div>
                      <div className="text-body-sm text-on-surface-variant">Re-upload {pending === 1 ? 'the flagged file' : 'flagged files'} before continuing.</div>
                    </div>
                  </li>
                )}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <BidActionBar
        left={
          <>
            <Button variant="secondary" leftIcon="arrow_back" to={CREATE_TENDER_ROUTES.info}>
              Back
            </Button>
            <Button variant="ghost" leftIcon="save" onClick={() => navigate('/officer/tenders')}>
              Save draft & exit
            </Button>
          </>
        }
        center={
          <span className="text-body-sm text-on-surface-variant">
            Draft auto-saved {savedLabel} ·{' '}
            {docs.length === 0 ? 'Add a document to continue' : pending ? `${pending} document needs attention` : `${ready} ${ready === 1 ? 'document' : 'documents'} ready`}
          </span>
        }
        right={
          <Button rightIcon="arrow_forward" disabled={!canContinue} onClick={() => setSetupOpen(true)}>
            Continue to compliance configuration
          </Button>
        }
      />

      {/* Add document */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        icon="note_add"
        title="Add tender document"
        description="Attach an official source document to this procurement."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button leftIcon="check" onClick={confirmAdd}>
              Add to tender
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="Document title" htmlFor="doc-title" required helper="Shown to bidders on the portal" error={addErrors.title}>
            <Input id="doc-title" value={newTitle} state={addErrors.title ? 'error' : 'default'} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. General Conditions of Contract" />
          </Field>
          <Field label="Category" htmlFor="doc-cat" required helper="Helps clause indexing in later steps" error={addErrors.cat}>
            <Select id="doc-cat" value={newCat} state={addErrors.cat ? 'error' : 'default'} onChange={(e) => setNewCat(e.target.value)}>
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="File" required error={addErrors.file}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setNewFile(f);
                if (f && !newTitle) setNewTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
              }}
            />
            {newFile ? (
              <div className="flex items-center gap-3 rounded-control border border-outline-variant bg-surface-container-low px-3.5 py-2.5">
                <Icon name={fileIcon(newFile.name)} size="md" className="text-secondary" />
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-on-surface">{newFile.name}</span>
                <span className="num text-[12px] text-on-surface-variant">{formatSize(newFile.size)}</span>
                <IconButton icon="close" size="sm" aria-label="Remove selected file" onClick={() => setNewFile(null)} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'focus-ring group flex flex-col items-center gap-2 rounded-card border-2 border-dashed px-6 py-8 text-center transition-all hover:border-secondary/50 hover:bg-info-container/30',
                  addErrors.file ? 'border-danger' : 'border-outline-variant',
                )}
              >
                <Icon name="cloud_upload" size="xl" className="text-secondary" />
                <span className="text-[14px] font-semibold text-on-surface">
                  Click to select a file
                </span>
                <span className="text-body-sm text-on-surface-variant">PDF, DOC, DOCX, XLS, XLSX · up to 25 MB · sealed with DSC on confirm</span>
              </button>
            )}
          </Field>
          <Field label="Purpose / note" htmlFor="doc-note" aside={<span className="text-[12px] text-on-surface-variant">Optional</span>}>
            <Input id="doc-note" placeholder="e.g. Supersedes GCC 2024 revision" />
          </Field>
        </div>
      </Modal>

      {/* Replace */}
      <Modal
        open={!!replaceDoc}
        onClose={() => setReplaceDoc(null)}
        icon="sync"
        size="md"
        title="Replace document"
        description={replaceDoc?.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReplaceDoc(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (replaceDoc) {
                  setDocs((all) => all.map((x) => (x.id === replaceDoc.id ? { ...x, hash: fakeHash(), uploaded: 'Just now · revision 2.0' } : x)));
                  setToast(`${replaceDoc.title} replaced · revision 2.0`);
                }
                setReplaceDoc(null);
              }}
            >
              Commit revision 2.0
            </Button>
          </>
        }
      >
        <Callout tone="warning" icon="history" title="Audit continuity">
          The current file is archived in the CPCL audit ledger. Requirements tied to it stay intact but need your re-confirmation in Step 3.
        </Callout>
      </Modal>

      {/* Remove */}
      <Modal
        open={!!removeDoc}
        onClose={() => setRemoveDoc(null)}
        icon="warning"
        size="md"
        title="Remove document?"
        description={removeDoc?.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveDoc(null)}>
              Keep document
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (removeDoc) {
                  setDocs((all) => all.filter((x) => x.id !== removeDoc.id));
                  setToast(`${removeDoc.title} removed from draft`);
                }
                setRemoveDoc(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">
          This de-links the document from the tender draft. No document is mandatory, so you can continue without it or attach an alternative later.
        </p>
      </Modal>

      {/* Inspect */}
      <Modal
        open={!!inspectDoc}
        onClose={() => setInspectDoc(null)}
        icon="description"
        title={inspectDoc?.title}
        description={inspectDoc?.file}
        footer={<Button onClick={() => setInspectDoc(null)}>Close</Button>}
      >
        {inspectDoc && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 rounded-card border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-2">
              <div>
                <div className="text-[12px] text-on-surface-variant">File size</div>
                <div className="num text-[14px] font-semibold text-on-surface">{inspectDoc.size}</div>
              </div>
              <div>
                <div className="text-[12px] text-on-surface-variant">Digital seal</div>
                <StatusBadge status="verified">Valid · Level-3</StatusBadge>
              </div>
              <div className="sm:col-span-2">
                <div className="text-[12px] text-on-surface-variant">SHA-256 fingerprint</div>
                <div className="break-all font-mono text-[12px] text-on-surface">{inspectDoc.hash}</div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-[13px] font-semibold text-on-surface">Content preview</div>
              <div className="rounded-card border border-outline-variant bg-surface-container-lowest p-4 font-mono text-[12px] leading-relaxed text-on-surface-variant">
                {(inspectDoc.preview ?? [`[${inspectDoc.file}]`, 'Full preview is available after compliance configuration (Step 3).']).map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <DocumentAnalysisModal open={setupOpen} documentCount={ready} />

      {toast && <Toast message={toast} />}
    </OfficerPortalShell>
  );
}
