// Procurement Officer workspace chrome = the shared PortalShell configured
// with the officer navigation (from Stitch "O02 — Procurement Officer
// Dashboard") and officer identity. Same design as the bidder portal.
//
// TODO: connect the identity to the authenticated officer session.

import type { ReactNode } from 'react';
import { PortalShell, type PortalConfig } from './PortalShell';

const OFFICER_CONFIG: PortalConfig = {
  brandTitle: 'CPCL Procurement',
  brandSubtitle: 'Officer Portal · MoP&NG',
  brandIcon: 'local_fire_department',
  homeLabel: 'Officer workspace',
  searchPlaceholder: 'Search tenders, bids or vendors…',
  notifications: 3,
  groups: [
    {
      label: 'Workspace',
      items: [
        { id: 'dashboard', icon: 'grid_view', label: 'Dashboard', to: '/officer/dashboard' },
        { id: 'tenders', icon: 'assignment', label: 'Tenders' },
        { id: 'bids', icon: 'gavel', label: 'Bids' },
        { id: 'reviews', icon: 'fact_check', label: 'Reviews', badge: '3' },
      ],
    },
    {
      label: 'Compliance',
      items: [
        { id: 'verification', icon: 'verified_user', label: 'Verification' },
        { id: 'audit', icon: 'history_edu', label: 'Audit Trail' },
        { id: 'reports', icon: 'insights', label: 'Reports' },
      ],
    },
    {
      label: 'System',
      items: [{ id: 'settings', icon: 'settings', label: 'Settings' }],
    },
  ],
  identity: {
    initials: 'AK',
    name: 'Arun Kumar',
    id: 'CPCL-OFF-4092',
    headerName: 'Arun Kumar',
    role: 'Procurement officer',
    status: 'DSC Level-3 active',
  },
};

export function OfficerPortalShell({ breadcrumb, bare, children }: { breadcrumb?: string; bare?: boolean; children: ReactNode }) {
  return (
    <PortalShell config={OFFICER_CONFIG} breadcrumb={breadcrumb} bare={bare}>
      {children}
    </PortalShell>
  );
}
