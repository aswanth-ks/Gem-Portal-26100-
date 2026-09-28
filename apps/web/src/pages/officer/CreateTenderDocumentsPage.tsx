// Procurement Officer — Create Tender, Step 2: Tender Documents. Ported from
// Stitch screen "O05 — Create Tender: Tender Documents (Dynamic Intake)"
// (project 6921642772921774119, screen 5353cde7a6364c4aacec46a9d1766805) on
// the shared OfficerPortalShell.
//
// Phase 2: real uploads. Officer attaches a file, it reaches apps/gateway and
// is persisted privately (apps/gateway/uploads, no public URL) with a real
// TenderDocument record. "Ready" here means "stored and registered" only —
// no AI/OCR/checksum processing actually happens, so the fake SHA-256
// hashes, DSC-sealing language and "metadata hygiene" claims from the
// prototype are removed rather than kept as decoration.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import { Button, Callout, Card, CardHeader, EmptyState, Field, Icon, IconButton, Input, Modal, PageHeader, Select, StatusBadge, Stepper, Tag, Toast } from '@/components/primitives';
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, getDraftTenderId } from './createTender';
import { officerApi, ApiError } from '@/lib/api';
import type { ApiTender, ApiTenderDocument } from '@/lib/types';
import { RequirementSetupModal } from './RequirementSetupModal';

const CATEGORIES = ['NIT / Tender document', 'Technical specification', 'BOQ / Price schedule', 'Terms & conditions (GCC/SCC)', 'Annexure / Schedule', 'Eligibility criteria', 'Financial document', 'Drawings / Schematic', 'Other statutory instrument'];

function fileIcon(file: string) {
  if (/\.xlsx?$/i.test(file)) return 'table_chart';
  if (/\.docx?$/i.test(file)) return 'article';
  return 'picture_as_pdf';
}

