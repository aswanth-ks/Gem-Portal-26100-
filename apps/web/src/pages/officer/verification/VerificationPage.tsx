// Procurement Officer — Verification. A read-only log of the source checks
// run against bidder submissions (GSTIN/PAN/Udyam, registered address). Not
// a dashboard: one dense table, filterable, each row linking to the bid it
// belongs to. UNVERIFIED is never shown as a pass, and nothing here claims
// live government API access — checks reflect what was recorded and when.
//
// TODO: GET /api/officer/verification (server-computed from bid evidence).

import { useMemo, useState } from 'react';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Callout, Card, EmptyState, PageHeader, Select, StatusBadge, Table, TBody, Td, Th, THead, Tr, VerificationBadge } from '@/components/primitives';
import { BIDS, TENDERS, assessmentPath, type Bid } from '@/pages/officer/bids/assessmentData';

type VStatus = 'verified' | 'unverified' | 'conflict';

interface Check {
  tenderRef: string;
  tenderTitle: string;
  bid: Bid;
  field: string;
  source: string;
  status: VStatus;
  checked: string;
}

function checksFor(bid: Bid, tenderRef: string, tenderTitle: string): Check[] {
  const rows: Check[] = [
    { tenderRef, tenderTitle, bid, field: 'GSTIN', source: 'Government source', status: 'verified', checked: '26 Sep 2026, 13:42' },
    { tenderRef, tenderTitle, bid, field: 'PAN', source: 'Government source', status: 'verified', checked: '26 Sep 2026, 13:43' },
    { tenderRef, tenderTitle, bid, field: 'Udyam', source: 'Authorized source', status: bid.needsReview > 0 ? 'unverified' : 'verified', checked: '26 Sep 2026, 13:44' },
  ];
  if (tenderRef === 'CPCL/PROC/2026/041' && bid.id === 'BID-002') {
    rows.push({ tenderRef, tenderTitle, bid, field: 'Registered address', source: 'GST record vs bidder declaration', status: 'conflict', checked: '26 Sep 2026, 13:43' });
  }
  return rows;
}

function allChecks(): Check[] {
  const rows: Check[] = [];
  for (const t of TENDERS) {
    if (t.stage === 'open') continue;
    for (const b of BIDS[t.ref] ?? []) rows.push(...checksFor(b, t.ref, t.title));
  }
  return rows;
}

export function VerificationPage() {
  const [tender, setTender] = useState('');
  const [status, setStatus] = useState('');
  const rows = useMemo(() => {
    const all = allChecks();
    return all.filter((c) => (!tender || c.tenderRef === tender) && (!status || c.status === status));
  }, [tender, status]);

  const conflicts = rows.filter((c) => c.status === 'conflict').length;
  const unverified = rows.filter((c) => c.status === 'unverified').length;

  return (
    <OfficerPortalShell breadcrumb="Verification">
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: 'Compliance' }, { label: 'Verification' }]}
          title="Verification"
          description="Source checks run against bidder submissions — GSTIN, PAN, Udyam and cross-document consistency."
        />

        <Callout tone="neutral" icon="info" title="What this shows">
          Each row is a single check recorded at the time shown. VERIFIED confirms a match against the referenced source; UNVERIFIED means that source could not be checked and is never treated as a pass; CONFLICT means two documents disagree and needs officer review.
        </Callout>

        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant bg-surface-container-low/60 px-5 py-4">
            <Select size="sm" aria-label="Tender" value={tender} onChange={(e) => setTender(e.target.value)} className="w-auto">
              <option value="">All tenders</option>
              {TENDERS.filter((t) => t.stage !== 'open').map((t) => (
                <option key={t.ref} value={t.ref}>
                  {t.ref}
                </option>
              ))}
            </Select>
            <Select size="sm" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
              <option value="">All statuses</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="conflict">Conflict</option>
            </Select>
            <div className="ml-auto flex items-center gap-2 text-body-sm text-on-surface-variant">
              {conflicts > 0 && <StatusBadge tone="danger">{conflicts} conflicts</StatusBadge>}
              {unverified > 0 && <StatusBadge tone="neutral">{unverified} unverified</StatusBadge>}
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon="verified_user" title="No checks match" description="Try a different tender or status filter." />
          ) : (
            <Table minWidth={860}>
              <THead>
                <tr>
                  <Th>Bid</Th>
                  <Th>Tender</Th>
                  <Th>Field</Th>
                  <Th>Source</Th>
                  <Th>Checked</Th>
                  <Th>Status</Th>
                </tr>
              </THead>
              <TBody>
                {rows.map((c, i) => (
                  <Tr key={i} highlight={c.status === 'conflict' ? 'danger' : undefined}>
                    <Td>
                      <a href={assessmentPath(c.tenderRef, c.bid.id)} className="font-mono text-[13px] font-semibold text-secondary hover:underline">
                        {c.bid.id}
                      </a>
                      <div className="text-[12px] text-on-surface-variant">{c.bid.company}</div>
                    </Td>
                    <Td className="font-mono text-[12px] text-on-surface-variant">{c.tenderRef}</Td>
                    <Td className="text-[14px] font-medium text-on-surface">{c.field}</Td>
                    <Td className="text-body-sm text-on-surface-variant">{c.source}</Td>
                    <Td className="whitespace-nowrap text-body-sm text-on-surface-variant">{c.checked}</Td>
                    <Td>
                      <VerificationBadge s={c.status} />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </OfficerPortalShell>
  );
}
