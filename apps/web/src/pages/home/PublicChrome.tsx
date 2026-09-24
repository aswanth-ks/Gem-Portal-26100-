// Public (pre-login) chrome shared by Bidder Home and Bidder Login: ministry
// strip with accessibility controls, branded header, primary navigation and
// the statutory footer. Keeps the government identity cues from the Stitch
// screens while using the shared design tokens and primitives.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Icon, IconButton } from '@/components/primitives';
import { cn } from '@/utils/cn';

const NAV = [
  { id: 'home', label: 'Home', to: '/', icon: 'home' },
  { id: 'tenders', label: 'Active tenders', to: '/tenders' },
  { id: 'corrigenda', label: 'Corrigenda' },
  { id: 'notices', label: 'Tender notices' },
  { id: 'downloads', label: 'Downloads & forms' },
  { id: 'help', label: 'Helpdesk' },
  { id: 'contact', label: 'Contact CPCL' },
];

export function PublicHeader({ active }: { active?: 'home' | 'login' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-control focus:bg-white focus:px-4 focus:py-2 focus:text-navy">
        Skip to main content
      </a>
      {/* Tricolour + ministry strip */}
      <div className="flex h-[3px]" aria-hidden="true">
        <span className="flex-1 bg-saffron" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-success" />
      </div>
      <div className="bg-navy-900 text-white/75">
        <div className="mx-auto flex h-9 w-full max-w-page items-center justify-between gap-4 px-4 text-[12px] sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate font-medium text-white/90">भारत सरकार · Government of India</span>
            <span className="hidden text-white/30 md:inline">|</span>
            <span className="hidden truncate md:inline">Ministry of Petroleum & Natural Gas</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#main-content" className="hidden hover:text-white lg:inline">
              Skip to content
            </a>
            <span className="hidden text-white/30 lg:inline">|</span>
            <div className="hidden items-center gap-0.5 sm:flex" role="group" aria-label="Text size">
              {['A−', 'A', 'A+'].map((s) => (
                <button key={s} type="button" className={cn('focus-ring h-6 min-w-6 rounded px-1 text-[11px] hover:bg-white/10 hover:text-white', s === 'A' && 'bg-white/10 text-white')}>
                  {s}
                </button>
              ))}
            </div>
            <span className="hidden text-white/30 sm:inline">|</span>
            <div className="flex items-center gap-2">
              <button type="button" className="font-semibold text-white">
                English
              </button>
              <button type="button" className="hover:text-white">
                हिन्दी
              </button>
              <button type="button" className="hidden hover:text-white sm:inline">
                தமிழ்
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Brand bar */}
      <div className="border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] w-full max-w-page items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link to="/" className="focus-ring flex min-w-0 items-center gap-3 rounded-control">
            <span className="relative inline-flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-control bg-navy text-white shadow-xs">
              <span className="text-[12px] font-bold tracking-wide">CPCL</span>
              <span className="text-[7px] font-medium text-saffron">सीपीसीएल</span>
              <span className="absolute inset-x-0 bottom-0 h-[3px] bg-saffron" aria-hidden="true" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="flex items-center gap-2">
                <span className="truncate text-[17px] font-bold tracking-tight text-on-surface">e-Procurement Portal</span>
                <span className="hidden rounded-full border border-warning-border bg-warning-container px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-on-container sm:inline">
                  SIH 2026
                </span>
              </span>
              <span className="block truncate text-[12px] text-on-surface-variant">Chennai Petroleum Corporation Limited</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end leading-tight xl:flex">
              <span className="text-[11px] text-on-surface-variant">IST server time</span>
              <span className="text-[13px] font-semibold text-on-surface num">27 Feb 2025 · 11:42:18</span>
            </div>
            <div className="hidden h-8 w-px bg-outline-variant xl:block" aria-hidden="true" />
            <div className="hidden items-center gap-1.5 text-[12px] text-on-surface-variant md:flex">
              <Icon name="call" size="sm" className="text-secondary" />
              <span className="font-semibold text-on-surface num">1800-425-7800</span>
            </div>
            {active !== 'login' && (
              <Button to="/login" leftIcon="vpn_key" className="hidden sm:inline-flex">
                Bidder / DSC login
              </Button>
            )}
            <IconButton icon={menuOpen ? 'close' : 'menu'} aria-label="Toggle navigation" aria-expanded={menuOpen} className="lg:hidden" onClick={() => setMenuOpen((v) => !v)} />
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav aria-label="Primary" className={cn('border-b border-navy-700 bg-navy', !menuOpen && 'hidden lg:block')}>
        <div className="mx-auto flex w-full max-w-page flex-col gap-0.5 px-4 py-2 sm:px-6 lg:h-11 lg:flex-row lg:items-center lg:justify-between lg:py-0 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-1">
            {NAV.map((n) => {
              const isActive = n.id === active;
              const cls = cn(
                'focus-ring inline-flex h-10 items-center gap-1.5 rounded-control px-3 text-[13.5px] font-medium transition-colors lg:h-8',
                isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
              );
              return n.to ? (
                <Link key={n.id} to={n.to} className={cls} aria-current={isActive ? 'page' : undefined}>
                  {n.icon && <Icon name={n.icon} size="sm" />}
                  {n.label}
                </Link>
              ) : (
                <a key={n.id} href="#" className={cls}>
                  {n.label}
                </a>
              );
            })}
          </div>
          <span className="hidden items-center gap-2 text-[12px] text-white/60 lg:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
            Central public procurement synced
          </span>
        </div>
      </nav>
    </header>
  );
}

