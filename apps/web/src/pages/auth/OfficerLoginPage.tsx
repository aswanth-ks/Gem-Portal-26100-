// Procurement Officer Login — ported from Stitch screen "O01 — CPCL
// Procurement Officer Login" (project 6921642772921774119, screen
// fcd14cd3c7bd4ffeab24d27265e21859), built on the shared public chrome and
// design-system primitives so it matches the Bidder Login.
//
// Real sign-in: POST /api/auth/officer-login (email + password checked by
// the gateway against an officer account). The returned officer JWT is
// stored via setOfficerToken and attached to every /api/officer call. The
// security-code box is a client-side speed bump only, not a security control.

import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumbs, Button, Callout, Card, Field, Icon, IconButton, Input, StatusBadge } from '@/components/primitives';
import { ApiError, officerLogin } from '@/lib/api';
import { cn } from '@/utils/cn';
import { PublicFooter, PublicHeader } from '@/pages/home/PublicChrome';

type Banner = { tone: 'danger' | 'warning'; icon: string; title: string; desc: string };

const CAPTCHA_POOL = ['9KR74M', 'X3F89K', '7P2W4D', 'CP918V', '82MD5Q'];

const LIFECYCLE = [
  { icon: 'edit_document', title: 'Tender creation', sub: 'Scope & specification drafting' },
  { icon: 'mark_email_read', title: 'Bid submission', sub: 'Encrypted dual-envelope vaulting' },
  { icon: 'document_scanner', title: 'Automated verification', sub: 'Statutory & financial cross-checks', current: true },
  { icon: 'rate_review', title: 'Officer review', sub: 'Human-in-the-loop technical audit' },
  { icon: 'verified', title: 'Final decision', sub: 'Award & contract execution' },
];

const SECURITY = [
  { icon: 'security', title: 'PKI multi-factor', sub: 'Hardware token & DSC verification' },
  { icon: 'badge', title: 'Role-based access', sub: 'Procurement directorate & committee' },
  { icon: 'history_edu', title: 'Audited actions', sub: 'Immutable activity logs' },
];

