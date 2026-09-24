// Bid Details — ported from Stitch screen "CPCL Bidder Portal - Bid Details
// (BID-2026-00418)" (project 6921642772921774119, screen
// 802fc0c5e7dd4dd2861318803ee9c6f6), rebuilt on the shared design system.
// Renders the one submitted bid the screen was built for regardless of
// :bidId. The three modals (document preview, tender specs, receipt) are
// React state.
//
// TODO: GET /api/bids/:bidId once the gateway exposes it.

import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { BidderPortalShell } from '@/layouts/BidderPortalShell';
import {
  Button,
  Callout,
  Card,
  CardHeader,
  DescriptionList,
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
  Tag,
} from '@/components/primitives';
import { cn } from '@/utils/cn';

const BID = {
  bidId: 'BID-2026-00418',
  receiptNo: 'SR-2026-00418',
  ref: 'CPCL/PROC/2026/041',
  title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
  submittedOn: '04 Oct 2026, 16:42 IST',
  submittedExact: '04 Oct 2026, 16:42:09 IST',
  closes: '04 Oct 2026, 17:00 IST',
};

type StepState = 'done' | 'active' | 'processing' | 'pending';

const TIMELINE: { label: string; status: string; date: string; state: StepState }[] = [
  { label: 'Draft', status: 'Completed', date: '30 Sep 2026', state: 'done' },
  { label: 'Submitted', status: 'Active & sealed', date: '04 Oct, 16:42', state: 'active' },
  { label: 'Processing', status: 'Document intake', date: 'In progress', state: 'processing' },
  { label: 'Intake status', status: 'System validated', date: 'Scheduled', state: 'pending' },
  { label: 'Tender closure', status: 'Window closing', date: '04 Oct, 17:00', state: 'pending' },
  { label: 'Committee scrutiny', status: 'Opening session', date: 'Post-deadline', state: 'pending' },
  { label: 'Outcome', status: 'Final award', date: 'Pending', state: 'pending' },
];

interface DocRow {
  icon: string;
  name: string;
  type: 'mandatory' | 'emd';
  file: string;
  size: string;
  detail: string;
}

const DOCUMENTS: DocRow[] = [
  { icon: 'badge', name: 'Permanent Account Number (PAN) certificate', type: 'mandatory', file: 'PAN_Certificate.pdf', size: '1.2 MB', detail: 'ABCDE1234F · Form 49A verified' },
  { icon: 'receipt_long', name: 'GST registration certificate', type: 'mandatory', file: 'GST_Certificate.pdf', size: '856 KB', detail: 'GSTIN 33ABCDE1234F1Z5 · active taxpayer' },
  { icon: 'account_balance', name: 'Audited financial statements (3 FYs)', type: 'mandatory', file: 'Financial_Statements_2025.pdf', size: '3.4 MB', detail: 'CA certified · UDIN 24098231AB8912' },
  { icon: 'card_membership', name: 'Udyam / MSME certificate', type: 'emd', file: 'Udyam_Certificate.pdf', size: '642 KB', detail: 'UDYAM-TN-00-0000000 · NIC 26309' },
  { icon: 'domain_verification', name: 'OEM authorization form (MAF)', type: 'mandatory', file: 'OEM_Authorization.pdf', size: '1.8 MB', detail: 'Authorized partner ref #MAF-CPCL-2026-90' },
  { icon: 'fact_check', name: 'Technical compliance statement (§IV)', type: 'mandatory', file: 'Technical_Compliance.pdf', size: '2.1 MB', detail: 'Schedule IV clauses accepted item-by-item' },
  { icon: 'history', name: 'Experience & past work order certificate', type: 'mandatory', file: 'Experience_Certificate.pdf', size: '1.5 MB', detail: 'Public sector execution letters included' },
];

