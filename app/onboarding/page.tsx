'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

export default function OnboardingPage() {
  const [storeName, setStoreName] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [industryType, setIndustryType] = useState('E-Commerce / Retail')
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuthAndTenant() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/login')
          return
        }

        setUserId(user.id)
        setUserEmail(user.email || null)

        // Check if user already has an existing tenant/store
        const { data: membership } = await supabase
          .from('tenant_members')
          .select('tenant_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (membership?.tenant_id) {
          router.push('/dashboard')
          return
        }
      } catch (err: any) {
        console.warn('Error verifying session:', err)
      } finally {
        setChecking(false)
      }
    }

    checkAuthAndTenant()
  }, [router, supabase])

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName.trim()) {
      setError('Please enter a Store Name.')
      return
    }

    setLoading(true)
    setError('')

    try {
      let currentUserId = userId
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        currentUserId = user.id
      }

      // 1. Insert new tenant record
      const tenantPayload: Record<string, any> = {
        name: storeName.trim(),
        description: storeDescription.trim() || null,
        industry_type: industryType,
        currency: currency,
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert(tenantPayload)
        .select('id')
        .maybeSingle()

      let createdTenantId = tenantData?.id

      if (tenantError || !createdTenantId) {
        // Fallback payload with minimal columns
        const fallbackPayload = {
          name: storeName.trim(),
          description: storeDescription.trim() || null,
        }
        const { data: fallbackTenant, error: fallbackError } = await supabase
          .from('tenants')
          .insert(fallbackPayload)
          .select('id')
          .maybeSingle()

        if (fallbackError && !fallbackTenant) {
          throw fallbackError || tenantError
        }
        createdTenantId = fallbackTenant?.id
      }

      if (createdTenantId) {
        // 2. Insert tenant membership
        const { error: memberError } = await supabase
          .from('tenant_members')
          .insert({
            tenant_id: createdTenantId,
            user_id: currentUserId,
            role: 'owner',
          })

        if (memberError) {
          console.warn('Membership creation warning:', memberError)
        }

        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create store. Please try again.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="flex items-center space-x-3 text-neutral-400">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Checking account setup...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4 py-12">
      <div className="max-w-lg w-full bg-neutral-900 p-8 rounded-2xl shadow-2xl border border-neutral-800">
        
        {/* Navigation back */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs text-neutral-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Storefront</span>
        </Link>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6" />
          </div>
          <span className="text-xs uppercase bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full font-semibold border border-emerald-800/60">
            Store Setup
          </span>
          <h1 className="text-2xl font-bold mt-3 text-white">Create Your Store</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Welcome{userEmail ? `, ${userEmail}` : ''}! Let&apos;s configure your store workspace to get started.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-950/60 text-red-200 text-sm rounded-xl border border-red-800/60 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateStore} className="space-y-5">
          <div>
            <label htmlFor="store-name" className="block text-sm font-medium mb-1.5 text-neutral-200">
              Store Name <span className="text-emerald-400">*</span>
            </label>
            <input
              id="store-name"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-neutral-950 rounded-xl border border-neutral-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-neutral-500"
              placeholder="e.g. Apex Apparel, Modern Goods"
            />
          </div>

          <div>
            <label htmlFor="store-description" className="block text-sm font-medium mb-1.5 text-neutral-200">
              Store Description
            </label>
            <textarea
              id="store-description"
              rows={3}
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-950 rounded-xl border border-neutral-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-neutral-500 resize-none"
              placeholder="Describe your products, business model, or target audience..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="industry-type" className="block text-sm font-medium mb-1.5 text-neutral-200">
                Industry Type
              </label>
              <select
                id="industry-type"
                value={industryType}
                onChange={(e) => setIndustryType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950 rounded-xl border border-neutral-800 focus:outline-none focus:border-emerald-500 text-white"
              >
                <option value="E-Commerce / Retail">E-Commerce / Retail</option>
                <option value="Fashion & Apparel">Fashion & Apparel</option>
                <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                <option value="Food & Beverages">Food & Beverages</option>
                <option value="Digital Services">Digital Services</option>
                <option value="Health & Beauty">Health & Beauty</option>
              </select>
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium mb-1.5 text-neutral-200">
                Default Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950 rounded-xl border border-neutral-800 focus:outline-none focus:border-emerald-500 text-white"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="NGN">NGN (₦)</option>
              </select>
            </div>
          </div>

          <button
            id="create-store-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl font-semibold transition duration-200 disabled:opacity-50 text-white shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating Your Store...</span>
              </>
            ) : (
              <span>Create Store & Go to Dashboard</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
