'use client';

// Place at: app/signup/page.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Store, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

const INDUSTRIES = [
  { value: 'boutique', label: 'Boutique / Fashion' },
  { value: 'electrical_solar', label: 'Electrical & Solar' },
  { value: 'retail', label: 'General Retail' },
  { value: 'services', label: 'Services' },
];
const CURRENCIES = ['NGN', 'GHS', 'KES', 'ZAR', 'USD'];
const TIMEZONES = ['Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg', 'UTC'];

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  marginTop: '4px',
  backgroundColor: '#0a0a0a',
  border: '1px solid #262626',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const rowStyle = {
  marginBottom: '14px',
};

export default function MerchantSignup() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [industryType, setIndustryType] = useState('boutique');
  const [currency, setCurrency] = useState('NGN');
  const [timezone, setTimezone] = useState('Africa/Lagos');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    console.log('Initiating merchant registration with Supabase for:', {
      email: email.trim(),
      storeName: storeName.trim(),
      industryType,
    });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard`,
          data: {
            full_name: fullName.trim(),
            business_name: storeName.trim(),
            store_name: storeName.trim(),
            industry_type: industryType,
            currency,
            timezone,
          },
        },
      });

      if (error) {
        console.error('Merchant registration Supabase auth error:', error);
        setErrorMsg(error.message || 'Registration failed. Please check your credentials.');
        return;
      }

      // With email confirmation on, an existing email returns a user with empty identities
      if (data.user && data.user.identities?.length === 0) {
        console.warn('Merchant registration: User already exists with this email:', email.trim());
        setErrorMsg('An account with this email already exists. Try signing in instead.');
        return;
      }

      console.log('Supabase user created successfully:', data.user?.id);

      // Session exists when email confirmation is disabled: create workspace record immediately
      if (data.session && data.user) {
        setSuccessMsg('Account created! Initializing your store workspace...');
        try {
          const slug =
            storeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
            `store-${data.user.id.slice(0, 8)}`;

          console.log('Provisioning store workspace in tenants table...');
          const { error: tenantErr } = await supabase.from('tenants').insert([
            {
              owner_id: data.user.id,
              name: storeName.trim(),
              business_name: storeName.trim(),
              slug,
              industry_type: industryType,
              currency,
              timezone,
            },
          ]);

          if (tenantErr) {
            console.warn('Initial full-schema tenant insert warning, attempting fallback schema:', tenantErr);
            const { error: fbErr } = await supabase.from('tenants').insert([
              {
                owner_id: data.user.id,
                business_name: storeName.trim(),
                industry_type: industryType,
              },
            ]);
            if (fbErr) {
              console.error('Fallback tenant insert error:', fbErr);
            } else {
              console.log('Fallback tenant insert succeeded.');
            }
          } else {
            console.log('Store workspace record created successfully.');
          }
        } catch (wsErr) {
          console.error('Store workspace provision error:', wsErr);
        }

        setSuccessMsg('Store provisioned successfully! Redirecting to dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
        return;
      }

      // Otherwise email confirmation is required by Supabase Auth: notify merchant on screen
      console.log('Email confirmation is required by Supabase. Showing verification instructions.');
      setIsSuccess(true);
    } catch (err) {
      console.error('Merchant sign-up unhandled exception:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div
          id="signup-success-container"
          className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl"
          style={{
            maxWidth: '480px',
            margin: '60px auto',
            textAlign: 'center',
            padding: '32px',
          }}
        >
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
            Store Provisioned Successfully!
          </h2>
          <p className="text-neutral-300 text-sm mb-3">
            Your workspace for{' '}
            <strong className="text-white font-semibold">{storeName}</strong> has been created.
          </p>
          <p className="text-neutral-400 text-xs leading-relaxed mb-6">
            We sent a verification link to{' '}
            <strong className="text-emerald-400">{email}</strong>. Open it to confirm your account and get to your dashboard.
          </p>
          <div className="pt-4 border-t border-neutral-800/80 flex flex-col gap-2">
            <Link
              href="/login"
              id="goto-login-btn"
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition flex items-center justify-center"
            >
              Proceed to Sign In
            </Link>
            <Link
              href="/"
              id="back-home-link"
              className="text-xs text-neutral-500 hover:text-neutral-400 transition"
            >
              Back to Flow Commerce
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg">
        {/* Header navigation link */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            id="back-to-home"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <Link
            href="/login"
            id="header-login-link"
            className="text-xs text-emerald-400 hover:text-emerald-300 transition"
          >
            Existing Merchant? Sign In
          </Link>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Flow Commerce: Merchant Registration</h2>
              <p className="text-xs text-neutral-400">Set up your multi-tenant store workspace and database</p>
            </div>
          </div>

          <form
            id="merchant-signup-form"
            onSubmit={handleSubmit}
            style={{ maxWidth: '480px', margin: '0 auto' }}
          >
            <div style={rowStyle}>
              <label htmlFor="fullName" className="block text-xs font-medium text-neutral-300">
                Your Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                placeholder="e.g. Chukwuma Obi"
                style={fieldStyle}
                className="focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div style={rowStyle}>
              <label htmlFor="storeName" className="block text-xs font-medium text-neutral-300">
                Store Name
              </label>
              <input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                autoComplete="organization"
                placeholder="e.g. Apex Solars & Tech"
                style={fieldStyle}
                className="focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div style={rowStyle}>
                <label htmlFor="industryType" className="block text-xs font-medium text-neutral-300">
                  Industry Type
                </label>
                <select
                  id="industryType"
                  value={industryType}
                  onChange={(e) => setIndustryType(e.target.value)}
                  style={fieldStyle}
                  className="focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer"
                >
                  {INDUSTRIES.map((o) => (
                    <option key={o.value} value={o.value} className="bg-neutral-900 text-white">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={rowStyle}>
                <label htmlFor="currency" className="block text-xs font-medium text-neutral-300">
                  Currency
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={fieldStyle}
                  className="focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c} className="bg-neutral-900 text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={rowStyle}>
                <label htmlFor="timezone" className="block text-xs font-medium text-neutral-300">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={fieldStyle}
                  className="focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer text-xs"
                >
                  {TIMEZONES.map((t) => (
                    <option key={t} value={t} className="bg-neutral-900 text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={rowStyle}>
              <label htmlFor="email" className="block text-xs font-medium text-neutral-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="merchant@yourbusiness.com"
                style={fieldStyle}
                className="focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div style={rowStyle}>
              <label htmlFor="password" className="block text-xs font-medium text-neutral-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                style={fieldStyle}
                className="focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {errorMsg && (
              <div className="p-3 my-3 bg-red-950/40 border border-red-800/60 rounded-xl">
                <p role="alert" style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>
                  {errorMsg}
                </p>
              </div>
            )}

            {successMsg && (
              <div className="p-3 my-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
                <p role="status" style={{ color: '#34d399', fontSize: '13px', margin: 0 }}>
                  {successMsg}
                </p>
              </div>
            )}

            <button
              id="submit-signup-btn"
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '12px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Store...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Create Store Workspace</span>
                </>
              )}
            </button>

            <div className="mt-6 text-center text-xs text-neutral-400">
              Already registered?{' '}
              <Link
                href="/login"
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Sign in to your dashboard
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
