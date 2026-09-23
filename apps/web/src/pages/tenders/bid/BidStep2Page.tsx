// Bid Submission Workspace — Step 02: Documents. Ported from the Stitch
// screen "CPCL Bidder Portal - Bid Submission Workspace (Step 02:
// Documents)" (project: GeM Portal). Source: Stitch project
// 6921642772921774119, file 2793375738928107531
// (screen 40ea8a2239ce42a7a57d9ad7ef90f7b0).
//
// TODO: replace DOCUMENT_ROWS (upload/OCR-parse status) with real upload
// state from features/documents/api once POST /api/tenders/:ref/bid/documents
// exists on the gateway. The dropzone below is presentational only — no file
// upload wired yet.

import { useNavigate, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import { BID_TENDER, BidStepper, TenderContextBanner } from './BidWorkspaceChrome';

type DocStatus = 'uploaded' | 'linked' | 'processing' | 'action-required';

interface DocRow {
  icon: string;
  name: string;
  desc: string;
  requirement: 'Mandatory' | 'Conditional';
  status: DocStatus;
  fileName?: string;
  fileMeta?: string;
}

const DOCUMENT_ROWS: DocRow[] = [
  { icon: 'badge', name: 'Permanent Account Number (PAN) Card', desc: 'Self-attested copy of entity PAN issued by Income Tax Department of India', requirement: 'Mandatory', status: 'uploaded', fileName: 'PAN_Certificate_ABCEngg.pdf', fileMeta: '1.2 MB · Uploaded 23 Sep, 21:30 IST' },
  { icon: 'receipt_long', name: 'GST Registration Certificate (GST REG-06)', desc: 'Form GST REG-06 showing principal place of business within Tamil Nadu / India', requirement: 'Mandatory', status: 'uploaded', fileName: 'GST_Registration_33AAACA1122K1Z9.pdf', fileMeta: '856 KB · Uploaded 23 Sep, 21:31 IST' },
  { icon: 'account_balance', name: 'Audited Financial Statements (Last 3 FYs)', desc: 'Audited Balance Sheets & P&L with CA UDIN certification for FY 22-23, 23-24, 24-25', requirement: 'Mandatory', status: 'uploaded', fileName: 'Audited_Financials_FY22-25_UDIN.pdf', fileMeta: '3.4 MB · Uploaded 23 Sep, 21:34 IST' },
  { icon: 'corporate_fare', name: 'Udyam Registration Certificate (MSME)', desc: 'Validated against National Portal for tender fee & EMD exemption claim', requirement: 'Conditional', status: 'linked', fileName: 'Udyam_UDYAM-TN-02-0048291.pdf', fileMeta: '642 KB · Synced from Bidder Profile' },
  { icon: 'verified_user', name: 'OEM Manufacturer Authorization Form (MAF)', desc: 'Annexure-D standard format issued on manufacturer letterhead with warranty commitment', requirement: 'Mandatory', status: 'processing', fileName: 'OEM_Authorization_Matrix_Hikvision.pdf', fileMeta: '1.8 MB · Uploaded 1 min ago' },
  { icon: 'fact_check', name: 'Technical Compliance Statement (Section IV)', desc: 'Clause-by-clause signed compliance sheet for PTZ & Dome CCTV specs', requirement: 'Mandatory', status: 'uploaded', fileName: 'CCTV_Technical_Compliance_SectionIV.pdf', fileMeta: '2.1 MB · Uploaded 23 Sep, 21:42 IST' },
  { icon: 'warning', name: 'Past Work Order & Experience Certificate', desc: 'Client satisfaction certificate showing minimum single contract value ≥ ₹30.00 Lakhs', requirement: 'Mandatory', status: 'action-required' },
];

const STATUS_BADGE: Record<DocStatus, { icon: string; label: string; className: string }> = {
  uploaded: { icon: 'check_circle', label: 'Uploaded', className: 'bg-surface-container text-secondary' },
  linked: { icon: 'verified', label: 'Linked', className: 'bg-surface-container text-secondary' },
  processing: { icon: 'progress_activity', label: 'OCR Scanning...', className: 'bg-surface-container text-on-tertiary-container' },
  'action-required': { icon: 'error', label: 'Action Required', className: 'bg-error-container text-on-error-container' },
};

const uploadedCount = DOCUMENT_ROWS.filter((d) => d.status === 'uploaded' || d.status === 'linked').length;
const pendingRow = DOCUMENT_ROWS.find((d) => d.status === 'action-required');

export function BidStep2Page() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const tenderRef = ref ? decodeURIComponent(ref) : BID_TENDER.ref;
  const completion = Math.round((uploadedCount / DOCUMENT_ROWS.length) * 1000) / 10;

  return (
    <BidderPortalShell breadcrumb="Bid Submission">
      <div className="flex flex-col w-full pb-24 px-space-lg">
        <TenderContextBanner />
        <BidStepper current={2} />

        {/* MAIN HEADING & DOCUMENT PROGRESS METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md mb-space-lg">
          <div className="lg:col-span-8 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-space-xs mb-space-xs">
                <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface font-mono text-label-sm font-semibold">ENVELOPE 2.0</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Statutory &amp; Technical Staging Area</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-primary font-bold tracking-tight">Documents Submission</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-3xl">
                Upload required sovereign verification documents, manufacturer certifications, and compliance forms for tender reference{' '}
                <strong className="text-on-surface font-mono font-medium">{tenderRef}</strong>. All mandatory documents must be completely uploaded
                and parsed before advancing to Step 3.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-space-sm pt-space-md mt-space-md bg-surface-container-low/40 p-space-sm rounded-lg">
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                <span className="font-label-md text-label-md text-on-surface font-semibold">{uploadedCount} Uploaded &amp; Staged</span>
              </div>
              <span className="text-outline-variant font-mono">|</span>
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim"></span>
                <span className="font-label-md text-label-md text-tertiary-container font-semibold">1 OCR Processing</span>
              </div>
              <span className="text-outline-variant font-mono">|</span>
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                <span className="font-label-md text-label-md text-error font-semibold">1 Action Required</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Completion Metric</span>
                <div className="flex items-baseline gap-space-xs mt-space-xs">
                  <span className="font-display-lg text-display-lg font-bold text-primary tracking-tight">{Math.round(completion)}</span>
                  <span className="font-headline-sm text-headline-sm font-bold text-on-surface-variant">%</span>
                </div>
              </div>
              <div className="p-space-sm rounded-lg bg-surface-container text-secondary">
                <span className="material-symbols-outlined text-[28px]">folder_zip</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-xs my-space-sm">
              <div className="flex items-center justify-between font-label-md text-label-md">
                <span className="text-on-surface font-semibold">Documents Uploaded</span>
                <span className="font-mono font-bold text-primary">
                  {uploadedCount} of {DOCUMENT_ROWS.length} Completed
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full transition-all duration-500 ease-out" style={{ width: `${completion}%` }}></div>
              </div>
            </div>
            <div className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-space-xs pt-space-xs">
              <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">lock</span>
              <span>Staged in isolated 256-bit encrypted bidder container</span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE DOCUMENT CHECKLIST */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-space-lg">
          <div className="p-space-md lg:p-space-lg bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Statutory &amp; Technical Schedule</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Upload all stipulated certifications in PDF/A format with clear municipal or corporate seals.</p>
            </div>
            <button className="px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high font-label-md text-label-md text-primary font-semibold flex items-center gap-1 transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Refresh Parse Status</span>
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left font-body-md text-body-md border-collapse">
              <thead>
                <tr className="bg-surface-container-high/60 text-on-surface font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-space-md px-space-lg font-semibold">Document Name &amp; Specification</th>
                  <th className="py-space-md px-space-md font-semibold">Requirement</th>
                  <th className="py-space-md px-space-md font-semibold">Status</th>
                  <th className="py-space-md px-space-md font-semibold">Uploaded File Details</th>
                  <th className="py-space-md px-space-lg font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-on-surface">
                {DOCUMENT_ROWS.map((doc) => {
                  const badge = STATUS_BADGE[doc.status];
                  return (
                    <tr
                      key={doc.name}
                      className={
                        'transition-colors ' +
                        (doc.status === 'action-required'
                          ? 'bg-error-container/20 hover:bg-error-container/30'
                          : doc.status === 'processing'
                            ? 'bg-surface-container-low/30 hover:bg-surface-container-low'
                            : 'hover:bg-surface-container-low/60')
                      }
                    >
                      <td className="py-space-md px-space-lg align-top">
                        <div className="flex items-start gap-space-sm">
                          <span className={'material-symbols-outlined mt-0.5 text-[20px] ' + (doc.status === 'action-required' ? 'text-error' : doc.status === 'processing' ? 'text-on-tertiary-container' : 'text-secondary')}>
                            {doc.icon}
                          </span>
                          <div>
                            <div className={'font-label-lg text-label-lg font-bold ' + (doc.status === 'action-required' ? 'text-error' : 'text-primary')}>{doc.name}</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">{doc.desc}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md align-top">
                        <span
                          className={
                            'px-space-xs py-0.5 rounded font-label-sm text-label-sm font-semibold uppercase tracking-wider inline-block ' +
                            (doc.requirement === 'Mandatory' ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant')
                          }
                        >
                          {doc.requirement}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md align-top">
                        <span className={`inline-flex items-center gap-1 px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold ${badge.className}`}>
                          <span className={'material-symbols-outlined text-[14px]' + (doc.status === 'processing' ? ' animate-spin' : '')}>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-space-md px-space-md align-top">
                        {doc.fileName ? (
                          <div className="flex flex-col">
                            <span className="font-mono text-label-md font-semibold text-primary truncate max-w-xs">{doc.fileName}</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">{doc.fileMeta}</span>
                          </div>
                        ) : (
                          <span className="font-body-sm text-body-sm text-on-surface-variant italic">— Not provided (Upload pending)</span>
                        )}
                      </td>
                      <td className="py-space-md px-space-lg align-top text-right">
                        {doc.status === 'processing' ? (
                          <span className="text-outline text-label-sm font-semibold">Processing...</span>
                        ) : doc.status === 'action-required' ? (
                          <button className="px-space-md py-1.5 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary font-label-md text-label-md font-bold inline-flex items-center gap-1 transition-all shadow-sm" type="button">
                            <span className="material-symbols-outlined text-[16px]">upload</span>
                            <span>Upload Document</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-space-xs">
                            <button className="px-space-xs py-1 text-secondary hover:bg-surface-container rounded font-label-md text-label-md font-semibold transition-colors" type="button">Replace</button>
                            <span className="text-outline-variant">|</span>
                            <button className="px-space-xs py-1 text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded font-label-md text-label-md font-semibold transition-colors" type="button">Remove</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Active Upload Dropzone for the pending document */}
          {pendingRow && (
            <div className="p-space-lg bg-surface-container-low/40">
              <div className="max-w-4xl mx-auto flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-secondary text-[20px]">cloud_upload</span>
                    <span className="font-label-lg text-label-lg font-bold text-primary">Staging Zone: {pendingRow.name}</span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Max Size: 10 MB per file</span>
                </div>
                <div className="p-space-lg rounded-xl bg-surface-container-lowest flex flex-col items-center justify-center text-center gap-space-sm hover:bg-surface-container-low transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high group-hover:bg-surface-container text-secondary flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[28px]">file_upload</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="font-label-lg text-label-lg font-bold text-primary">
                      Drag &amp; drop your completed certificate here, or <span className="text-secondary underline decoration-secondary">browse local machine</span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">Supported file extensions: PDF, JPG, JPEG, PNG, XLS, XLSX (Clean scanned copy with visible seal)</div>
                  </div>
                  <div className="pt-space-xs">
                    <button className="px-space-lg py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-colors" type="button">
                      Browse Files
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STATUTORY INFORMATION & AUDIT NOTICE */}
        <div className="bg-surface-container-lowest p-space-md lg:p-space-lg rounded-xl shadow-sm mb-space-lg flex flex-col md:flex-row items-start gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">gavel</span>
          </div>
          <div className="flex flex-col gap-space-xs">
            <h4 className="font-label-lg text-label-lg font-bold text-primary">Statutory Document Verification Protocol</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Uploaded documents are staged in an encrypted, isolated workspace ledger and will only be formally decrypted upon Step 3
              cryptographic sign-off. The procurement engine strictly validates container integrity, file integrity hashes (SHA-256), and
              anti-tamper constraints. Uploading a document here does not constitute formal CPCL compliance approval or bid acceptance until
              public opening.
            </p>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-[250px] right-0 bg-surface-container-lowest shadow-md py-space-sm px-space-lg z-40 flex flex-col sm:flex-row items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm w-full sm:w-auto justify-between sm:justify-start">
          <button className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors" type="button">
            Save &amp; Exit Draft
          </button>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm pl-space-sm sm:border-l sm:border-outline-variant/40">
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
            <span>Auto-saved to cloud</span>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-space-xs text-error font-label-md text-label-md font-semibold">
          <span className="material-symbols-outlined text-[16px]">info</span>
          <span>1 mandatory document pending upload</span>
        </div>
        <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end">
          <button
            className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-semibold flex items-center gap-1 transition-colors"
            onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/1`)}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Basic Details</span>
          </button>
          <button
            className="px-space-lg py-2 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary font-label-md text-label-md font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
            onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/3`)}
            type="button"
          >
            <span>Continue to Confirm (Step 3)</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </BidderPortalShell>
  );
}
