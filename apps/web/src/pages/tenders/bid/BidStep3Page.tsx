// Bid Submission Workspace — Step 3: Review & confirm. Ported from Stitch
// screen "Bid Submission Workspace (Step 03: Review & Confirm)" (project
// 6921642772921774119, screen 7476c41c6e4a42d19be361cc8aa22aa5).
//
// Six prototype states (Review / Confirm modal / Submitting / Success /
// Error / Closed) are React state; the real flow (declarations → confirm →
// submitting → success) drives the same state.
//
// TODO: replace the demo submission timer with POST /api/tenders/:ref/bid/submit.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import {
  Button,
  Callout,
  Card,
  CardHeader,
  CellStack,
  Checkbox,
  DescriptionList,
  EmptyState,
  Icon,
  Modal,
  PageHeader,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  Tag,
} from '@/components/primitives';
import { cn } from '@/utils/cn';
import { BID_TENDER, BidActionBar, BidStepper, TenderContextBanner } from './BidWorkspaceChrome';

type ScreenState = 'default' | 'modal' | 'submitting' | 'success' | 'error' | 'closed';

const STATE_BUTTONS: { id: ScreenState; label: string }[] = [
  { id: 'default', label: 'Review' },
  { id: 'modal', label: 'Confirm modal' },
  { id: 'submitting', label: 'Submitting' },
  { id: 'success', label: 'Success' },
  { id: 'error', label: 'Error' },
  { id: 'closed', label: 'Closed' },
];

const DOCUMENTS_SUMMARY = [
  { n: '01', name: 'Permanent Account Number (PAN) card', desc: 'Statutory tax entity verification', file: 'PAN_Certificate.pdf', size: '1.2 MB', type: 'mandatory' as const, status: 'Staged & signed' },
  { n: '02', name: 'GST registration certificate', desc: 'Form GST REG-06 with annexures A & B', file: 'GST_Certificate.pdf', size: '856 KB', type: 'mandatory' as const, status: 'Staged & signed' },
  { n: '03', name: 'Audited financial statements (3 FYs)', desc: 'Balance sheet & P&L certified with UDIN', file: 'Financial_Statements_2025.pdf', size: '3.4 MB', type: 'mandatory' as const, status: 'Staged & signed' },
  { n: '04', name: 'Udyam / MSME certificate', desc: 'Exemption claim under PP Policy 2012', file: 'Udyam_Certificate.pdf', size: '642 KB', type: 'conditional' as const, status: 'EMD exemption claimed' },
  { n: '05', name: 'OEM Manufacturer Authorization (MAF)', desc: 'Direct OEM authorization for optics & NVRs', file: 'OEM_Authorization.pdf', size: '1.8 MB', type: 'mandatory' as const, status: 'Staged & signed' },
  { n: '06', name: 'Technical compliance statement (§IV)', desc: 'Line-by-line parameter compliance', file: 'Technical_Compliance.pdf', size: '2.1 MB', type: 'mandatory' as const, status: 'Staged & signed' },
  { n: '07', name: 'Experience & past work order certificate', desc: '3 similar public camera rollouts', file: 'Experience_Certificate.pdf', size: '1.5 MB', type: 'mandatory' as const, status: 'Staged & signed' },
];

const DECLARATIONS = [
  { id: 'decl-1', text: 'The information provided in this bid is accurate, authentic and complete to the best of my knowledge.', sub: 'CPCL Bidder Undertaking Norms, Clause 5.1' },
  { id: 'decl-2', text: 'All uploaded documents belong to the bidder and satisfy tender specifications without misrepresentation.', sub: 'Genuine OEM specifications and unaltered certified financials' },
  { id: 'decl-3', text: 'I have reviewed and agree to the GCC, SCC and CVC integrity guidelines.', sub: 'Anti-collusion, transparent bidding and prompt execution' },
];

const LOADER_STEPS = ['Validating bidder basic details', 'Validating 7 document digests', 'Recording in digital procurement ledger', 'Generating statutory receipt'];

