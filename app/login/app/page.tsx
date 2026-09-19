import { createClient } from '@/utils/supabase/server'
import { getSupabaseConfigError } from '@/utils/supabase/env'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const configError = getSupabaseConfigError()
  if (configError) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
        <div className="max-w-2xl mx-auto bg-amber-900/40 border border-amber-700/60 rounded-lg p-6">
          <h1 className="text-xl font-bold text-amber-200">Supabase is not configured</h1>
          <p className="mt-2 text-sm text-amber-100">{configError}</p>
        </div>
      </main>
    )
  }

  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }

  // Fetch tenant member info and joined tenant details securely via RLS
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id, role, tenants(name, industry_type, currency)')
    .eq('user_id', user.id)
    .single()

  const tenant = membership?.tenants as any

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-md gap-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">Flow Commerce Engine</h1>
            <p className="text-sm text-gray-400 mt-1">Logged in as: <span className="text-gray-200">{user.email}</span></p>
          </div>
          <div className="bg-gray-900 px-4 py-3 rounded border border-gray-700 text-left md:text-right w-full md:w-auto">
            <span className="text-xs uppercase bg-emerald-900/60 text-emerald-300 px-2.5 py-1 rounded-full font-semibold border border-emerald-700/50">
              {tenant?.industry_type || 'Multi-Tenant Mode'}
            </span>
            <p className="text-lg font-bold mt-2 text-white">{tenant?.name || 'Unassigned Tenant Workspace'}</p>
          </div>
        </header>

        {/* Core Commerce Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
            <h3 className="text-sm font-medium text-gray-400">Customers</h3>
            <p className="text-3xl font-bold mt-2 text-emerald-400">0</p>
            <p className="text-xs text-gray-500 mt-1">Unified customer directory</p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
            <h3 className="text-sm font-medium text-gray-400">Active Orders</h3>
            <p className="text-3xl font-bold mt-2 text-emerald-400">0</p>
            <p className="text-xs text-gray-500 mt-1">Centralized order stream</p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
            <h3 className="text-sm font-medium text-gray-400">Catalog Items</h3>
            <p className="text-3xl font-bold mt-2 text-emerald-400">0</p>
            <p className="text-xs text-gray-500 mt-1">Products & Services engine</p>
          </div>
        </div>

      </div>
    </main>
  )
}