function formatSize(bytes: number) {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function CreateTenderDocumentsPage() {
  const navigate = useNavigate();
  const tenderId = getDraftTenderId();

  const [tender, setTender] = useState<ApiTender | null>(null);
  const [docs, setDocs] = useState<ApiTenderDocument[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [removeDoc, setRemoveDoc] = useState<ApiTenderDocument | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!tenderId) return;
    try {
      const [t, d] = await Promise.all([officerApi.get<ApiTender>(`/tenders/${tenderId}`), officerApi.get<ApiTenderDocument[]>(`/tenders/${tenderId}/documents`)]);
      setTender(t);
      setDocs(d);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load tender documents.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const canContinue = (docs?.length ?? 0) > 0;

  function openAdd() {
    setNewCat('');
    setNewFile(null);
    setTouched(false);
    setAddOpen(true);
  }

  async function confirmAdd() {
    setTouched(true);
    if (!newCat || !newFile || !tenderId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', newFile);
      form.append('documentType', newCat);
      await officerApi.upload<ApiTenderDocument>(`/tenders/${tenderId}/documents`, form);
      setAddOpen(false);
      setToast(`"${newFile.name}" uploaded and registered`);
      await load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function doRemove() {
    if (!removeDoc) return;
    try {
      await officerApi.delete(`/documents/${removeDoc._id}`);
      setToast(`${removeDoc.originalFilename} removed`);
      setRemoveDoc(null);
      await load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not remove document.');
    }
  }

  const addErrors = touched ? { cat: !newCat ? 'Select a category' : undefined, file: !newFile ? 'Attach a file' : undefined } : {};

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
        <Callout tone="danger" title="Could not load this tender">
          {loadError}
        </Callout>
      </OfficerPortalShell>
    );
  }

  if (!tender || !docs) {
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
          breadcrumbs={[{ label: 'Officer workspace', to: '/officer/dashboard' }, { label: 'Tenders', to: '/officer/tenders' }, { label: 'Create tender', to: CREATE_TENDER_ROUTES.info }, { label: 'Documents' }]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{tenderId.slice(-8)}</Tag>
            </>
          }
          title="Tender documents"
          description={`Upload the authoritative source documents for "${tender.title || 'this tender'}".`}
          actions={
            <Button leftIcon="add" onClick={openAdd}>
              Add document
            </Button>
          }
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={2} />
        </Card>

        <Callout tone="info" icon="info" title="No mandatory checklist">
          Attach technical specifications, a customised NIT, rate schedules or annexures as this procurement requires. "Ready" means the file is stored — no automated review runs on it yet.
        </Callout>

        <Card padding="lg">
          <CardHeader icon="folder_open" title="Uploaded source documents" actions={docs.length > 0 && <StatusBadge tone="success">{docs.length} {docs.length === 1 ? 'document' : 'documents'}</StatusBadge>} />

          {docs.length === 0 ? (
            <EmptyState
              icon="upload_file"
              title="No tender documents added yet"
              description="Add the documents that define this tender: NIT, technical specifications, commercial schedules, terms or annexures."
              actions={
                <Button leftIcon="add" onClick={openAdd}>
                  Add document
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {docs.map((d) => (
                <li key={d._id} className="flex flex-col gap-4 rounded-card border border-outline-variant p-4 transition-all hover:border-outline/60 hover:shadow-card sm:flex-row sm:items-center">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-info-container text-secondary">
                    <Icon name={fileIcon(d.originalFilename)} size="lg" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-on-surface">{d.documentType}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-on-surface-variant">
                      <span className="font-mono text-[12px] text-on-surface">{d.originalFilename}</span>
                      <span aria-hidden="true">·</span>
                      <span className="num">{formatSize(d.size)}</span>
                    </div>
                    <div className="mt-1 text-[12px] text-outline">Uploaded {new Date(d.uploadedAt).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <StatusBadge status="verified">Ready</StatusBadge>
                    <IconButton icon="delete" aria-label={`Remove ${d.originalFilename}`} onClick={() => setRemoveDoc(d)} />
                  </div>
                </li>
              ))}
              <li>
                <button type="button" onClick={openAdd} className="focus-ring group flex w-full items-center justify-center gap-3 rounded-card border-2 border-dashed border-outline-variant px-6 py-5 text-center transition-all hover:border-secondary/50 hover:bg-info-container/30">
                  <Icon name="add_circle" size="lg" className="text-secondary" />
                  <span className="text-left">
                    <span className="block text-[14px] font-semibold text-on-surface">Add another document</span>
                  </span>
                </button>
              </li>
            </ul>
          )}
        </Card>
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
        center={<span className="text-body-sm text-on-surface-variant">{docs.length === 0 ? 'Add a document to continue' : `${docs.length} ${docs.length === 1 ? 'document' : 'documents'} ready`}</span>}
        right={
          <Button rightIcon="arrow_forward" disabled={!canContinue} onClick={() => setSetupOpen(true)}>
            Continue to requirement setup
          </Button>
        }
      />

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
            <Button leftIcon="check" loading={uploading} onClick={confirmAdd}>
              Upload
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="Category" htmlFor="doc-cat" required error={addErrors.cat}>
            <Select id="doc-cat" value={newCat} state={addErrors.cat ? 'error' : 'default'} onChange={(e) => setNewCat(e.target.value)}>
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="File" required error={addErrors.file}>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" className="sr-only" onChange={(e) => setNewFile(e.target.files?.[0] ?? null)} />
            {newFile ? (
              <div className="flex items-center gap-3 rounded-control border border-outline-variant bg-surface-container-low px-3.5 py-2.5">
                <Icon name={fileIcon(newFile.name)} size="md" className="text-secondary" />
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-on-surface">{newFile.name}</span>
                <span className="num text-[12px] text-on-surface-variant">{formatSize(newFile.size)}</span>
                <IconButton icon="close" size="sm" aria-label="Remove selected file" onClick={() => setNewFile(null)} />
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="focus-ring group flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-outline-variant px-6 py-8 text-center transition-all hover:border-secondary/50 hover:bg-info-container/30">
                <Icon name="cloud_upload" size="xl" className="text-secondary" />
                <span className="text-[14px] font-semibold text-on-surface">Click to select a file</span>
                <span className="text-body-sm text-on-surface-variant">PDF, DOC, DOCX, XLS, XLSX · up to 25 MB</span>
              </button>
            )}
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!removeDoc}
        onClose={() => setRemoveDoc(null)}
        icon="warning"
        size="md"
        title="Remove document?"
        description={removeDoc?.originalFilename}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveDoc(null)}>
              Keep document
            </Button>
            <Button variant="danger" onClick={doRemove}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">This permanently deletes the stored file and its record.</p>
      </Modal>

      <RequirementSetupModal open={setupOpen} onClose={() => setSetupOpen(false)} />

      {toast && <Toast message={toast} />}
    </OfficerPortalShell>
  );
}
