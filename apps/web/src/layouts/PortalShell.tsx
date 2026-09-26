// Generic authenticated portal chrome (sidebar + top bar) shared by the
// Bidder portal and the Procurement Officer workspace. Both portals render
// the SAME design; they only differ in nav items, brand subtitle and
// identity. Do not fork this per portal — configure it.
//
// - Active nav + default breadcrumb are derived from the current route.
// - ≥lg: fixed 232px sidebar (w-sidebar token). <lg: off-canvas drawer opened from the header.
// - Pages render inside a standard container (max width, padding, rhythm);
//   pass `bare` to opt out.

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Button, CountBadge, Icon, IconButton, Modal, SearchInput, StatusBadge } from '@/components/primitives';

export interface PortalNavItem {
  id: string;
  icon: string;
  label: string;
  badge?: string;
  to?: string;
}

export interface PortalNavGroup {
  label: string;
  items: PortalNavItem[];
}

export interface PortalIdentity {
  initials: string;
  name: string;
  id: string;
  role: string;
  headerName: string;
  status: string;
}

export interface PortalConfig {
  brandTitle: string;
  brandSubtitle: string;
  brandIcon: string;
  groups: PortalNavGroup[];
  identity: PortalIdentity;
  searchPlaceholder: string;
  notifications: number;
  /** Route prefix treated as "home" when nothing else matches (breadcrumb). */
  homeLabel: string;
  /** Which portal this is — drives sign-out copy and the sign-in-again link. */
  role: 'bidder' | 'officer';
}

function useActiveNav(groups: PortalNavGroup[], homeLabel: string): { id: string; label: string } {
  const { pathname } = useLocation();
  const all = groups.flatMap((g) => g.items);
  // Longest matching `to` wins so /officer/tenders doesn't match /officer.
  const match = all
    .filter((item) => item.to && (pathname === item.to || pathname.startsWith(item.to + '/')))
    .sort((a, b) => (b.to?.length ?? 0) - (a.to?.length ?? 0))[0];
  return match ? { id: match.id, label: match.label } : { id: '', label: homeLabel };
}

function NavLinkItem({ item, active, onNavigate }: { item: PortalNavItem; active: boolean; onNavigate?: () => void }) {
  const className = cn(
    'focus-ring group relative flex h-9 items-center gap-3 rounded-control px-3 text-[14px] transition-colors',
    active ? 'bg-info-container font-semibold text-on-surface' : 'font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
    !item.to && 'cursor-default',
  );
  const inner = (
    <>
      {active && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-secondary" aria-hidden="true" />}
      <Icon name={item.icon} size="lg" fill={active} className={active ? 'text-secondary' : 'text-outline group-hover:text-on-surface-variant'} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && <CountBadge tone="danger">{item.badge}</CountBadge>}
      {!item.to && <span className="text-[10px] font-medium uppercase tracking-wider text-outline/80">Soon</span>}
    </>
  );
  return item.to ? (
    <Link aria-current={active ? 'page' : undefined} className={className} to={item.to} onClick={onNavigate}>
      {inner}
    </Link>
  ) : (
    <span className={className} aria-disabled="true">
      {inner}
    </span>
  );
}

