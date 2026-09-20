'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import OrderTrackerView from '@/components/OrderTrackerView'
import { Store, ShoppingBag, ArrowLeft, LayoutDashboard, Truck, Sparkles } from 'lucide-react'

function TrackOrderContent() {
  const searchParams = useSearchParams()
  const orderParam = searchParams.get('order') || searchParams.get('orderNumber') || searchParams.get('q') || ''
  const phoneParam = searchParams.get('phone') || ''

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-neutral-900/80 backdrop-blur border-b border-neutral-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950 group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white flex items-center">
                Flow<span className="text-emerald-400">Store</span>
              </span>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Independent Merchants</p>
            </div>
          </Link>

          {/* Nav Controls */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-2 px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-xl text-xs font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Back to Store</span>
            </Link>

            <Link
              href="/dashboard"
              className="hidden sm:flex items-center space-x-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-xl text-xs font-semibold transition"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>Merchant Workspace</span>
            </Link>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrderTrackerView
          initialQuery={orderParam}
          initialPhone={phoneParam}
        />
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t border-neutral-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              F
            </div>
            <span className="font-semibold text-neutral-300">Flow Commerce • Package Tracking Portal</span>
          </div>
          <p>© {new Date().getFullYear()} Flow Commerce Inc. Real-time Supabase Order Tracking.</p>
        </div>
      </footer>
    </div>
  )
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-neutral-400">Loading Order Tracker...</p>
          </div>
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  )
}