export function OfficerLoginPage() {
  const location = useLocation();
  const expired = new URLSearchParams(location.search).get('expired') === '1';
  const [values, setValues] = useState({ email: '', password: '', captcha: '' });
  const [errors, setErrors] = useState<{ email?: boolean; password?: boolean; captcha?: boolean }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [captchaIdx, setCaptchaIdx] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'verifying' | 'granted'>('idle');
  const [banner, setBanner] = useState<Banner | undefined>(
    expired ? { tone: 'warning', icon: 'timer_off', title: 'Session expired', desc: 'Your officer session is no longer valid. Please sign in again.' } : undefined,
  );
  const navigate = useNavigate();
  const captchaCode = CAPTCHA_POOL[captchaIdx];
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  function refreshCaptcha() {
    setCaptchaIdx((i) => (i + 1) % CAPTCHA_POOL.length);
    setValues((v) => ({ ...v, captcha: '' }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = {
      email: !values.email.trim(),
      password: !values.password,
      captcha: values.captcha.trim().toUpperCase() !== captchaCode,
    };
    setErrors(next);
    if (next.email || next.password || next.captcha) return;
    setPhase('verifying');
    setBanner(undefined);
    try {
      await officerLogin(values.email.trim(), values.password);
      setPhase('granted');
      navigate(from && from.startsWith('/officer/') ? from : '/officer/dashboard', { replace: true });
    } catch (err) {
      setPhase('idle');
      refreshCaptcha();
      setValues((v) => ({ ...v, password: '', captcha: '' }));
      if (err instanceof ApiError && err.status === 403) {
        setBanner({ tone: 'danger', icon: 'gpp_bad', title: 'Unauthorized account role', desc: 'This account is not an officer account. Vendors should use the bidder login.' });
      } else if (err instanceof ApiError && err.status === 401) {
        setBanner({ tone: 'danger', icon: 'lock_clock', title: 'Authentication denied', desc: 'The email or password is incorrect.' });
      } else {
        setBanner({ tone: 'danger', icon: 'error', title: 'Sign-in failed', desc: err instanceof ApiError ? err.message : 'Could not reach the server. Try again.' });
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-on-surface">
      <PublicHeader active="officer" />

      <main id="main-content" className="mx-auto w-full max-w-page flex-1 px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3">
              <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'CPCL Procurement Directorate' }, { label: 'Officer login' }]} />
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="info" icon="shield_person">
                  Internal officer portal
                </StatusBadge>
                <StatusBadge status="verified">Auth node PR-GATE-402</StatusBadge>
              </div>
              <h1 className="text-headline-xl-mobile sm:text-page-title text-on-surface">Procurement officer login</h1>
              <p className="max-w-2xl text-body-lg text-on-surface-variant">Sign in to the CPCL Procurement Intelligence workspace. Restricted to designated tender authority personnel.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Auth panel */}
            <Card padding="none" className="overflow-hidden lg:col-span-5">
              <div className="flex items-center justify-between gap-3 border-b border-navy-700 bg-navy px-6 py-4 text-white sm:px-8">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-white/10 text-saffron">
                    <Icon name="admin_panel_settings" size="lg" />
                  </span>
                  <div className="leading-tight">
                    <div className="text-[15px] font-semibold">Officer authentication</div>
                    <div className="text-[12px] text-white/60">Class-3 DSC required</div>
                  </div>
                </div>
                <span className="hidden items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/70 sm:inline-flex">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
                  FIPS 140-2
                </span>
              </div>

              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 p-6 sm:p-8">
                {banner && (
                  <Callout tone={banner.tone} icon={banner.icon} title={banner.title}>
                    {banner.desc}
                  </Callout>
                )}

                <Field label="Official email" htmlFor="officer-email" required error={errors.email ? 'Email is required' : undefined}>
                  <Input
                    id="officer-email"
                    name="email"
                    type="email"
                    leftIcon="badge"
                    autoComplete="username"
                    placeholder="name@cpcl.co.in"
                    value={values.email}
                    onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                    state={errors.email ? 'error' : 'default'}
                  />
                </Field>

                <Field
                  label="Password"
                  htmlFor="officer-password"
                  required
                  aside={
                    <span className="text-[12px] text-outline">Reset via CPCL IT Cell</span>
                  }
                  error={errors.password ? 'Password is required' : undefined}
                >
                  <Input
                    id="officer-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    leftIcon="lock"
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={values.password}
                    onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
                    state={errors.password ? 'error' : 'default'}
                    rightSlot={<IconButton size="sm" icon={showPassword ? 'visibility_off' : 'visibility'} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)} />}
                  />
                </Field>

                <Field label="Security verification" htmlFor="captcha-input" required aside={<span className="text-[12px] text-outline">Case-sensitive</span>} error={errors.captcha ? 'Enter the security code shown' : undefined}>
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-11 shrink-0 select-none items-center justify-center overflow-hidden rounded-control bg-navy px-4" aria-label="Security code">
                      <span className="pointer-events-none absolute inset-0 opacity-10 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:6px_6px]" />
                      <span className="relative font-mono text-[17px] font-bold tracking-[0.25em] text-primary-fixed">{captchaCode}</span>
                    </div>
                    <IconButton variant="secondary" icon="refresh" aria-label="Regenerate security code" onClick={refreshCaptcha} />
                    <div className="min-w-0 flex-1">
                      <Input
                        id="captcha-input"
                        name="captcha"
                        autoComplete="off"
                        maxLength={6}
                        placeholder="Enter code"
                        className="font-mono uppercase tracking-[0.2em]"
                        value={values.captcha}
                        onChange={(e) => setValues((v) => ({ ...v, captcha: e.target.value }))}
                        state={errors.captcha ? 'error' : 'default'}
                      />
                    </div>
                  </div>
                </Field>

                <Button type="submit" size="lg" variant={phase === 'granted' ? 'brand' : 'primary'} fullWidth loading={phase === 'verifying'} leftIcon={phase === 'granted' ? 'verified_user' : 'lock_open'} className={cn(phase !== 'idle' && 'pointer-events-none')}>
                  {phase === 'verifying' ? 'Verifying credentials…' : phase === 'granted' ? 'Access granted — loading workspace' : 'Sign in to workspace'}
                </Button>

                <div className="flex flex-col items-center gap-2 border-t border-outline-variant pt-5 text-center">
                  <p className="text-body-sm text-on-surface-variant">Authorized personnel only. All access and actions are monitored, timestamped and recorded in the audit registry.</p>
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-outline">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="token" size="xs" className="text-secondary" />
                      e-Mudhra / NIC DSC compatible
                    </span>
                    <span>·</span>
                    <span>TLS 1.3 strict</span>
                  </div>
                </div>
              </form>
            </Card>

            {/* Context panel */}
            <div className="flex flex-col gap-6 lg:col-span-7">
              <Card padding="lg" className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-secondary">Governance platform</span>
                    <span className="font-mono text-[11.5px] text-on-surface-variant">v4.19.8-LTS</span>
                  </div>
                  <h2 className="text-headline-lg text-on-surface">CPCL Procurement Intelligence</h2>
                  <p className="text-body-md text-on-surface-variant">Evidence-driven procurement verification and technical evaluation workspace for Chennai Petroleum Corporation Limited.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-on-surface">Standard procurement life-cycle</span>
                    <span className="text-[12px] text-outline">Stage-gate protocol</span>
                  </div>
                  <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
                    {LIFECYCLE.map((s, i) => (
                      <li key={s.title} className={cn('flex flex-col gap-2 rounded-card border p-3.5', s.current ? 'border-secondary/40 bg-info-container/60' : 'border-outline-variant/70 bg-surface-container-low')}>
                        <div className="flex items-center justify-between">
                          <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold num', s.current ? 'bg-secondary text-white' : 'bg-navy text-white')}>{i + 1}</span>
                          <Icon name={s.icon} size="sm" className={s.current ? 'text-secondary' : 'text-outline'} />
                        </div>
                        <div className={cn('text-[13.5px] font-semibold leading-tight', s.current ? 'text-secondary' : 'text-on-surface')}>{s.title}</div>
                        <div className="text-[12px] leading-snug text-on-surface-variant">{s.sub}</div>
                      </li>
                    ))}
                  </ol>
                </div>

                <Callout tone="info" icon="balance" title={<span className="flex flex-wrap items-center gap-2">Human-in-the-loop governance <StatusBadge tone="info">Mandatory</StatusBadge></span>}>
                  AI assists only with document understanding, metadata cross-checking and compliance assessment. All final determinations, disqualifications and awards remain with the authorized procurement officer.
                </Callout>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {SECURITY.map((s) => (
                    <div key={s.title} className="flex items-start gap-3 rounded-card border border-outline-variant/70 bg-surface-container-low p-3.5">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-container-lowest text-secondary shadow-xs">
                        <Icon name={s.icon} size="sm" />
                      </span>
                      <div>
                        <div className="text-[13.5px] font-semibold text-on-surface">{s.title}</div>
                        <div className="text-[12px] text-on-surface-variant">{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card tone="subtle" padding="md" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Icon name="contact_phone" size="xl" className="text-secondary" />
                  <div>
                    <div className="text-[14px] font-semibold text-on-surface">CPCL IT Cell — digital token helpdesk</div>
                    <div className="text-body-sm text-on-surface-variant">Token renewal, DSC driver support and HSM provisioning.</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-control border border-outline-variant bg-surface-container-lowest px-2.5 py-1 font-mono text-[12.5px] text-on-surface">Ext 4402 / 4408</span>
                  <Button variant="link" size="sm" rightIcon="download">
                    Drivers
                  </Button>
                </div>
              </Card>

              <p className="text-center text-body-sm text-on-surface-variant">
                Are you a vendor?{' '}
                <Link to="/login" className="font-semibold text-secondary hover:underline">
                  Go to bidder login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