const FOOTER_COLS = [
  { title: 'Statutory policies', links: ['Website policies & disclaimers', 'Privacy & data security', 'Terms & general conditions of tender', 'Hyperlinking policy', 'Copyright policy'] },
  { title: 'Compliance & governance', links: ['Central Vigilance Commission (CVC)', 'Accessibility statement (GIGW 3.0)', 'Right to Information (RTI)', 'Independent External Monitors', 'Public grievance (CPGRAMS)'] },
];

export function PublicFooter() {
  return (
    <footer className="mt-4 bg-navy-900 text-white/70">
      <div className="flex h-[3px]" aria-hidden="true">
        <span className="flex-1 bg-saffron" />
        <span className="flex-1 bg-white/80" />
        <span className="flex-1 bg-success" />
      </div>
      <div className="mx-auto grid w-full max-w-page grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-12 lg:px-10">
        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-control bg-white text-[11px] font-bold text-navy">CPCL</span>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold text-white">e-Procurement Portal</div>
              <div className="text-[12px] text-white/50">Smart India Hackathon 2026 prototype</div>
            </div>
          </div>
          <p className="max-w-xs text-body-sm text-white/55">Chennai Petroleum Corporation Limited — a Government of India enterprise under the Ministry of Petroleum & Natural Gas.</p>
          <div className="flex flex-col gap-2 text-body-sm">
            <span className="inline-flex items-center gap-2">
              <Icon name="mail" size="sm" className="text-saffron" />
              eproc-helpdesk@cpcl.co.in
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon name="location_on" size="sm" className="text-saffron" />
              CPCL, Manali, Chennai 600068
            </span>
          </div>
        </div>
        {FOOTER_COLS.map((col) => (
          <div key={col.title} className="flex flex-col gap-4 lg:col-span-2 lg:col-start-auto">
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white">{col.title}</h4>
            <ul className="flex flex-col gap-2.5 text-body-sm">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="focus-ring rounded transition-colors hover:text-white">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex flex-col gap-4 lg:col-span-4">
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white">Security & audit</h4>
          <dl className="flex flex-col divide-y divide-white/10 rounded-card border border-white/10 bg-white/[0.03] px-4 text-body-sm">
            {[
              ['Portal visitors', '02,489,173'],
              ['Security standard', 'STQC certified'],
              ['PKI encryption', '2048-bit · SHA-256'],
              ['Hosting', 'NIC-TN-DC02 (MeitY Tier-III)'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-white/50">{k}</dt>
                <dd className="font-medium text-white/90 num">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-page flex-col gap-2 px-4 py-5 text-[12px] text-white/45 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
          <span>Content managed by Chennai Petroleum Corporation Limited · Designed for Smart India Hackathon 2026</span>
          <span>Compliant with GIGW 3.0 & W3C-WAI Level AA</span>
        </div>
      </div>
    </footer>
  );
}
