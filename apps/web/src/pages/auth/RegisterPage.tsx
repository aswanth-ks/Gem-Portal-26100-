// Bidder registration — new page (Phase 1 requires real Register; it didn't
// exist before). Same public chrome and card language as LoginPage rather
// than a new visual style. POSTs to /api/auth/register via AuthContext,
// which creates both the User and the BidderProfile in one call.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumbs, Button, Callout, Card, Field, Icon, Input } from '@/components/primitives';
import { PublicFooter, PublicHeader } from '@/pages/home/PublicChrome';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

interface FormState {
  organizationName: string;
  registrationNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  confirmPassword: string;
}

const EMPTY: FormState = { organizationName: '', registrationNumber: '', contactPerson: '', email: '', phone: '', address: '', password: '', confirmPassword: '' };

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');

    setSubmitting(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        organizationName: form.organizationName,
        registrationNumber: form.registrationNumber,
        contactPerson: form.contactPerson,
        phone: form.phone,
        address: form.address,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-on-surface">
      <PublicHeader active="login" />

      <main id="main-content" className="mx-auto w-full max-w-page flex-1 px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Bidder services' }, { label: 'Online bidder enrollment' }]} />
          <div>
            <h1 className="text-headline-xl-mobile sm:text-page-title text-on-surface">Register as a bidder</h1>
            <p className="mt-1 max-w-2xl text-body-lg text-on-surface-variant">Create your organization's account to browse tenders and submit bids.</p>
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-navy-700 bg-navy px-6 py-4 text-white sm:px-8">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-white/10 text-saffron">
                <Icon name="domain_add" size="lg" />
              </span>
              <div className="leading-tight">
                <div className="text-[15px] font-semibold">Organization details</div>
                <div className="text-[12px] text-white/60">All fields are mandatory</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 sm:p-8">
              {error && (
                <Callout tone="danger" title="Could not create your account">
                  {error}
                </Callout>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Organization name" htmlFor="organizationName" required>
                  <Input id="organizationName" required value={form.organizationName} onChange={set('organizationName')} leftIcon="apartment" placeholder="ABC Engineering Pvt Ltd" />
                </Field>
                <Field label="Registration number" htmlFor="registrationNumber" required helper="CIN / GST / company registration number">
                  <Input id="registrationNumber" required value={form.registrationNumber} onChange={set('registrationNumber')} leftIcon="badge" placeholder="U74999TN2011PTC012345" />
                </Field>
                <Field label="Contact person" htmlFor="contactPerson" required>
                  <Input id="contactPerson" required value={form.contactPerson} onChange={set('contactPerson')} leftIcon="person" placeholder="Full name" />
                </Field>
                <Field label="Phone" htmlFor="phone" required>
                  <Input id="phone" required type="tel" value={form.phone} onChange={set('phone')} leftIcon="call" placeholder="+91 98765 43210" />
                </Field>
                <Field className="sm:col-span-2" label="Registered address" htmlFor="address" required>
                  <Input id="address" required value={form.address} onChange={set('address')} leftIcon="location_on" placeholder="Street, city, state, PIN" />
                </Field>
                <Field className="sm:col-span-2" label="Email (this becomes your login ID)" htmlFor="email" required>
                  <Input id="email" required type="email" value={form.email} onChange={set('email')} leftIcon="mail" placeholder="you@company.com" autoComplete="username" />
                </Field>
                <Field label="Password" htmlFor="password" required helper="At least 8 characters">
                  <Input id="password" required type="password" minLength={8} value={form.password} onChange={set('password')} leftIcon="key" autoComplete="new-password" />
                </Field>
                <Field label="Confirm password" htmlFor="confirmPassword" required>
                  <Input id="confirmPassword" required type="password" value={form.confirmPassword} onChange={set('confirmPassword')} leftIcon="key" autoComplete="new-password" />
                </Field>
              </div>

              <Button type="submit" size="lg" variant="brand" fullWidth leftIcon="how_to_reg" loading={submitting}>
                Create account
              </Button>

              <p className="text-center text-body-sm text-on-surface-variant">
                Already registered?{' '}
                <Link to="/login" className="font-semibold text-secondary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
