// Procurement Officer workspace chrome = the shared PortalShell configured
// with the officer navigation (from Stitch "O02 — Procurement Officer
// Dashboard") and officer identity. Same design as the bidder portal.
//
// Identity shown comes from the signed-in officer's session (officer JWT).

import type { ReactNode } from 'react';
import { PortalShell, type PortalConfig } from './PortalShell';
import { getOfficerSession } from '@/lib/api';

const OFFICER_CONFIG: PortalConfig = {
  brandTitle: 'CPCL Procurement',
  brandSubtitle: 'Officer Portal · MoP&NG',
  brandIcon: 'local_fire_department',
  homeLabel: 'Officer workspace',
  role: 'officer',
  searchPlaceholder: 'Search tenders, bids or vendors…',
  notifications: 3,
  groups: [
    {
      label: 'Workspace',
      items: [
        { id: 'dashboard', icon: 'grid_view', label: 'Dashboard', to: '/officer/dashboard' },
        { id: 'tenders', icon: 'assignment', label: 'Tenders', to: '/officer/tenders' },
        { id: 'bids', icon: 'gavel', label: 'Bids', to: '/officer/bids' },
        { id: 'reviews', icon: 'fact_check', label: 'Reviews', to: '/officer/reviews', badge: '3' },
      ],
    },
    {
      label: 'Compliance',
      items: [
        { id: 'verification', icon: 'verified_user', label: 'Verification', to: '/officer/verification' },
        { id: 'audit', icon: 'history_edu', label: 'Audit Trail', to: '/officer/audit' },
        { id: 'reports', icon: 'insights', label: 'Reports' },
      ],
    },
    {
      label: 'System',
      items: [{ id: 'settings', icon: 'settings', label: 'Settings' }],
    },
  ],
  identity: {
    initials: 'PO',
    name: 'Procurement officer',
    id: '',
    headerName: 'Procurement officer',
    role: 'Procurement officer',
    status: 'Signed in',
  },
};

export function OfficerPortalShell({ breadcrumb, bare, children }: { breadcrumb?: string; bare?: boolean; children: ReactNode }) {
  const session = getOfficerSession();
  const email = session?.email ?? '';
  const config: PortalConfig = email
    ? { ...OFFICER_CONFIG, identity: { ...OFFICER_CONFIG.identity, initials: email.slice(0, 2).toUpperCase(), name: email, id: email, headerName: email } }
    : OFFICER_CONFIG;
  return (
    <PortalShell config={config} breadcrumb={breadcrumb} bare={bare}>
      {children}
    </PortalShell>
  );
}