const NEXT_STEPS: { label: string; body: ReactNode }[] = [
  { label: 'Tender closure', body: <>Bidding closes strictly at <strong>17:00 IST on 04 Oct 2026</strong>. No revisions after the cut-off.</> },
  { label: 'Committee scrutiny', body: 'The CPCL evaluation committee begins technical and statutory scrutiny under dual-key authorization.' },
  { label: 'Clarifications', body: 'Any clarification requests will appear here and arrive by registered email.' },
  { label: 'Commercial opening', body: 'Only technically qualified bidders proceed to price-bid opening; results are published.' },
];

type ModalKind = null | 'document' | 'tenderSpecs' | 'receipt';

export function BidDetailsPage() {
  const { bidId } = useParams<{ bidId: string }>();
  const displayBidId = bidId ? decodeURIComponent(bidId) : BID.bidId;
  const [modal, setModal] = useState<ModalKind>(null);
  const [activeDoc, setActiveDoc] = useState<DocRow | null>(null);
  const close = () => setModal(null);

  return (
    <BidderPortalShell breadcrumb="My Bids">
      <div className="flex flex-col gap-10">
        <PageHeader
          breadcrumbs={[{ label: 'My bids', to: '/my-bids' }, { label: BID.ref }, { label: 'Bid details' }]}
          eyebrow={
            <>
              <Tag mono>{BID.ref}</Tag>
              <StatusBadge status="submitted">Submitted · 04 Oct, 16:42 IST</StatusBadge>
              <StatusBadge tone="neutral" icon="lock">
                Read-only record
              </StatusBadge>
            </>
          }
          title={BID.title}
          meta={
            <span className="inline-flex items-center gap-1.5">
              <Icon name="verified_user" size="sm" className="text-success" />
              Permanent submission reference <span className="font-mono font-medium text-on-surface">{displayBidId}</span>
            </span>
          }
          actions={
            <>
              <Button variant="secondary" leftIcon="arrow_back" to="/my-bids">
                My bids
              </Button>
              <Button leftIcon="download" onClick={() => setModal('receipt')}>
                Submission receipt
              </Button>
            </>
          }
        />

        {/* Lifecycle */}
        <Card padding="lg">
          <CardHeader
            icon="history_edu"
            title="Bid status & lifecycle"
            description="Read-only milestone tracking under CPCL procurement bylaws"
            actions={
              <StatusBadge tone="success" icon="lock">
                Sealed in ledger
              </StatusBadge>
            }
          />
          <div className="mb-8 grid grid-cols-2 gap-4 rounded-card border border-outline-variant/70 bg-surface-container-low p-4 lg:grid-cols-4">
            {[
              { label: 'Submission ref', value: <span className="font-mono">{displayBidId}</span> },
              { label: 'Submitted on', value: BID.submittedOn },
              {
                label: 'Tender closes',
                value: (
                  <span className="flex flex-wrap items-center gap-2">
                    {BID.closes} <StatusBadge status="closing-soon">18 min</StatusBadge>
                  </span>
                ),
              },
              { label: 'DSC signatory', value: 'Arun Kumar · Class-3' },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-[12px] font-medium text-on-surface-variant">{m.label}</div>
                <div className="mt-0.5 text-[14px] font-semibold text-on-surface num">{m.value}</div>
              </div>
            ))}
          </div>

          {/* Horizontal ≥md, vertical <md */}
          <ol className="relative flex flex-col gap-5 md:flex-row md:gap-0">
            {TIMELINE.map((step, i) => {
              const last = i === TIMELINE.length - 1;
              return (
                <li key={step.label} className="relative flex gap-4 md:flex-1 md:flex-col md:items-center md:gap-3 md:text-center">
                  {!last && <span className={cn('absolute left-[17px] top-9 h-[calc(100%-4px)] w-0.5 md:left-1/2 md:top-[17px] md:ml-[18px] md:h-0.5 md:w-[calc(100%-36px)]', step.state === 'done' || step.state === 'active' ? 'bg-success' : 'bg-outline-variant')} aria-hidden="true" />}
                  <span
                    className={cn(
                      'relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold num',
                      step.state === 'done' && 'bg-success text-white',
                      step.state === 'active' && 'bg-secondary text-white ring-4 ring-secondary/15',
                      step.state === 'processing' && 'border-2 border-secondary bg-surface-container-lowest',
                      step.state === 'pending' && 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant',
                    )}
                  >
                    {step.state === 'done' || step.state === 'active' ? <Icon name="check" size="md" /> : step.state === 'processing' ? <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-secondary" /> : i + 1}
                  </span>
                  <div className="pb-1 md:px-2">
                    <div className={cn('text-[14px] font-semibold', step.state === 'pending' ? 'text-on-surface-variant' : 'text-on-surface')}>{step.label}</div>
                    <div className={cn('text-[12px] font-medium', step.state === 'active' || step.state === 'done' ? 'text-success-on-container' : step.state === 'processing' ? 'text-secondary' : 'text-outline')}>{step.status}</div>
                    <div className="text-[12px] text-on-surface-variant num">{step.date}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* Particulars */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card padding="lg" className="flex flex-col">
            <CardHeader
              icon="description"
              title="Tender summary"
              actions={
                <Button variant="ghost" size="sm" rightIcon="arrow_forward" onClick={() => setModal('tenderSpecs')}>
                  Specs
                </Button>
              }
              className="mb-2"
            />
            <DescriptionList
              items={[
                { label: 'Tender reference', value: <span className="font-mono">{BID.ref}</span> },
                { label: 'Procuring authority', value: 'CPCL · Manali Refinery' },
                { label: 'Category & type', value: 'Open domestic · goods & hardware' },
                { label: 'Estimated value', value: <span className="num">₹42,50,000</span> },
                { label: 'Submission deadline', value: BID.closes },
                { label: 'Bid validity', value: '90 days from technical opening' },
                { label: 'EMD', value: <StatusBadge status="verified">Exempted · Udyam MSME</StatusBadge> },
              ]}
            />
          </Card>
          <Card padding="lg" className="flex flex-col">
            <CardHeader
              icon="corporate_fare"
              title="Bidder details (as submitted)"
              actions={
                <StatusBadge tone="neutral" icon="lock">
                  Locked
                </StatusBadge>
              }
              className="mb-2"
            />
            <DescriptionList
              items={[
                { label: 'Registered legal name', value: 'ABC Engineering Pvt Ltd' },
                { label: 'Operating address', value: 'Guindy, Chennai, TN 600032' },
                { label: 'Authorized signatory', value: 'Arun Kumar · Procurement Manager' },
                { label: 'Contact', value: <span className="font-mono text-[13px]">+91 98401 23456</span> },
                { label: 'PAN', value: <span className="font-mono">ABCDE1234F</span> },
                {
                  label: 'GSTIN',
                  value: (
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      33ABCDE1234F1Z5 <Icon name="check_circle" size="sm" fill className="text-success" />
                    </span>
                  ),
                },
                { label: 'Udyam MSME', value: <span className="font-mono text-[13px]">UDYAM-TN-00-0000000</span> },
              ]}
            />
          </Card>
        </div>

        {/* Documents */}
        <Card padding="none" className="overflow-hidden">
          <div className="px-6 pt-6 sm:px-7">
            <CardHeader
              icon="folder_special"
              title="Submitted documents"
              description="Encrypted, digitally signed and deposited in the CPCL tender vault"
              actions={<StatusBadge status="sealed">7 of 7 sealed</StatusBadge>}
            />
          </div>
          <Table minWidth={820}>
            <THead>
              <tr>
                <Th className="pl-6">Document</Th>
                <Th>Requirement</Th>
                <Th>File</Th>
                <Th>Vault</Th>
                <Th align="right" className="pr-6">
                  <span className="sr-only">Action</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {DOCUMENTS.map((doc) => (
                <Tr key={doc.file}>
                  <Td className="pl-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-info-container text-secondary">
                        <Icon name={doc.icon} size="md" />
                      </span>
                      <span className="font-medium">{doc.name}</span>
                    </div>
                  </Td>
                  <Td>{doc.type === 'emd' ? <StatusBadge tone="warning">EMD waiver</StatusBadge> : <StatusBadge status="mandatory" />}</Td>
                  <Td>
                    <span className="font-mono text-[12.5px]">{doc.file}</span> <span className="text-body-sm text-on-surface-variant">· {doc.size}</span>
                  </Td>
                  <Td>
                    <StatusBadge status="sealed">Uploaded & sealed</StatusBadge>
                  </Td>
                  <Td align="right" className="pr-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon="visibility"
                      onClick={() => {
                        setActiveDoc(doc);
                        setModal('document');
                      }}
                    >
                      View
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <div className="flex flex-col gap-2 border-t border-outline-variant bg-surface-container-low/60 px-6 py-4 text-body-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <Icon name="security" size="sm" className="text-secondary" />
              Inspection is restricted to authorized tender opening officials after the deadline.
            </span>
            <span className="font-mono text-[12px]">SHA-256 digest validated</span>
          </div>
        </Card>

        {/* Receipt + next steps */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card padding="lg" className="relative flex flex-col overflow-hidden lg:col-span-5">
            <Icon name="verified" size="2xl" className="pointer-events-none absolute -bottom-4 -right-4 !text-[120px] text-surface-container" />
            <CardHeader icon="receipt" title="Official submission receipt" actions={<StatusBadge status="verified">Validated</StatusBadge>} />
            <div className="relative flex flex-col gap-3 rounded-card border border-outline-variant/70 bg-surface-container-low p-4">
              <DescriptionList
                items={[
                  { label: 'Receipt number', value: <span className="font-mono font-semibold">{BID.receiptNo}</span> },
                  { label: 'Submission ref', value: <span className="font-mono">{displayBidId}</span> },
                  { label: 'Timestamp', value: <span className="num">{BID.submittedExact}</span> },
                  { label: 'Vault deposit', value: <StatusBadge status="submitted">Recorded</StatusBadge> },
                ]}
              />
              <div className="rounded-control bg-surface-container-lowest p-2.5 font-mono text-[11px] break-all text-on-surface-variant">SHA-256 7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e41c</div>
            </div>
            <Button variant="brand" leftIcon="picture_as_pdf" className="relative mt-5" fullWidth onClick={() => setModal('receipt')}>
              Download official PDF receipt
            </Button>
          </Card>

          <Card padding="lg" className="flex flex-col lg:col-span-7">
            <CardHeader icon="forward_circle" title="What happens next" description="Your bid is sealed; the system will process the documents and generate a baseline compliance assessment." />
            <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {NEXT_STEPS.map((step, i) => (
                <li key={step.label} className="flex gap-3 rounded-card border border-outline-variant/70 bg-surface-container-low p-4">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-[13px] font-semibold text-secondary shadow-xs num">{i + 1}</span>
                  <div>
                    <div className="text-[14px] font-semibold text-on-surface">{step.label}</div>
                    <p className="mt-0.5 text-body-sm text-on-surface-variant [&_strong]:text-on-surface">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Callout tone="info" icon="support_agent" className="mt-5">
              For urgent portal or encryption issues call <strong>044-2594 4000</strong> (ext. 218) quoting <span className="font-mono">{displayBidId}</span>.
            </Callout>
          </Card>
        </div>

        <Card tone="subtle" padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
            <Icon name="verified_user" size="sm" className="text-success" />
            Vendor isolation active · record <span className="font-mono text-on-surface">{displayBidId}</span> belongs to <span className="font-mono text-on-surface">BIDDER-00482</span>
          </span>
          <Button variant="secondary" size="sm" leftIcon="arrow_back" to="/my-bids">
            Back to my bids
          </Button>
        </Card>
      </div>

      <Modal
        open={modal === 'document' && !!activeDoc}
        onClose={close}
        icon="description"
        title={activeDoc?.name ?? ''}
        description={activeDoc?.detail}
        footer={
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
        }
      >
        {activeDoc && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Tag mono>{activeDoc.file}</Tag>
                <span className="text-body-sm text-on-surface-variant">{activeDoc.size}</span>
              </span>
              <StatusBadge status="sealed">Sealed in vault</StatusBadge>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-outline-variant bg-surface-container-low px-6 py-12 text-center">
              <Icon name="verified" size="2xl" className="text-secondary" />
              <p className="text-headline-sm text-on-surface">Digitally signed & sealed document</p>
              <p className="max-w-md text-body-sm text-on-surface-variant">Verified asset for {displayBidId}. Signature of Arun Kumar (Procurement Manager) validated with a SHA-256 fingerprint.</p>
              <span className="mt-2 rounded-control bg-surface-container-lowest px-3 py-1 font-mono text-[11px] break-all text-on-surface-variant">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
            </div>
            <DescriptionList
              columns={2}
              items={[
                { label: 'Uploaded by', value: 'Arun Kumar (Procurement Mgr)' },
                { label: 'Signing authority', value: 'eMudhra Class-3 CA' },
              ]}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={modal === 'tenderSpecs'}
        onClose={close}
        icon="article"
        title="Tender specifications summary"
        description={`${BID.ref} · Manali Refinery`}
        footer={
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          <Card tone="subtle" padding="sm">
            <div className="text-[14px] font-semibold text-on-surface">Scope of procurement</div>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Supply, installation, testing and commissioning of HD industrial CCTV units, NVR infrastructure, redundant fibre backhaul switches and unified video analytics for CPCL Manali Refinery perimeter and zone security.
            </p>
          </Card>
          <DescriptionList
            columns={2}
            items={[
              { label: 'Delivery schedule', value: '60 days from PO' },
              { label: 'Warranty', value: '36 months comprehensive on-site' },
              { label: 'Inspection agency', value: 'CPCL QA/QC Directorate' },
              { label: 'Payment terms', value: '90% on delivery, 10% on PBG' },
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={modal === 'receipt'}
        onClose={close}
        tone="brand"
        icon="verified"
        size="md"
        title="CPCL e-Procurement receipt"
        description="Government of India enterprise undertaking"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
            <Button leftIcon="print" onClick={() => window.print()}>
              Print / save PDF
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 rounded-card border-2 border-dashed border-outline-variant p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-bold tracking-wide text-on-surface">CHENNAI PETROLEUM CORPORATION LIMITED</p>
              <p className="text-[12px] text-on-surface-variant">e-Tendering Directorate · Manali Refinery, Chennai</p>
            </div>
            <StatusBadge status="verified">Valid bid</StatusBadge>
          </div>
          <DescriptionList
            items={[
              { label: 'Receipt no.', value: <span className="font-mono font-semibold">{BID.receiptNo}</span> },
              { label: 'Bid reference', value: <span className="font-mono">{displayBidId}</span> },
              { label: 'Tender notice', value: <span className="font-mono">{BID.ref}</span> },
              { label: 'Bidder', value: 'ABC Engineering Pvt Ltd (BIDDER-00482)' },
              { label: 'Intake timestamp', value: <span className="num">04-OCT-2026 16:42:09 IST</span> },
              { label: 'Files encrypted', value: '7 sealed statutory assets' },
            ]}
          />
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-on-surface-variant">Digital signature hash</div>
            <div className="rounded-control bg-surface-container-low p-2.5 font-mono text-[11px] break-all text-on-surface">SHA256:7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e41c</div>
          </div>
          <p className="text-center text-[11px] text-on-surface-variant">Computer-generated sovereign acknowledgment. No physical signature required.</p>
        </div>
      </Modal>
    </BidderPortalShell>
  );
}
