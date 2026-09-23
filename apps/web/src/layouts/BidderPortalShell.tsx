// Shared authenticated bidder-portal chrome (sidebar + top bar).
//
// This is the ONE sidebar/header design for every authenticated bidder-portal
// page (Dashboard, Tenders, Tender Details, and future My Bids/Documents/
// Notifications/Help/Settings/Profile pages) — do not fork it per page.
// Originally generated identically by the "Tender Listing & Search" and
// "Tender Details" Stitch screens; the Dashboard screen's own (slightly
// different) sidebar/header markup was retired in favor of this shell so the
// whole authenticated portal shares one design.
//
// Active nav highlighting and the header breadcrumb are both derived
// automatically from the current route (see PRIMARY_NAV below) — pages
// don't need to pass an "active" prop, only an optional breadcrumb override.
//
// TODO: connect the bidder identity card to the authenticated session
// (features/auth) instead of the static "ABC Engineering Pvt Ltd" mock.

import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

type NavPath = 'dashboard' | 'tenders' | 'my-bids' | 'documents' | 'notifications' | 'help' | 'settings' | 'profile';

const PRIMARY_NAV: { path: NavPath; icon: string; label: string; badge?: string; to?: string }[] = [
  { path: 'dashboard', icon: 'grid_view', label: 'Dashboard', to: '/dashboard' },
  { path: 'tenders', icon: 'description', label: 'Tenders', to: '/tenders' },
  { path: 'my-bids', icon: 'folder', label: 'My Bids', to: '/my-bids' },
  { path: 'documents', icon: 'folder_open', label: 'Documents' },
  { path: 'notifications', icon: 'notifications', label: 'Notifications', badge: '4' },
];

const SECONDARY_NAV: { path: NavPath; icon: string; label: string }[] = [
  { path: 'help', icon: 'help', label: 'Help' },
  { path: 'settings', icon: 'settings', label: 'Settings' },
  { path: 'profile', icon: 'account_circle', label: 'Profile' },
];

function useActiveNav(): { path: NavPath; label: string } {
  const { pathname } = useLocation();
  const match = PRIMARY_NAV.find((item) => item.to && (pathname === item.to || pathname.startsWith(item.to + '/')));
  return match ? { path: match.path, label: match.label } : { path: 'dashboard', label: 'Workspace' };
}

interface BidderPortalShellProps {
  /** Breadcrumb trail segment shown in the fixed header. Defaults to the active nav item's label (route-derived) when omitted. */
  breadcrumb?: string;
  children: ReactNode;
}

export function BidderPortalShell({ breadcrumb, children }: BidderPortalShellProps) {
  const active = useActiveNav();
  const crumb = breadcrumb ?? active.label;
  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-full">
      <aside className="fixed left-0 top-0 h-full w-[250px] bg-surface-container-lowest border-r border-outline-variant z-50 flex flex-col justify-between select-none">
        <div className="flex flex-col">
          <div className="h-[60px] px-space-md border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-headline-sm text-headline-sm">
                <span className="material-symbols-outlined text-[20px] text-on-primary">shield</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-label-lg text-label-lg text-primary tracking-tight">CPCL</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">e-Procure</span>
                </div>
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-secondary px-1 py-0.2 bg-surface-container-low rounded font-bold border border-surface-container-high inline-block">
                  Bidder Portal
                </span>
              </div>
            </div>
          </div>
          <div className="px-space-md pt-space-md pb-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">WORKSPACE NAVIGATION</span>
          </div>
          <nav className="flex flex-col gap-0.5 px-space-sm">
            {PRIMARY_NAV.map((item) => {
              const isActive = item.path === active.path;
              const className =
                'flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ' +
                (isActive
                  ? 'bg-surface-container-low text-secondary border-l-4 border-secondary font-label-lg'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface');
              const inner = (
                <>
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="font-body-md text-body-md">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-[11px] flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </>
              );
              return item.to ? (
                <Link key={item.path} aria-current={isActive ? 'page' : undefined} className={className} to={item.to}>
                  {inner}
                </Link>
              ) : (
                <a key={item.path} aria-current={isActive ? 'page' : undefined} className={className} href="#">
                  {inner}
                </a>
              );
            })}
          </nav>
          <div className="my-space-md mx-space-md border-t border-outline-variant"></div>
          <div className="flex flex-col gap-0.5 px-space-sm">
            {SECONDARY_NAV.map((item) => (
              <a
                key={item.path}
                className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                href="#"
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-body-md text-body-md">{item.label}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="p-space-sm border-t border-outline-variant bg-surface-container-lowest">
          <div className="p-space-sm rounded-lg border border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-space-sm mb-1.5">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-md text-label-md font-bold">AE</div>
              <div className="overflow-hidden">
                <div className="font-label-md text-label-md text-on-surface truncate font-semibold">ABC Engineering Pvt Ltd</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant truncate">BIDDER-00482</div>
              </div>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-container-lowest border border-outline-variant rounded text-[11px] font-medium text-on-surface-variant">
              <span className="text-[#138A4B] text-[10px] leading-none">●</span>
              <span className="material-symbols-outlined text-[13px] text-on-surface-variant">lock</span>
              <span className="truncate font-label-sm text-[10px]">Class-3 DSC Active</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="pl-[250px]">
        <header className="fixed top-0 left-[250px] right-0 h-[60px] bg-surface-container-lowest border-b border-outline-variant z-40 px-space-lg flex items-center justify-between">
          <div className="flex items-center gap-space-xs text-body-sm font-body-sm text-on-surface-variant">
            <span>Workspace</span>
            <span>/</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">{crumb}</span>
          </div>
          <div className="w-96">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[18px] text-on-surface-variant">search</span>
              <input
                className="w-full h-9 pl-9 pr-14 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-sm font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                placeholder="Search tenders, NIT numbers, item categories..."
                readOnly
                type="text"
              />
              <span className="absolute right-2.5 px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-[10px] border border-outline-variant">Ctrl+K</span>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
              <span className="font-label-sm text-label-sm text-on-surface tracking-wider font-semibold">IST 14:35:12</span>
            </div>
            <button className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" type="button">
              <span className="material-symbols-outlined text-[20px]">help_outline</span>
            </button>
            <button className="relative w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" type="button">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest"></span>
            </button>
            <div className="h-6 w-px bg-outline-variant"></div>
            <div className="flex items-center gap-space-sm pl-1">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
              <div className="hidden xl:block text-left">
                <div className="font-label-md text-label-md text-on-surface font-semibold leading-tight">ABC Engineering</div>
                <div className="font-label-sm text-[11px] text-secondary font-medium leading-none">Class-3 DSC</div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative pt-[60px] min-h-screen bg-background">{children}</main>
      </div>
    </div>
  );
}
