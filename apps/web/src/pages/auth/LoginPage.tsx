// Bidder Login — ported from Stitch screen "CPCL e-Procurement Portal -
// Bidder Login" (project 6921642772921774119, screen
// eebc689107a04f70899f1b4b11c3f406), same design system and layout as
// before. Now backed by a real POST /api/auth/login via AuthContext instead
// of a demo state switcher.
//
// The CAPTCHA field is kept for visual/UX parity with the original design
// but is NOT a real security control — the gateway does not verify it. It
// is cosmetic until a real CAPTCHA service is wired in.

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumbs, Button, Callout, Card, Field, Icon, IconButton, Input, StatusBadge } from '@/components/primitives';
import { cn } from '@/utils/cn';
import { PublicFooter, PublicHeader } from '@/pages/home/PublicChrome';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

const REQUIREMENTS = [
  ['Operating system', 'Windows 10/11 or Ubuntu 20.04+'],
  ['Java runtime', 'JRE 8 Update 251 or higher'],
  ['Supported browsers', 'Edge, Chrome, Firefox (latest)'],
];

// SIH jury convenience — frontend-only, no backend/env dependency. The
// controlled inputs below are initialized directly to these values so they
// render pre-filled on load; the jury still clicks "Sign in" to submit
// through the real, unchanged POST /api/auth/login flow.
const SIH_DEMO_BIDDER_EMAIL = 'bidder@gmail.com';
const SIH_DEMO_BIDDER_PASSWORD = '12345678';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(SIH_DEMO_BIDDER_EMAIL);
  const [password, setPassword] = useState(SIH_DEMO_BIDDER_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      setSuccess(true);
      const dest = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';
      setTimeout(() => navigate(dest, { replace: true }), 900);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Please try again.');
      setSubmitting(false);
    }
  }

  const formDisabled = submitting || success;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-on-surface">
      <PublicHeader active="login" />

      <main id="main-content" className="mx-auto w-full max-w-page flex-1 px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Bidder services' }, { label: 'Bidder login' }]} />
            <h1 className="text-headline-xl-mobile sm:text-page-title text-on-surface">Sign in to the bidder portal</h1>
            <p className="max-w-2xl text-body-lg text-on-surface-variant">Access your bidder account, participate in active tenders and monitor your sealed submissions.</p>
          </div>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Auth panel */}
            <Card padding="none" className="overflow-hidden lg:col-span-7">
              <div className="flex items-center justify-between gap-3 border-b border-navy-700 bg-navy px-6 py-4 text-white sm:px-8">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-white/10 text-saffron">
                    <Icon name="shield_person" size="lg" />
                  </span>
                  <div className="leading-tight">
                    <div className="text-[15px] font-semibold">Bidder authentication</div>
                    <div className="text-[12px] text-white/60">Authorized vendor access only</div>
                  </div>
                </div>
                <span className="hidden rounded-md bg-white/10 px-2 py-1 font-mono text-[11px] text-white/70 sm:inline">CPCL-AUTH-01</span>
              </div>

              <div className="flex flex-col gap-6 p-6 sm:p-8">
                {!error && !success && (
                  <Callout tone="warning" icon="theaters" title="SIH Demo Account">
                    Credentials are pre-filled for the jury demo. Just click Sign in.
                  </Callout>
                )}
                {error && (
                  <Callout tone="danger" title="Login failed">
                    {error}
                  </Callout>
                )}
                {success && (
                  <Callout tone="success" title="Authentication successful">
                    <span className="inline-flex items-center gap-2">
                      <Icon name="progress_activity" size="sm" spin />
                      Redirecting to your bidder dashboard…
                    </span>
                  </Callout>
                )}

                <form onSubmit={handleSubmit} name="bidder-login" className={cn('flex flex-col gap-5 transition-opacity', formDisabled && 'pointer-events-none opacity-50')} aria-disabled={formDisabled}>
                  {/* Chrome ignores autoComplete="off" on login forms by design — the
                      only reliable way to stop it applying a saved credential from the
                      officer login (same origin) onto this bidder form is to give it a
                      decoy pair of fields to autofill into instead. Hidden, not tab-
                      reachable, never read from. */}
                  <div aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
                    <input type="text" name="username" autoComplete="username" tabIndex={-1} />
                    <input type="password" name="current-password" autoComplete="current-password" tabIndex={-1} />
                  </div>
                  <Field label="Login ID" htmlFor="login-id" required helper="Registered email ID" error={error ? 'Check your login ID' : undefined}>
                    <Input id="login-id" name="bidder-login-email" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon="person" state={error ? 'error' : 'default'} autoComplete="off" />
                  </Field>

                  <Field
                    label="Password"
                    htmlFor="password-input"
                    required
                    aside={
                      <a href="#forgot" className="focus-ring rounded text-[12.5px] font-medium text-secondary hover:underline">
                        Forgot password?
                      </a>
                    }
                    error={error ? 'Password is case-sensitive' : undefined}
                  >
                    <Input
                      id="password-input"
                      name="bidder-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leftIcon="key"
                      autoComplete="off"
                      state={error ? 'error' : 'default'}
                      rightSlot={<IconButton size="sm" icon={showPassword ? 'visibility_off' : 'visibility'} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((v) => !v)} />}
                    />
                  </Field>

                  <Field label="Security verification" htmlFor="captcha-input" required helper="Case-sensitive image verification (demo — not enforced yet)">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <div className="captcha-noise relative flex h-11 select-none items-center justify-center rounded-control border border-outline-variant bg-info-container px-5" aria-label="CAPTCHA image">
                          <span className="font-mono text-[18px] font-bold tracking-[0.25em] text-navy line-through decoration-outline/60" style={{ transform: 'skew(-5deg)' }}>
                            X7P4QK
                          </span>
                        </div>
                        <IconButton variant="secondary" icon="refresh" aria-label="Refresh CAPTCHA" />
                        <IconButton variant="secondary" icon="volume_up" aria-label="Audio CAPTCHA" />
                      </div>
                      <div className="flex-1">
                        <Input id="captcha-input" required placeholder="Enter CAPTCHA" defaultValue="X7P4QK" maxLength={6} className="font-mono uppercase tracking-[0.2em]" />
                      </div>
                    </div>
                  </Field>

                  <Button type="submit" size="lg" variant="brand" fullWidth leftIcon="login" loading={submitting || success}>
                    Sign in
                  </Button>

                  <div className="flex flex-col items-center justify-between gap-2 border-t border-outline-variant pt-5 text-[13px] sm:flex-row">
                    <Button variant="link" size="sm" leftIcon="lock_open">
                      Generate / reset password
                    </Button>
                    <Button variant="link" size="sm" leftIcon="person_add" to="/register">
                      Online bidder enrollment
                    </Button>
                    <Button variant="link" size="sm" leftIcon="help">
                      Help for bidders
                    </Button>
                  </div>
                </form>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant bg-surface-container-low px-6 py-3 text-[12px] text-on-surface-variant sm:px-8">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="lock" size="xs" className="text-success" />
                  2048-bit TLS/PKI encrypted channel
                </span>
                <span className="font-mono">Node CHN-PROC-SRV-04</span>
              </div>
            </Card>

            {/* Guidance */}
            <aside className="flex flex-col gap-6 lg:col-span-5">
              <Card padding="lg">
                <div className="mb-5 flex items-center justify-between gap-2">
                  <h2 className="text-headline-sm text-on-surface">Before you sign in</h2>
                  <StatusBadge tone="warning" icon="priority_high">
                    Important
                  </StatusBadge>
                </div>
                <ol className="flex flex-col gap-4">
                  {[
                    <>Enter your registered <strong>login ID and password</strong> exactly — passwords are case-sensitive.</>,
                    <>
                      First-time bidders should complete{' '}
                      <Link to="/register" className="font-semibold text-secondary hover:underline">
                        online bidder enrollment
                      </Link>{' '}
                      to create an account.
                    </>,
                    <>Keep your registered email and mobile handy for <strong>account recovery</strong> and SMS OTP.</>,
                  ].map((body, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info-container text-[12px] font-semibold text-secondary num">{i + 1}</span>
                      <p className="text-body-md text-on-surface-variant [&_strong]:text-on-surface">{body}</p>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex items-center gap-2 rounded-control bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface-variant">
                  <Icon name="workspace_premium" size="sm" className="text-secondary" />
                  Class-3 DSC token required for tender submission
                </div>
              </Card>

              <Card padding="lg">
                <h2 className="mb-4 flex items-center gap-2 text-headline-sm text-on-surface">
                  <Icon name="laptop_chromebook" size="lg" className="text-secondary" />
                  DSC signer requirements
                </h2>
                <dl className="flex flex-col divide-y divide-outline-variant/70 text-body-sm">
                  {REQUIREMENTS.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-on-surface-variant">{k}</dt>
                      <dd className="text-right font-medium text-on-surface">{v}</dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-on-surface-variant">PKI signing utility</dt>
                    <dd>
                      <Button variant="link" size="sm" rightIcon="download">
                        v2.4
                      </Button>
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card tone="subtle" padding="lg">
                <div className="flex items-center gap-2 text-[14px] font-semibold text-on-surface">
                  <Icon name="support_agent" size="lg" className="text-secondary" />
                  Tender technical helpdesk
                </div>
                <p className="mt-1 text-body-sm text-on-surface-variant">Login issues, DSC mapping failures or unlock requests.</p>
                <div className="mt-4 flex flex-col gap-2 text-body-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-on-surface-variant">Toll-free</span>
                    <span className="font-semibold text-on-surface num">1800-425-7800</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-on-surface-variant">Landline</span>
                    <span className="font-mono text-on-surface">+91 44 2594 4000</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-on-surface-variant">Email</span>
                    <span className="font-mono text-secondary">eproc-support@cpcl.co.in</span>
                  </div>
                </div>
                <p className="mt-4 text-[12px] text-outline">Mon–Sat · 09:00–18:00 IST</p>
              </Card>

              <p className="text-center text-body-sm text-on-surface-variant">
                Just browsing?{' '}
                <Link to="/" className="font-semibold text-secondary hover:underline">
                  Return to the tender home page
                </Link>
              </p>
            </aside>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
