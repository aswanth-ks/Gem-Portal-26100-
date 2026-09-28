// Bidder portal chrome = the shared PortalShell configured with the bidder
// navigation and identity. All bidder pages use this.
//
// Identity is now real — sourced from AuthContext's profile (GET /api/auth/me
// -> profile), which is the same profile fetched by every other bidder page.
// No separate hardcoded bidder object exists here anymore.

import { useMemo, type ReactNode } from 'react';
import { PortalShell, type PortalConfig } from './PortalShell';
import { useAuth } from '@/context/AuthContext';
import { PublicHeader, PublicFooter } from '@/pages/home/PublicChrome';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function BidderPortalShell({ breadcrumb, bare, children }: { breadcrumb?: string; bare?: boolean; children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  // /tenders and /tenders/:ref are public routes (browsable without logging
  // in) but reuse this shell for their content layout. An anonymous visitor
  // must not be dropped into the authenticated bidder-portal chrome (sidebar,
  // fake "Bidder" identity card) — that reads as if they're already inside
  // someone's account. Show the same public site header/footer instead until
  // they're actually signed in; logged-in bidders still get the real portal.
  const showPublicChrome = !loading && !user;

  const config: PortalConfig = useMemo(() => {
    const orgName = profile?.organizationName || 'Bidder';
    return {
      brandTitle: 'CPCL e-Procure',
      brandSubtitle: 'Bidder Portal',
      brandIcon: 'shield',
      homeLabel: 'Workspace',
      role: 'bidder',
      searchPlaceholder: 'Search tenders or NIT numbers…',
      notifications: 0,
      groups: [
        {
          label: 'Workspace',
          items: [
            { id: 'dashboard', icon: 'space_dashboard', label: 'Dashboard', to: '/dashboard' },
            { id: 'tenders', icon: 'gavel', label: 'Tenders', to: '/tenders' },
            { id: 'my-bids', icon: 'assignment_turned_in', label: 'My Bids', to: '/my-bids' },
            { id: 'documents', icon: 'folder_open', label: 'Documents' },
            { id: 'notifications', icon: 'notifications', label: 'Notifications' },
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
        initials: initialsOf(orgName),
        name: orgName,
        id: profile?.registrationNumber || '—',
        headerName: orgName,
        role: profile?.contactPerson || 'Authorized contact',
        status: profile?.verificationStatus === 'verified' ? 'Verified bidder' : 'Verification pending',
      },
    };
  }, [profile]);

  if (showPublicChrome) {
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        <PublicHeader active="home" />
        <main id="main-content" className="relative flex-1">
          {bare ? children : <div className="mx-auto w-full max-w-page px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>}
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <PortalShell config={config} breadcrumb={breadcrumb} bare={bare}>
      {children}
    </PortalShell>
  );
}
