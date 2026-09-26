// Signed-out confirmation for both portals (/logout?role=bidder|officer).
// Uses the public chrome so it matches the login pages, and offers a direct
// "Sign in again" for the portal the user just left.
//
// TODO: the actual session teardown happens server-side (POST
// /api/auth/logout) before the redirect here.

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Icon } from '@/components/primitives';
import { PublicFooter, PublicHeader } from '@/pages/home/PublicChrome';

export function LogoutPage() {
  const [params] = useSearchParams();
  const officer = params.get('role') === 'officer';
  const time = useMemo(
    () => new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }),
    [],
  );

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-on-surface">
      <PublicHeader active={officer ? 'officer' : 'login'} />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
        <Card padding="lg" className="w-full max-w-[460px] text-center animate-fade-in">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-container text-success">
            <Icon name="check_circle" size="xl" fill />
          </span>
          <h1 className="mt-4 text-headline-lg text-on-surface">You’ve been signed out</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {officer
              ? 'Your Procurement Officer session and DSC token session have ended securely.'
              : 'Your Bidder portal session has ended securely. Saved bid drafts will be available when you sign in again.'}
          </p>

          <div className="mt-5 rounded-control bg-surface-container-low px-4 py-3 text-left text-body-sm text-on-surface-variant">
            <div className="flex items-center justify-between gap-3">
              <span>Portal</span>
              <span className="font-semibold text-on-surface">{officer ? 'Officer workspace' : 'Bidder portal'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span>Signed out at</span>
              <span className="num font-semibold text-on-surface">{time} IST</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button leftIcon="login" to={officer ? '/officer/login' : '/login'}>
              Sign in again
            </Button>
            <Button variant="secondary" leftIcon="home" to="/">
              Go to home
            </Button>
          </div>

          <p className="mt-5 flex items-start justify-center gap-1.5 text-[12px] text-on-surface-variant">
            <Icon name="shield" size="xs" className="mt-0.5" />
            On a shared computer, close the browser to clear any remaining session data.
          </p>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
