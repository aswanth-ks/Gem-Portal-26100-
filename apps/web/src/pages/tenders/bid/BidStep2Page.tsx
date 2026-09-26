// Bid Submission Workspace — Step 2: Documents. Ported from Stitch screen
// "Bid Submission Workspace (Step 02: Documents)" (project
// 6921642772921774119, screen 40ea8a2239ce42a7a57d9ad7ef90f7b0).
//
// TODO: replace DOCUMENT_ROWS with real upload state from
// features/documents/api once POST /api/tenders/:ref/bid/documents exists.
// The dropzone is presentational only — no file upload wired yet.

import { useNavigate, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import { Button, Callout, Card, CellStack, Icon, PageHeader, StatusBadge, Table, TBody, Td, Th, THead, Tr, type Status } from '@/components/primitives';
import { cn } from '@/utils/cn';
import { BID_TENDER, BidActionBar, BidStepper, TenderContextBanner } from './BidWorkspaceChrome';

type DocStatus = 'uploaded' | 'linked' | 'processing' | 'action-required';

interface DocRow {
  icon: string;
  name: string;
  desc: string;
  requirement: 'mandatory' | 'conditional';
  status: DocStatus;
  fileName?: string;
  fileMeta?: string;
}

const DOCUMENT_ROWS: DocRow[] = [
  { icon: 'badge', name: 'Permanent Account Number (PAN) card', desc: 'Self-attested copy of entity PAN', requirement: 'mandatory', status: 'uploaded', fileName: 'PAN_Certificate_ABCEngg.pdf', fileMeta: '1.2 MB · 23 Sep, 21:30 IST' },
  { icon: 'receipt_long', name: 'GST registration certificate (REG-06)', desc: 'Principal place of business within Tamil Nadu / India', requirement: 'mandatory', status: 'uploaded', fileName: 'GST_Registration_33AAACA1122K1Z9.pdf', fileMeta: '856 KB · 23 Sep, 21:31 IST' },
  { icon: 'account_balance', name: 'Audited financial statements (3 FYs)', desc: 'Balance sheets & P&L with CA UDIN for FY 22-25', requirement: 'mandatory', status: 'uploaded', fileName: 'Audited_Financials_FY22-25_UDIN.pdf', fileMeta: '3.4 MB · 23 Sep, 21:34 IST' },
  { icon: 'corporate_fare', name: 'Udyam registration certificate (MSME)', desc: 'Validated for tender fee & EMD exemption', requirement: 'conditional', status: 'linked', fileName: 'Udyam_UDYAM-TN-02-0048291.pdf', fileMeta: '642 KB · synced from profile' },
  { icon: 'verified_user', name: 'OEM Manufacturer Authorization Form (MAF)', desc: 'Annexure-D on manufacturer letterhead with warranty', requirement: 'mandatory', status: 'processing', fileName: 'OEM_Authorization_Matrix_Hikvision.pdf', fileMeta: '1.8 MB · 1 min ago' },
  { icon: 'fact_check', name: 'Technical compliance statement (Section IV)', desc: 'Clause-by-clause signed sheet for PTZ & dome specs', requirement: 'mandatory', status: 'uploaded', fileName: 'CCTV_Technical_Compliance_SectionIV.pdf', fileMeta: '2.1 MB · 23 Sep, 21:42 IST' },
  { icon: 'workspace_premium', name: 'Past work order & experience certificate', desc: 'Single contract value ≥ ₹30.00 Lakhs', requirement: 'mandatory', status: 'action-required' },
];

const STATUS_MAP: Record<DocStatus, { status: Status; label?: string }> = {
  uploaded: { status: 'uploaded' },
  linked: { status: 'verified', label: 'Linked' },
  processing: { status: 'processing', label: 'OCR scanning' },
  'action-required': { status: 'action-required' },
};

const uploadedCount = DOCUMENT_ROWS.filter((d) => d.status === 'uploaded' || d.status === 'linked').length;
const pendingRow = DOCUMENT_ROWS.find((d) => d.status === 'action-required');

export function BidStep2Page() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const tenderRef = ref ? decodeURIComponent(ref) : BID_TENDER.ref;
  const completion = Math.round((uploadedCount / DOCUMENT_ROWS.length) * 100);

  return (
    <BidderPortalShell breadcrumb="Bid Submission">
      <div className="flex flex-col gap-6 pb-28">
        <PageHeader
          breadcrumbs={[{ label: 'Tenders', to: '/tenders' }, { label: tenderRef, to: `/tenders/${encodeURIComponent(tenderRef)}` }, { label: 'Bid submission' }]}
          eyebrow={<StatusBadge tone="info">Step 2 of 3 · Envelope 2.0</StatusBadge>}
          title="Documents"
          description={
            <>
              Upload statutory proofs, manufacturer certifications and compliance forms for <span className="font-mono text-on-surface">{tenderRef}</span>. All mandatory documents must be uploaded and parsed before step 3.
            </>
          }
        />

        <TenderContextBanner tenderRef={tenderRef} />
        <BidStepper current={2} />

        {/* Progress overview */}
        <Card padding="lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90" aria-hidden="true">
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-surface-container" />
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-secondary" strokeDasharray={`${(completion / 100) * 97.4} 97.4`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[18px] font-semibold text-on-surface num">{completion}%</span>
              </div>
              <div>
                <div className="text-headline-md text-on-surface">
                  {uploadedCount} of {DOCUMENT_ROWS.length} documents ready
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                  <Icon name="lock" size="sm" className="text-success" />
                  Staged in an isolated 256-bit encrypted bidder container
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="uploaded" size="md">
                {uploadedCount} uploaded & staged
              </StatusBadge>
              <StatusBadge status="processing" size="md">
                1 OCR processing
              </StatusBadge>
              <StatusBadge status="action-required" size="md">
                1 action required
              </StatusBadge>
            </div>
          </div>
        </Card>

        {/* Checklist */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-4">
            <div>
              <h2 className="text-headline-md text-on-surface">Statutory & technical schedule</h2>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">PDF/A preferred, with clearly visible corporate seals.</p>
            </div>
            <Button variant="secondary" size="sm" leftIcon="refresh">
              Refresh parse status
            </Button>
          </div>
          <Table minWidth={920}>
            <THead>
              <tr>
                <Th className="pl-6">Document</Th>
                <Th>Requirement</Th>
                <Th>Status</Th>
                <Th>Uploaded file</Th>
                <Th align="right" className="pr-6">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {DOCUMENT_ROWS.map((doc) => {
                const s = STATUS_MAP[doc.status];
                const needsAction = doc.status === 'action-required';
                return (
                  <Tr key={doc.name} highlight={needsAction ? 'danger' : undefined}>
                    <Td className="pl-6">
                      <div className="flex items-start gap-3">
                        <span className={cn('mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control', needsAction ? 'bg-danger-container text-danger' : 'bg-info-container text-secondary')}>
                          <Icon name={doc.icon} size="md" />
                        </span>
                        <CellStack primary={doc.name} secondary={doc.desc} />
                      </div>
                    </Td>
                    <Td>
                      <StatusBadge status={doc.requirement} />
                    </Td>
                    <Td>
                      <StatusBadge status={s.status}>{s.label}</StatusBadge>
                    </Td>
                    <Td>
                      {doc.fileName ? <CellStack primary={<span className="font-mono text-[12.5px]">{doc.fileName}</span>} secondary={doc.fileMeta} /> : <span className="text-body-sm italic text-on-surface-variant">Not provided yet</span>}
                    </Td>
                    <Td align="right" className="pr-6 whitespace-nowrap">
                      {doc.status === 'processing' ? (
                        <span className="text-body-sm text-on-surface-variant">Processing…</span>
                      ) : needsAction ? (
                        <Button size="sm" leftIcon="upload">
                          Upload
                        </Button>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm">
                            Replace
                          </Button>
                          <Button variant="ghost" size="sm" className="hover:!text-danger">
                            Remove
                          </Button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>

          {pendingRow && (
            <div className="border-t border-outline-variant bg-surface-container-low/60 p-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-on-surface">
                    <Icon name="cloud_upload" size="lg" className="text-secondary" />
                    Upload: {pendingRow.name}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">Max 10 MB per file</span>
                </div>
                <button type="button" className="focus-ring group flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-outline-variant bg-surface-container-lowest px-6 py-10 text-center transition-all hover:border-secondary/50 hover:bg-info-container/30">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-info-container text-secondary transition-transform group-hover:-translate-y-0.5">
                    <Icon name="upload_file" size="xl" />
                  </span>
                  <span className="text-[15px] font-semibold text-on-surface">
                    Drag & drop the certificate here, or <span className="text-secondary underline underline-offset-4">browse files</span>
                  </span>
                  <span className="text-body-sm text-on-surface-variant">PDF, JPG, PNG, XLS, XLSX · clean scan with visible seal</span>
                </button>
              </div>
            </div>
          )}
        </Card>

        <Callout tone="neutral" icon="gavel" title="Statutory document verification protocol">
          Uploads stay in an encrypted, isolated workspace ledger and are only decrypted after step 3 sign-off. Integrity hashes (SHA-256) and anti-tamper checks are enforced. Uploading here does not constitute CPCL compliance approval or bid acceptance.
        </Callout>
      </div>

      <BidActionBar
        left={
          <>
            <Button variant="secondary" leftIcon="save">
              Save & exit
            </Button>
            <span className="hidden items-center gap-2 text-body-sm text-on-surface-variant sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              Auto-saved to cloud
            </span>
          </>
        }
        center={
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-danger-on-container">
            <Icon name="info" size="sm" />1 mandatory document pending
          </span>
        }
        right={
          <>
            <Button variant="ghost" leftIcon="arrow_back" onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/1`)}>
              Back
            </Button>
            <Button size="lg" rightIcon="arrow_forward" onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/3`)}>
              Continue to review
            </Button>
          </>
        }
      />
    </BidderPortalShell>
  );
}
