'use client';

// Place at: app/login/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Store, Mail, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';

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

export default function MerchantLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Already signed in? Skip the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // e.g. "Invalid login credentials" or "Email not confirmed"
        setErrorMsg(error.message);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
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
            href="/signup"
            id="header-signup-link"
            className="text-xs text-emerald-400 hover:text-emerald-300 transition"
          >
            New Store? Register
          </Link>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Sign In to Your Store</h2>
              <p className="text-xs text-neutral-400">Flow Commerce merchant dashboard access</p>
            </div>
          </div>

          <form
            id="merchant-login-form"
            onSubmit={handleLogin}
            style={{ maxWidth: '400px', margin: '0 auto' }}
          >
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="email" className="block text-xs font-medium text-neutral-300">
                Business Email
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

            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="password" className="block text-xs font-medium text-neutral-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
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

            <button
              id="submit-login-btn"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>

            <p style={{ marginTop: '20px' }} className="text-center text-xs text-neutral-400">
              Need to create a new store?{' '}
              <a href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Register &amp; Onboard
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
