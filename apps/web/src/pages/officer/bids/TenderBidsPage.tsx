// Procurement Officer — bids for one tender. While the submission window is
// open the page shows only the tender status and bid count (sealed). After
// the deadline it lists each bid for independent review — no ranking,
// scores, "best bidder" or qualification prediction; order is submission ID.

import { useParams } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Button, Callout, Card, EmptyState, Icon, PageHeader, StatusBadge, Table, TBody, Td, Th, THead, Tr } from '@/components/primitives';
import { bidsFor, findTender, refToSlug } from './bidsData';
import { AssessmentBadge, StageBadge } from './OfficerBidsPage';

export function TenderBidsPage() {
  const { ref } = useParams();
  const tender = findTender(ref);

  if (!tender) {
    return (
      <OfficerPortalShell breadcrumb="Bids">
        <EmptyState icon="search_off" title="Tender not found" description="It may have been withdrawn or the link is incorrect." actions={<Button to="/officer/bids">Back to bids</Button>} />
      </OfficerPortalShell>
    );
  }

  const sealed = tender.stage === 'open';
  const bids = bidsFor(tender);
  const findings = bids.filter((b) => b.assessment === 'findings').length;
  const reviewed = bids.filter((b) => b.assessment === 'reviewed').length;

  return (
    <OfficerPortalShell breadcrumb={tender.ref}>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: 'Workspace', to: '/officer/dashboard' }, { label: 'Bids', to: '/officer/bids' }, { label: tender.ref }]}
          eyebrow={
            <>
              <StageBadge stage={tender.stage} />
              <span className="font-mono text-[12px] text-on-surface-variant">{tender.ref}</span>
            </>
          }
          title={tender.title}
          meta={
            <>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="event" size="sm" /> Deadline {tender.deadline} IST
              </span>
              <span aria-hidden="true">·</span>
              <span className="num">
                <strong className="font-semibold text-on-surface">{tender.bids}</strong> bids received
              </span>
              {!sealed && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="num">{reviewed} reviewed</span>
                  {findings > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-warning-on-container">{findings} with verification findings</span>
                    </>
                  )}
                </>
              )}
            </>
          }
          actions={
            <Button variant="secondary" leftIcon="arrow_back" to="/officer/bids">
              All bids
            </Button>
          }
        />

        {sealed ? (
          <Card padding="lg" className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
              <Icon name="lock" size="xl" />
            </span>
            <div>
              <h2 className="text-headline-md font-semibold text-on-surface">Bids sealed until {tender.deadline} IST</h2>
              <p className="mx-auto mt-1 max-w-xl text-body-md text-on-surface-variant">
                {tender.bids} bids have been received. Bidder identities, documents, verification results and assessments stay sealed until the submission window closes.
              </p>
            </div>
            <div className="grid w-full max-w-md grid-cols-2 divide-x divide-outline-variant rounded-card border border-outline-variant text-left">
              <div className="px-4 py-3">
                <div className="text-[12px] text-on-surface-variant">Bids received</div>
                <div className="num text-headline-sm font-semibold text-on-surface">{tender.bids}</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-[12px] text-on-surface-variant">Assessment</div>
                <div className="mt-1">
                  <AssessmentBadge a="sealed" />
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <Callout tone="neutral" icon="balance">
              Review each bid independently. Bids are listed by submission ID — not ranked or scored. The officer takes the final decision.
            </Callout>
            <Card padding="none" className="overflow-hidden">
              <Table minWidth={860}>
                <THead>
                  <tr>
                    <Th>Bid ID</Th>
                    <Th>Bidder</Th>
                    <Th>Submission time</Th>
                    <Th>Processing</Th>
                    <Th>Assessment</Th>
                    <Th align="right">
                      <span className="sr-only">Action</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {bids.map((b) => (
                    <Tr key={b.id} highlight={b.assessment === 'findings' ? 'warning' : undefined}>
                      <Td className="font-mono text-[13px] font-semibold">{b.id}</Td>
                      <Td className="font-medium">{b.bidder}</Td>
                      <Td className="whitespace-nowrap text-on-surface-variant">{b.submitted}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                          <Icon name="check_circle" size="sm" className="text-success" />
                          {b.processing === 'processed' ? 'Processed' : 'Processing complete'}
                        </span>
                      </Td>
                      <Td>
                        {b.assessment === 'findings' ? (
                          <StatusBadge tone="warning" icon="flag">Verification findings</StatusBadge>
                        ) : b.assessment === 'reviewed' ? (
                          <StatusBadge tone="neutral">Reviewed</StatusBadge>
                        ) : (
                          <StatusBadge tone="success">Ready for review</StatusBadge>
                        )}
                      </Td>
                      <Td align="right">
                        <Button size="sm" variant="secondary" rightIcon="arrow_forward" to={`/officer/bids/${refToSlug(tender.ref)}/${b.id}`}>
                          Open bid
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </OfficerPortalShell>
  );
}
