// Bidder portal chrome = the shared PortalShell configured with the bidder
// navigation and identity. All bidder pages use this.
//
// TODO: connect the identity to the authenticated session (features/auth).

import type { ReactNode } from 'react';
import { PortalShell, type PortalConfig } from './PortalShell';

const BIDDER_CONFIG: PortalConfig = {
  brandTitle: 'CPCL e-Procure',
  brandSubtitle: 'Bidder Portal',
  brandIcon: 'shield',
  homeLabel: 'Workspace',
  searchPlaceholder: 'Search tenders or NIT numbers…',
  notifications: 4,
  groups: [
    {
      label: 'Workspace',
      items: [
        { id: 'dashboard', icon: 'space_dashboard', label: 'Dashboard', to: '/dashboard' },
        { id: 'tenders', icon: 'gavel', label: 'Tenders', to: '/tenders' },
        { id: 'my-bids', icon: 'assignment_turned_in', label: 'My Bids', to: '/my-bids' },
        { id: 'documents', icon: 'folder_open', label: 'Documents' },
        { id: 'notifications', icon: 'notifications', label: 'Notifications', badge: '4' },
      ],
    },
    {
      label: 'Support',
      items: [
        { id: 'help', icon: 'help', label: 'Help & Support' },
        { id: 'settings', icon: 'settings', label: 'Settings' },
        { id: 'profile', icon: 'account_circle', label: 'Profile' },
      ],
    },
  ],
  identity: {
    initials: 'AE',
    name: 'ABC Engineering Pvt Ltd',
    id: 'BIDDER-00482',
    headerName: 'ABC Engineering',
    role: 'Authorized signatory',
    status: 'Class-3 DSC active',
  },
};

export function BidderPortalShell({ breadcrumb, bare, children }: { breadcrumb?: string; bare?: boolean; children: ReactNode }) {
  return (
    <PortalShell config={BIDDER_CONFIG} breadcrumb={breadcrumb} bare={bare}>
      {children}
    </PortalShell>
  );
}