export function BidStep3Page() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const tenderRef = ref ? decodeURIComponent(ref) : BID_TENDER.ref;

  const [screen, setScreen] = useState<ScreenState>('default');
  const [declarations, setDeclarations] = useState<Record<string, boolean>>({ 'decl-1': true, 'decl-2': true, 'decl-3': true });
  const [loaderStage, setLoaderStage] = useState<0 | 1>(0);

  const declaredCount = Object.values(declarations).filter(Boolean).length;
  const allDeclared = declaredCount === 3;

  useEffect(() => {
    if (screen !== 'submitting') {
      setLoaderStage(0);
      return;
    }
    const t1 = window.setTimeout(() => setLoaderStage(1), 1000);
    const t2 = window.setTimeout(() => setScreen('success'), 2200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [screen]);

  function openConfirmationModal() {
    if (!allDeclared) {
      window.alert('Please affirm all three statutory declarations prior to submitting the bid.');
      return;
    }
    setScreen('modal');
  }

  const doneSteps = loaderStage === 0 ? 2 : 3;
  const showWorkspace = screen === 'default' || screen === 'modal' || screen === 'submitting';

  return (
    <BidderPortalShell breadcrumb="Bid Submission">
      <div className={cn('flex flex-col gap-8', showWorkspace && 'pb-28')}>
        {/* Prototype state switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-outline-variant bg-surface-container-lowest/60 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-on-surface-variant">
            <Icon name="science" size="sm" className="text-outline" />
            Prototype states
          </span>
          <Tabs variant="pills" ariaLabel="Prototype state" value={screen} onChange={setScreen} items={STATE_BUTTONS} />
        </div>

        {showWorkspace && (
          <>
            <PageHeader
              breadcrumbs={[{ label: 'Tenders', to: '/tenders' }, { label: tenderRef, to: `/tenders/${encodeURIComponent(tenderRef)}` }, { label: 'Bid submission' }]}
              eyebrow={<StatusBadge tone="info">Step 3 of 3 · final</StatusBadge>}
              title="Review & confirm"
              description="Check your details and documents, affirm the statutory declarations, then seal and submit."
              actions={
                <span className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
                  <Icon name="verified_user" size="md" className="text-success" />
                  Encrypted workspace · autosaved
                </span>
              }
            />

            <TenderContextBanner tenderRef={tenderRef} />
            <BidStepper current={3} />

            <Callout tone="warning" title={<span className="flex flex-wrap items-center gap-2">CVC procurement advisory <Tag mono>CLAUSE-24.B</Tag></span>}>
              Once submitted, the bid cannot be edited unless the tender authority issues a formal corrigendum permitting revision or withdrawal. Verify that credentials and specifications match the tender mandates.
            </Callout>

            {/* 1. Bidder details */}
            <Card padding="lg">
              <CardHeader
                icon="corporate_fare"
                title="1 · Bidder details"
                description="Validated corporate identity from the vendor registry"
                actions={
                  <Button variant="secondary" size="sm" leftIcon="edit" onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/1`)}>
                    Edit
                  </Button>
                }
              />
              <DescriptionList
                columns={3}
                items={[
                  { label: 'Registered entity', value: <CellStack primary="ABC Engineering Pvt Ltd" secondary={<span className="font-mono">BIDDER-00482</span>} /> },
                  { label: 'Authorized signatory', value: <CellStack primary="Arun Kumar" secondary="Procurement Manager" /> },
                  { label: 'Registered address', value: '45 Industrial Estate Road, Guindy, Chennai, TN 600032' },
                  {
                    label: 'Mobile',
                    value: (
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono">+91 98401 23456</span>
                        <StatusBadge status="verified">OTP verified</StatusBadge>
                      </span>
                    ),
                  },
                  { label: 'Official e-mail', value: <span className="font-mono text-[13px]">procurement@abcengineering.example</span> },
                  { label: 'Corporate PAN', value: <span className="font-mono">ABCDE1234F</span> },
                  { label: 'GSTIN', value: <span className="font-mono">33ABCDE1234F1Z5 <span className="font-sans text-on-surface-variant">· TN (33)</span></span> },
                  { label: 'CIN', value: <span className="font-mono">U12345TN2020PTC000000</span> },
                  { label: 'Udyam MSME', value: <span className="font-mono">UDYAM-TN-00-0000000</span> },
                ]}
              />
              <Callout tone="success" icon="verified" title="Eligible for tender fee & EMD waiver (GoI policy)" className="mt-6 !p-3.5">
                Micro & Small Enterprise registration validated. <span className="font-mono text-[12px]">KYC-2026-VAL-9912</span>
              </Callout>
            </Card>

            {/* 2. Documents */}
            <Card padding="none" className="overflow-hidden">
              <div className="px-6 pt-6 sm:px-7">
                <CardHeader
                  icon="folder_managed"
                  title="2 · Uploaded documents"
                  description="All files are hashed and staged in the vault"
                  actions={
                    <>
                      <StatusBadge status="uploaded">7 of 7 staged</StatusBadge>
                      <Button variant="secondary" size="sm" leftIcon="visibility" onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/2`)}>
                        Review
                      </Button>
                    </>
                  }
                />
              </div>
              <Table minWidth={820}>
                <THead>
                  <tr>
                    <Th className="w-14 pl-6">#</Th>
                    <Th>Document</Th>
                    <Th>File</Th>
                    <Th align="right">Size</Th>
                    <Th>Class</Th>
                    <Th align="right" className="pr-6">
                      Integrity
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {DOCUMENTS_SUMMARY.map((doc) => (
                    <Tr key={doc.n}>
                      <Td className="pl-6 font-mono text-[12.5px] text-on-surface-variant">{doc.n}</Td>
                      <Td>
                        <CellStack primary={doc.name} secondary={doc.desc} />
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] text-secondary">
                          <Icon name="picture_as_pdf" size="sm" />
                          {doc.file}
                        </span>
                      </Td>
                      <Td align="right" className="text-[13px] text-on-surface-variant num">
                        {doc.size}
                      </Td>
                      <Td>
                        <StatusBadge status={doc.type} />
                      </Td>
                      <Td align="right" className="pr-6">
                        <StatusBadge status="sealed">{doc.status}</StatusBadge>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
              <div className="border-t border-outline-variant bg-surface-container-low/60 px-6 py-4 text-body-sm text-on-surface-variant">
                <strong className="font-semibold text-on-surface">Verification protocol:</strong> documents are decrypted and verified after official tender opening. Upload confirmation proves cryptographic integrity, not statutory compliance or technical acceptance.
              </div>
            </Card>

            {/* 3. Declarations */}
            <Card padding="lg">
              <CardHeader
                icon="assignment_turned_in"
                title="3 · Statutory declarations"
                description="Mandatory legal and integrity affirmations required by CVC"
                actions={<StatusBadge tone={allDeclared ? 'success' : 'danger'}>{declaredCount} of 3 affirmed</StatusBadge>}
              />
              <div className="flex flex-col gap-3">
                {DECLARATIONS.map((decl) => (
                  <Checkbox key={decl.id} checked={declarations[decl.id]} onChange={(e) => setDeclarations((prev) => ({ ...prev, [decl.id]: e.target.checked }))} label={decl.text} description={decl.sub} />
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-outline-variant bg-surface-container-low p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-control bg-surface-container-lowest text-secondary shadow-xs">
                    <Icon name="token" size="lg" />
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold text-on-surface">Arun Kumar · Procurement Manager</div>
                    <div className="font-mono text-[12px] text-on-surface-variant">Class-3 DSC token CPCL-DSC-V3-IND-8849 · ready & bound</div>
                  </div>
                </div>
                <StatusBadge status="verified">DSC verified</StatusBadge>
              </div>
              <p className="mt-4 text-body-sm text-on-surface-variant">False declarations may invite penal action including debarment under public procurement rules.</p>
            </Card>

            {/* 4. Readiness */}
            <Card padding="lg">
              <CardHeader icon="fact_check" title="4 · Before you submit" description="Final readiness checkpoint" />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[
                  { label: 'Tender', value: <span className="font-mono text-[13px]">{tenderRef}</span>, ok: true },
                  { label: 'Deadline', value: '04 Oct, 17:00', ok: true },
                  { label: 'Bid state', value: 'Draft · ready', ok: true },
                  { label: 'Mandatory files', value: '7 of 7', ok: true },
                  { label: 'Declarations', value: `${declaredCount} of 3`, ok: allDeclared },
                ].map((t) => (
                  <div key={t.label} className={cn('rounded-card border p-4', t.ok ? 'border-outline-variant bg-surface-container-low' : 'border-danger-border bg-danger-container')}>
                    <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-on-surface-variant">
                      {t.label}
                      <Icon name={t.ok ? 'check_circle' : 'error'} size="sm" fill className={t.ok ? 'text-success' : 'text-danger'} />
                    </div>
                    <div className="mt-1 truncate text-[14px] font-semibold text-on-surface">{t.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-card bg-navy px-4 py-3.5 text-body-md text-white/85">
                <Icon name="gavel" size="lg" className="text-saffron" />
                <span>
                  Your bid is recorded as submitted only after selecting <strong className="text-white">Submit bid</strong> and confirming the irreversible prompt.
                </span>
              </div>
            </Card>
          </>
        )}

        {screen === 'error' && (
          <Card>
            <EmptyState
              tone="danger"
              icon="error"
              title="Submission couldn't be completed"
              description="The cryptographic handshake with the CPCL digital vault was interrupted. Your draft is safe and unchanged."
              actions={
                <>
                  <Button variant="secondary" onClick={() => setScreen('default')}>
                    Return to review
                  </Button>
                  <Button leftIcon="refresh" onClick={() => setScreen('submitting')}>
                    Retry submission
                  </Button>
                </>
              }
            >
              <Callout tone="danger" title={<span className="flex flex-wrap items-center justify-between gap-2">DSC token response timeout <Tag mono>ERR-DSC-TIMEOUT-504</Tag></span>} className="text-left">
                The Digital Signature Certificate token didn't respond within 30 seconds. Make sure the USB crypto token is seated properly and the DSC utility driver is running.
              </Callout>
            </EmptyState>
          </Card>
        )}

        {screen === 'closed' && (
          <Card>
            <EmptyState
              icon="timer_off"
              title="Submission window closed"
              description={
                <>
                  The deadline for <span className="font-mono text-on-surface">{tenderRef}</span> passed on 04 Oct 2026 at 17:00:00 IST. Under CVC regulations no further bids or revisions can be accepted.
                </>
              }
              actions={
                <Button variant="secondary" leftIcon="space_dashboard" onClick={() => navigate('/dashboard')}>
                  Back to dashboard
                </Button>
              }
            >
              <Card tone="subtle" padding="sm" className="mx-auto max-w-md text-left">
                <DescriptionList
                  items={[
                    { label: 'Tender reference', value: <span className="font-mono">{tenderRef}</span> },
                    { label: 'Server lock', value: <span className="font-mono">04-OCT-2026 17:00:01 IST</span> },
                    { label: 'Draft state', value: <StatusBadge tone="danger">Expired · not submitted</StatusBadge> },
                  ]}
                />
              </Card>
            </EmptyState>
          </Card>
        )}

        {screen === 'success' && (
          <Card padding="none" className="overflow-hidden">
            <div className="h-1 bg-success" aria-hidden="true" />
            <EmptyState
              tone="success"
              icon="verified"
              title="Bid submitted successfully"
              description={`Your bid for ${BID_TENDER.title} has been sealed and recorded in the CPCL e-Procurement digital vault.`}
              actions={
                <>
                  <Button variant="brand" leftIcon="download" onClick={() => window.alert('Initiating download of Official Bid Receipt SR-2026-00418.pdf')}>
                    Download receipt (PDF)
                  </Button>
                  <Button variant="secondary" leftIcon="visibility" onClick={() => navigate('/my-bids/BID-2026-00418')}>
                    View submission details
                  </Button>
                  <Button variant="ghost" onClick={() => setScreen('default')}>
                    Back to workspace
                  </Button>
                </>
              }
            >
              <div className="rounded-card border border-outline-variant bg-surface-container-low p-6 text-left">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Official e-procurement receipt</span>
                  <Tag mono>SR-2026-00418</Tag>
                </div>
                <DescriptionList
                  columns={2}
                  items={[
                    { label: 'Submission reference', value: <span className="font-mono text-secondary">BID-2026-00418</span> },
                    { label: 'Timestamp', value: <span className="num">04 Oct 2026, 16:42:18 IST</span> },
                    { label: 'Tender reference', value: <span className="font-mono">{tenderRef}</span> },
                    { label: 'Documents', value: '7 · SHA-256 digests verified' },
                    { label: 'Bidder', value: 'ABC Engineering Pvt Ltd (BIDDER-00482)' },
                    { label: 'Status', value: <StatusBadge status="sealed">Submitted · sealed</StatusBadge> },
                  ]}
                />
                <div className="mt-5 rounded-control bg-surface-container-lowest p-3 font-mono text-[11.5px] break-all text-on-surface-variant">
                  0x8F3A29B8C401D9E74A25F883B10467AC231EFD084C9A23E099A7BF2231A88FE3
                </div>
                <p className="mt-4 flex items-start gap-2 text-body-sm text-on-surface-variant">
                  <Icon name="lock_clock" size="sm" className="mt-0.5 text-secondary" />
                  Documents remain encrypted until the public technical opening on <strong className="text-on-surface">05 Oct 2026, 11:00 IST</strong>.
                </p>
              </div>
            </EmptyState>
          </Card>
        )}
      </div>

      {showWorkspace && (
        <BidActionBar
          left={
            <Button variant="ghost" leftIcon="arrow_back" onClick={() => navigate(`/tenders/${encodeURIComponent(tenderRef)}/bid/2`)}>
              Back to documents
            </Button>
          }
          center={
            <span className="inline-flex items-center gap-2 text-[13px] text-on-surface-variant">
              <Icon name="alarm" size="sm" />
              Closes <strong className="font-semibold text-on-surface num">{BID_TENDER.deadline}</strong>
            </span>
          }
          right={
            <>
              <Button variant="secondary">Save & exit</Button>
              <Button size="lg" leftIcon="lock" disabled={!allDeclared} onClick={openConfirmationModal}>
                Submit bid
              </Button>
            </>
          }
        />
      )}

      <Modal
        open={screen === 'modal'}
        onClose={() => setScreen('default')}
        icon="lock"
        title="Confirm final bid submission"
        description={<span className="font-mono">Tender {tenderRef}</span>}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScreen('default')}>
              Cancel
            </Button>
            <Button leftIcon="lock" onClick={() => setScreen('submitting')}>
              Confirm & submit
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-body-md text-on-surface">
            You're about to submit your bid for <strong>{BID_TENDER.title}</strong>. Confirm you have reviewed all information and documents.
          </p>
          <Callout tone="danger" icon="warning" title="This action is irreversible">
            The draft will be cryptographically locked and recorded as submitted. No further changes are possible unless a formal corrigendum authorizes them.
          </Callout>
          <Card tone="subtle" padding="sm">
            <DescriptionList
              items={[
                { label: 'Bid draft', value: <span className="font-mono">{BID_TENDER.draftId}</span> },
                { label: 'Signatory', value: 'Arun Kumar · Class-3 DSC active' },
                { label: 'Staged files', value: '7 files · 7.6 MB' },
              ]}
            />
          </Card>
        </div>
      </Modal>

      {screen === 'submitting' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-900/60 p-6 backdrop-blur-sm animate-fade-in" role="alertdialog" aria-modal="true" aria-label="Submitting bid">
          <div className="w-full max-w-md rounded-panel bg-surface-container-lowest p-8 text-center shadow-overlay animate-scale-in">
            <div className="relative mx-auto mb-6 h-16 w-16">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-surface-container border-t-secondary" />
              <Icon name="vpn_key" size="xl" className="absolute inset-0 m-auto h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-headline-md text-on-surface">Submitting your bid…</h3>
            <p className="mt-1.5 text-body-sm text-on-surface-variant">Don't refresh or leave while the vault seals your bid.</p>
            <ol className="mt-6 flex flex-col gap-3 rounded-card bg-surface-container-low p-5 text-left">
              {LOADER_STEPS.map((label, i) => {
                const done = i < doneSteps;
                const active = i === doneSteps;
                return (
                  <li key={label} className={cn('flex items-center gap-3 text-[14px]', done ? 'text-success-on-container' : active ? 'font-semibold text-on-surface' : 'text-outline')}>
                    {done ? (
                      <Icon name="check_circle" size="md" fill className="text-success" />
                    ) : active ? (
                      <span className="inline-block h-[18px] w-[18px] animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                    ) : (
                      <span className="inline-block h-[18px] w-[18px] rounded-full border-2 border-outline-variant" />
                    )}
                    {label}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </BidderPortalShell>
  );
}
