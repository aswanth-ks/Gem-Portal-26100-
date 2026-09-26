// Procurement Officer — Bid Assessment. "Open bid" shows the automated
// assessment summary (requirement checks, findings, evidence references).
// The bidder's actual files are a separate, controlled action: "Open
// documents" asks for confirmation and records an audit event. The officer
// records the review; the system never decides qualification.
//
// TODO: GET /api/officer/bids/:ref/:bidId/assessment; POST audit event on
// document access.

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Callout, Card, CardHeader, DescriptionList, EmptyState, Icon, Modal, PageHeader, StatusBadge, Table, TBody, Td, Th, THead, Toast, Tr } from '@/components/primitives';
import { bidsFor, findTender, refToSlug } from './bidsData';

interface Check {
  requirement: string;
  evidence: string;
  source: string;
  result: 'verified' | 'finding';
  note?: string;
}

function checksFor(findings: boolean): Check[] {
  return [
    { requirement: 'PAN Certificate', evidence: 'PAN_Card.pdf, p.1', source: 'Tender Document, Pg. 12', result: 'verified' },
    { requirement: 'GST Registration Certificate', evidence: 'GST_Certificate.pdf, p.1', source: 'Tender Document, Pg. 12', result: 'verified' },
    { requirement: 'Average Annual Turnover ≥ ₹50 Lakhs', evidence: 'Audited_Financials_FY22-25.pdf, p.4', source: 'Tender Document, Pg. 18', result: 'verified' },
    findings
      ? { requirement: 'OEM Authorization (valid on bid date)', evidence: 'OEM_Authorization.pdf, p.1', source: 'Tender Document, Pg. 20', result: 'finding', note: 'Letter validity ended 15 Sep 2026, before the bid submission date.' }
      : { requirement: 'OEM Authorization (valid on bid date)', evidence: 'OEM_Authorization.pdf, p.1', source: 'Tender Document, Pg. 20', result: 'verified' },
    { requirement: 'Relevant Experience Certificate', evidence: 'Completion_Certificate_2024.pdf, p.2', source: 'Tender Document, Pg. 19', result: 'verified' },
    { requirement: 'Technical Compliance Statement', evidence: 'Tech_Compliance_Sheet.xlsx', source: 'Technical Specification, Pg. 11', result: 'verified' },
  ];
}

const FILES = ['PAN_Card.pdf', 'GST_Certificate.pdf', 'Audited_Financials_FY22-25.pdf', 'OEM_Authorization.pdf', 'Completion_Certificate_2024.pdf', 'Tech_Compliance_Sheet.xlsx'];

const stamp = () =>
  new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }) + ' IST';

