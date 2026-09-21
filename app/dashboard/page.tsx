'use client';

// Place at: app/dashboard/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Store, LogOut, ExternalLink, ShieldCheck, Clock, Globe, ArrowLeft } from 'lucide-react';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  industry_type: string;
  currency: string | null;
  timezone: string | null;
};

export default function Dashboard() {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();

      // Not signed in: send to login
      if (!userData.user) {
        router.replace('/login');
        return;
      }

      // RLS limits this to the signed-in merchant's own row
      let { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, industry_type, currency, timezone')
        .maybeSingle();

      // Resilient fallback if schema column names vary (e.g. business_name vs name, or slug not added yet)
      if (error) {
        const fallback = await supabase
          .from('tenants')
          .select('*')
          .maybeSingle();

        if (fallback.data) {
          data = {
            id: fallback.data.id,
            name: fallback.data.name || fallback.data.business_name || 'My Store',
            slug: fallback.data.slug || fallback.data.id,
            industry_type: fallback.data.industry_type || 'retail',
            currency: fallback.data.currency || 'NGN',
            timezone: fallback.data.timezone || 'Africa/Lagos',
          } as any;
          error = null;
        }
      } else if (data) {
        if (!data.name && (data as any).business_name) {
          data.name = (data as any).business_name;
        }
        if (!data.slug) {
          data.slug = data.id;
        }
      }

      if (cancelled) return;

      if (error) setErrorMsg(error.message);
      setEmail(userData.user.email ?? '');
      setTenant(data as Tenant | null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <div className="text-center" style={{ padding: '40px' }}>
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Loading your store...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-10 px-4">
      <div
        id="dashboard-container"
        className="w-full max-w-2xl mx-auto"
        style={{ maxWidth: '640px', margin: '40px auto', padding: '20px' }}
      >
        {/* Navigation Link back to storefront */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            id="back-to-home"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
          </Link>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Session
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-800"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Merchant Dashboard</h2>
                <p className="text-xs text-neutral-400">Signed in as {email}</p>
              </div>
            </div>

            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
              className="inline-flex items-center gap-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700 rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5 text-neutral-400" />
              <span>Sign out</span>
            </button>
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="mt-5 p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl">
              <p role="alert" style={{ color: '#b00020' }} className="text-xs text-red-400 m-0">
                Could not load your store: {errorMsg}
              </p>
            </div>
          )}

          {/* Tenant Details */}
          {tenant ? (
            <div className="mt-6">
              <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-4">
                Store Information
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                  <dt className="text-xs font-medium text-neutral-400">Store name</dt>
                  <dd className="text-sm font-semibold text-white mt-1">{tenant.name}</dd>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                  <dt className="text-xs font-medium text-neutral-400">Store link</dt>
                  <dd className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1.5 break-all">
                    <span>{tenant.slug}</span>
                  </dd>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                  <dt className="text-xs font-medium text-neutral-400">Industry</dt>
                  <dd className="text-sm font-semibold text-neutral-200 mt-1 capitalize">
                    {tenant.industry_type?.replace(/_/g, ' ')}
                  </dd>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                  <dt className="text-xs font-medium text-neutral-400">Currency</dt>
                  <dd className="text-sm font-semibold text-neutral-200 mt-1">{tenant.currency || 'Not specified'}</dd>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 sm:col-span-2">
                  <dt className="text-xs font-medium text-neutral-400">Timezone</dt>
                  <dd className="text-sm font-semibold text-neutral-200 mt-1">{tenant.timezone || 'Not specified'}</dd>
                </div>
              </dl>
            </div>
          ) : (
            !errorMsg && (
              <div className="mt-6 p-6 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
                  No store is linked to this account yet. If you just registered, sign out and register
                  again with a new email, or ask support to link your store.
                </p>
                <div className="mt-4">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    Register new store workspace &rarr;
                  </Link>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
