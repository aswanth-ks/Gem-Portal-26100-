// Procurement Officer — Verification. The prototype version of this page
// fabricated GSTIN/PAN/Udyam verification rows against government sources
// that were never actually contacted. There is no real government
// verification integration yet, and no stored verification result on any
// backend model — so rather than invent VERIFIED/UNVERIFIED/CONFLICT rows,
// this page says so honestly.

import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { Card, EmptyState, PageHeader } from '@/components/primitives';

export function VerificationPage() {
  return (
    <OfficerPortalShell breadcrumb="Verification">
      <div className="flex flex-col gap-8">
        <PageHeader breadcrumbs={[{ label: 'Compliance' }, { label: 'Verification' }]} title="Verification" description="Government verification is not implemented yet." />

        <Card padding="lg">
          <EmptyState
            icon="verified_user"
            title="Government verification not yet available"
            description="This page is meant to show source checks (GSTIN, PAN, Udyam) run against bidder submissions. That integration does not exist yet, and no verification result is stored on any backend record — see the real submitted bids in the Bids workspace instead."
          />
        </Card>
      </div>
    </OfficerPortalShell>
  );
}