export function BidAssessmentPage() {
  const { ref, bidId } = useParams();
  const tender = findTender(ref);
  const bid = tender && bidsFor(tender).find((b) => b.id === bidId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTime, setConfirmTime] = useState('');
  const [docsOpen, setDocsOpen] = useState(false);
  const [audit, setAudit] = useState<{ event: string; time: string }[]>([{ event: 'Assessment summary viewed', time: stamp() }]);
  const [reviewed, setReviewed] = useState(bid?.assessment === 'reviewed');
  const [toast, setToast] = useState<string | null>(null);

  if (!tender || !bid) {
    return (
      <OfficerPortalShell breadcrumb="Bids">
        <EmptyState
          icon={tender?.stage === 'open' ? 'lock' : 'search_off'}
          title={tender?.stage === 'open' ? 'Bids are sealed' : 'Bid not found'}
          description={tender?.stage === 'open' ? 'Individual bids unlock after the submission deadline.' : 'Check the link or return to the bid list.'}
          actions={<Button to={tender ? `/officer/bids/${refToSlug(tender.ref)}` : '/officer/bids'}>Back</Button>}
        />
      </OfficerPortalShell>
    );
  }

  const checks = checksFor(bid.assessment === 'findings');
  const findingCount = checks.filter((c) => c.result === 'finding').length;
  const tenderPath = `/officer/bids/${refToSlug(tender.ref)}`;

  function note(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <OfficerPortalShell breadcrumb={bid.id}>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: 'Bids', to: '/officer/bids' }, { label: tender.ref, to: tenderPath }, { label: bid.id }]}
          eyebrow={
            <>
              <span className="font-mono text-[13px] font-semibold text-on-surface">{bid.id}</span>
              {reviewed ? (
                <StatusBadge tone="neutral" icon="task_alt">Officer reviewed</StatusBadge>
              ) : findingCount ? (
                <StatusBadge tone="warning" icon="flag">Verification findings</StatusBadge>
              ) : (
                <StatusBadge tone="success">Ready for review</StatusBadge>
              )}
            </>
          }
          title={bid.bidder}
          description={`${tender.title} · ${tender.ref}`}
          actions={
            <>
              <Button variant="secondary" leftIcon="arrow_back" to={tenderPath}>
                All bids
              </Button>
              <Button
                variant="secondary"
                leftIcon="folder_open"
                onClick={() => {
                  setConfirmTime(stamp());
                  setConfirmOpen(true);
                }}
              >
                Open documents
              </Button>
            </>
          }
        />

        {findingCount > 0 && (
          <Callout tone="warning" icon="flag" title={`${findingCount} verification finding for your assessment`}>
            Findings are evidence for your review, not a qualification decision.
          </Callout>
        )}

        <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card padding="none" className="h-fit overflow-hidden">
            <div className="px-6 pt-6">
              <CardHeader icon="fact_check" title="Requirement checks" description="Automated verification of submitted evidence against the tender's requirements." />
            </div>
            <Table minWidth={720}>
              <THead>
                <tr>
                  <Th>Requirement</Th>
                  <Th>Evidence</Th>
                  <Th>Result</Th>
                </tr>
              </THead>
              <TBody>
                {checks.map((c) => (
                  <Tr key={c.requirement} highlight={c.result === 'finding' ? 'warning' : undefined}>
                    <Td>
                      <div className="font-semibold">{c.requirement}</div>
                      <div className="text-[12px] text-on-surface-variant">Source: {c.source}</div>
                    </Td>
                    <Td className="text-body-sm">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-on-surface-variant">
                        <Icon name="description" size="sm" />
                        {c.evidence}
                      </span>
                      {c.note && <div className="mt-1 text-body-sm text-warning-on-container">{c.note}</div>}
                    </Td>
                    <Td>{c.result === 'verified' ? <StatusBadge tone="success">Verified</StatusBadge> : <StatusBadge tone="warning" icon="flag">Finding</StatusBadge>}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>

          <div className="flex h-fit flex-col gap-8">
            <Card padding="lg">
              <CardHeader icon="receipt_long" title="Submission" />
              <DescriptionList
                items={[
                  { label: 'Bid ID', value: <span className="font-mono">{bid.id}</span> },
                  { label: 'Submitted', value: bid.submitted },
                  { label: 'Processing', value: bid.processing === 'processed' ? 'Processed' : 'Processing complete' },
                  { label: 'Checks', value: `${checks.length - findingCount} verified · ${findingCount} finding` },
                ]}
              />
            </Card>

            <Card padding="lg">
              <CardHeader icon="gavel" title="Officer review" description="You make the final decision." />
              {reviewed ? (
                <p className="flex items-center gap-2 text-body-md text-success-on-container">
                  <Icon name="task_alt" size="md" /> Review recorded
                </p>
              ) : (
                <Button
                  fullWidth
                  leftIcon="task_alt"
                  onClick={() => {
                    setReviewed(true);
                    setAudit((a) => [{ event: 'Bid review recorded', time: stamp() }, ...a]);
                    note('Review recorded in the audit trail');
                  }}
                >
                  Mark review complete
                </Button>
              )}
            </Card>

            <Card padding="lg">
              <CardHeader icon="history_edu" title="Audit trail" description="This session" />
              <ul className="flex flex-col gap-3">
                {audit.map((a, i) => (
                  <li key={i} className="flex gap-2.5">
                    <Icon name="radio_button_checked" size="xs" className="mt-1 text-secondary" />
                    <div>
                      <div className="text-[14px] font-medium text-on-surface">{a.event}</div>
                      <div className="text-[12px] text-on-surface-variant">Procurement Officer · {a.time}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {docsOpen && (
          <Card padding="lg">
            <CardHeader icon="folder_open" title="Submitted documents" description="Access recorded in the audit trail." actions={<Button size="sm" variant="ghost" onClick={() => setDocsOpen(false)}>Close</Button>} />
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FILES.map((f) => (
                <li key={f} className="flex items-center gap-3 rounded-card border border-outline-variant p-3">
                  <Icon name={f.endsWith('.xlsx') ? 'table_chart' : 'picture_as_pdf'} size="md" className="text-secondary" />
                  <span className="truncate font-mono text-[13px] text-on-surface">{f}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        icon="folder_open"
        size="md"
        title="Open bid documents?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                setDocsOpen(true);
                setAudit((a) => [{ event: 'Bid documents opened', time: confirmTime }, ...a]);
                note('Bid documents opened · audit event recorded');
              }}
            >
              Open files
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <DescriptionList
            items={[
              { label: 'Bid', value: <span className="font-mono">{bid.id}</span> },
              { label: 'Bidder', value: bid.bidder },
              { label: 'Officer', value: 'Procurement Officer' },
              { label: 'Time', value: confirmTime },
            ]}
          />
          <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
            <Icon name="history_edu" size="sm" className="mt-0.5 text-outline" />
            This action will be recorded in the procurement audit trail.
          </p>
        </div>
      </Modal>

      {toast && <Toast message={toast} />}
    </OfficerPortalShell>
  );
}