function Sidebar({ config, activeId, onNavigate, onSignOut }: { config: PortalConfig; activeId: string; onNavigate?: () => void; onSignOut: () => void }) {
  const { identity } = config;
  return (
    <div className="flex h-full flex-col bg-surface-container-lowest">
      <div className="flex h-header shrink-0 items-center gap-3 border-b border-outline-variant px-5">
        <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-control bg-navy text-white shadow-xs">
          <Icon name={config.brandIcon} size="lg" fill />
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-saffron" aria-hidden="true" />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-on-surface">{config.brandTitle}</div>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-on-surface-variant">{config.brandSubtitle}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-6" aria-label="Primary">
        {config.groups.map((group, gi) => (
          <div key={group.label}>
            <div className={cn('px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-outline', gi > 0 && 'pt-8')}>{group.label}</div>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => (
                <NavLinkItem key={item.id} item={item} active={item.id === activeId} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-outline-variant p-4">
        <div className="flex items-center gap-3 rounded-card border border-outline-variant bg-surface-container-low p-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-[13px] font-semibold text-white">{identity.initials}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-on-surface">{identity.name}</div>
            <div className="truncate font-mono text-[11.5px] text-on-surface-variant">{identity.id}</div>
          </div>
          <IconButton size="sm" icon="logout" aria-label="Sign out" title="Sign out" onClick={onSignOut} />
        </div>
        <div className="mt-3 px-1">
          <StatusBadge status="verified">{identity.status}</StatusBadge>
        </div>
      </div>
    </div>
  );
}

interface PortalShellProps {
  config: PortalConfig;
  breadcrumb?: string;
  bare?: boolean;
  children: ReactNode;
}

export function PortalShell({ config, breadcrumb, bare, children }: PortalShellProps) {
  const active = useActiveNav(config.groups, config.homeLabel);
  const crumb = breadcrumb ?? active.label;
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const navigate = useNavigate();
  const { identity } = config;
  const portalName = config.role === 'officer' ? 'Officer workspace' : 'Bidder portal';

  function signOut() {
    // TODO: POST /api/auth/logout (invalidate the session / DSC session) before redirecting.
    setSignOutOpen(false);
    navigate(`/logout?role=${config.role}`, { replace: true });
  }

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-control focus:bg-navy focus:px-4 focus:py-2 focus:text-white">
        Skip to main content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-sidebar border-r border-outline-variant lg:block">
        <Sidebar config={config} activeId={active.id} onSignOut={() => setSignOutOpen(true)} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-[55] lg:hidden">
          <div className="absolute inset-0 bg-navy-900/40 animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-overlay animate-slide-in-left">
            <Sidebar
              config={config}
              activeId={active.id}
              onNavigate={() => setDrawerOpen(false)}
              onSignOut={() => {
                setDrawerOpen(false);
                setSignOutOpen(true);
              }}
            />
          </aside>
        </div>
      )}

      <div className="min-w-0 overflow-x-clip lg:pl-sidebar">
        <header className="sticky top-0 z-30 flex h-header items-center gap-4 border-b border-outline-variant bg-surface-container-lowest/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <IconButton icon="menu" aria-label="Open navigation" className="lg:hidden" onClick={() => setDrawerOpen(true)} />
          <div className="flex min-w-0 items-center gap-2 text-[13.5px]">
            <span className="hidden text-on-surface-variant sm:inline">Workspace</span>
            <Icon name="chevron_right" size="sm" className="hidden text-outline sm:inline" />
            <span className="truncate font-semibold text-on-surface">{crumb}</span>
          </div>

          <div className="ml-auto hidden w-full max-w-xs md:block 2xl:max-w-sm">
            <SearchInput size="md" readOnly placeholder={config.searchPlaceholder} aria-label="Global search (coming soon)" />
          </div>

          <div className="ml-auto flex items-center gap-1.5 md:ml-2">
            <div className="mr-2 hidden h-8 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-3 whitespace-nowrap min-[1360px]:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              <span className="text-[12px] font-medium text-on-surface-variant num">IST 14:35</span>
            </div>
            <IconButton icon="search" aria-label="Search" className="md:hidden" />
            <IconButton icon="help" aria-label="Help & support" />
            <IconButton icon="notifications" aria-label={`Notifications (${config.notifications} unread)`} badge={config.notifications > 0} />
            <div className="mx-2 hidden h-8 w-px bg-outline-variant sm:block" aria-hidden="true" />
            <div className="relative">
            <button
              type="button"
              className="focus-ring flex items-center gap-2.5 rounded-control py-1 pl-1 pr-2 transition-colors hover:bg-surface-container-low"
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[12px] font-semibold text-white">{identity.initials}</span>
              <span className="hidden whitespace-nowrap text-left leading-tight min-[1360px]:block">
                <span className="block text-[13px] font-semibold text-on-surface">{identity.headerName}</span>
                <span className="block text-[11.5px] text-on-surface-variant">{identity.role}</span>
              </span>
              <Icon name="expand_more" size="md" className="hidden text-outline min-[1360px]:inline" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-card border border-outline-variant bg-surface-container-lowest shadow-overlay animate-scale-in">
                  <div className="border-b border-outline-variant px-4 py-3">
                    <div className="text-[14px] font-semibold text-on-surface">{identity.name}</div>
                    <div className="text-[12px] text-on-surface-variant">{identity.role}</div>
                    <div className="font-mono text-[11.5px] text-on-surface-variant">{identity.id}</div>
                  </div>
                  <div className="py-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setSignOutOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] text-danger transition-colors hover:bg-surface-container-low"
                    >
                      <Icon name="logout" size="sm" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
        </header>

        <Modal
          open={signOutOpen}
          onClose={() => setSignOutOpen(false)}
          icon="logout"
          size="md"
          title="Sign out?"
          description={`${identity.name} · ${portalName}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setSignOutOpen(false)}>
                Cancel
              </Button>
              <Button leftIcon="logout" onClick={signOut}>
                Sign out
              </Button>
            </>
          }
        >
          <p className="text-body-md text-on-surface-variant">
            {config.role === 'officer'
              ? 'Your officer session and DSC token session will end. Unsaved changes on this page will be lost.'
              : 'Your bidder session will end. Saved bid drafts stay available when you sign in again; unsaved changes on this page will be lost.'}
          </p>
        </Modal>

        <main id="main-content" className="relative">
          {bare ? children : <div className="mx-auto w-full max-w-page px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>}
        </main>
      </div>
    </div>
  );
}
