'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Truck,
  Search,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Receipt,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Phone,
  Mail,
  User,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  Box
} from 'lucide-react'

interface TrackingStep {
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered'
  title: string
  description: string
  timestamp: string | null
  completed: boolean
  current: boolean
}

interface TrackedOrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  image_url?: string | null
}

interface TrackedOrderData {
  order: {
    id: string
    order_ref: string
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered'
    raw_status: string
    customer_name: string
    customer_email: string
    customer_phone: string
    shipping_address: string
    subtotal: number
    tax: number
    shipping_cost: number
    total_amount: number
    currency: string
    created_at: string
    tenant_name: string
  }
  items: TrackedOrderItem[]
  transaction: {
    id: string
    reference: string
    payment_method: string
    status: string
    amount: number
    currency: string
    created_at: string
  }
  timeline: TrackingStep[]
  currentStepIndex: number
  carrierInfo: {
    carrier: string
    trackingNumber: string
    estimatedDelivery: string
    shippingSpeed: string
    originHub: string
  }
  allMatchesCount?: number
}

interface OrderTrackerViewProps {
  initialQuery?: string
  initialPhone?: string
  isModal?: boolean
  onClose?: () => void
}

export default function OrderTrackerView({
  initialQuery = '',
  initialPhone = '',
  isModal = false,
  onClose,
}: OrderTrackerViewProps) {
  const [searchInput, setSearchInput] = useState(initialQuery || initialPhone || '')
  const [searchType, setSearchType] = useState<'all' | 'order' | 'phone'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<TrackedOrderData | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  // Status simulation/updating for testing
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<string | null>(null)

  const fetchTracking = useCallback(async (query: string, isSilentRefresh = false) => {
    if (!query || !query.trim()) {
      setError('Please enter your Order Number or Phone Number.')
      return
    }

    if (isSilentRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const isPhoneLike = /^[+0-9\s()-]{6,}$/.test(query.trim())
      const params = new URLSearchParams()

      if (isPhoneLike) {
        params.set('phone', query.trim())
      } else {
        params.set('q', query.trim())
      }

      const res = await fetch(`/api/orders/track?${params.toString()}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No matching order found. Please verify your order number or phone.')
      }

      setOrderData(json.data)
      setLastSyncedAt(new Date())
      setError(null)
    } catch (err: any) {
      console.warn('Tracking fetch error:', err)
      if (!isSilentRefresh) {
        setError(err.message || 'Could not locate order. Please check the reference or phone number.')
        setOrderData(null)
      }
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Auto-search on mount if initial query or phone is present
  useEffect(() => {
    if (initialQuery || initialPhone) {
      const q = initialQuery || initialPhone
      setSearchInput(q)
      fetchTracking(q)
    } else {
      // Auto-load latest sample order so customers immediately see a live tracking interface
      fetchTracking('LATEST', true)
    }
  }, [initialQuery, initialPhone, fetchTracking])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return
    fetchTracking(searchInput)
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Quick action: update status in database (for demo & vendor testing)
  const handleQuickStatusChange = async (newStatus: string) => {
    if (!orderData?.order?.id) return
    setUpdatingStatus(true)
    setStatusUpdateMessage(null)

    try {
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.order.id,
          status: newStatus
        })
      })

      const json = await res.json()
      if (res.ok && json.success) {
        setStatusUpdateMessage(`Status updated to ${newStatus.toUpperCase()}`)
        // Refresh tracking data from DB
        await fetchTracking(orderData.order.id, true)
        setTimeout(() => setStatusUpdateMessage(null), 3000)
      } else {
        throw new Error(json.error || 'Failed to update status')
      }
    } catch (err: any) {
      setStatusUpdateMessage(`Update failed: ${err.message}`)
      setTimeout(() => setStatusUpdateMessage(null), 3000)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return {
          bg: 'bg-emerald-950/80 border-emerald-700 text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'Delivered'
        }
      case 'shipped':
        return {
          bg: 'bg-cyan-950/80 border-cyan-700 text-cyan-300',
          dot: 'bg-cyan-400 animate-pulse',
          label: 'In Transit / Shipped'
        }
      case 'processing':
        return {
          bg: 'bg-amber-950/80 border-amber-700 text-amber-300',
          dot: 'bg-amber-400 animate-pulse',
          label: 'Processing in Fulfillment Hub'
        }
      case 'paid':
        return {
          bg: 'bg-blue-950/80 border-blue-700 text-blue-300',
          dot: 'bg-blue-400',
          label: 'Paid & Confirmed'
        }
      case 'pending':
      default:
        return {
          bg: 'bg-neutral-800 border-neutral-700 text-neutral-300',
          dot: 'bg-neutral-400',
          label: 'Order Pending'
        }
    }
  }

  const badge = orderData ? getStatusBadge(orderData.order.status) : null

  return (
    <div className={`w-full ${isModal ? 'max-h-[85vh] overflow-y-auto' : ''}`}>
      
      {/* Search Header Banner */}
      <div className="bg-gradient-to-b from-neutral-900 via-neutral-900/90 to-neutral-950 border-b border-neutral-800 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-950/80 border border-emerald-800/80 rounded-full text-emerald-400 text-xs font-semibold">
              <Truck className="w-3.5 h-3.5" />
              <span>Real-Time Order Tracking</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
              Track Your Package Status
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              Enter your Order Number, Reference code, or registered Phone Number.
            </p>
          </div>

          {orderData && (
            <div className="flex items-center space-x-2 self-start sm:self-center">
              <button
                id="refresh-tracking-btn"
                onClick={() => fetchTracking(orderData.order.id, true)}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center space-x-2 transition disabled:opacity-50"
                title="Sync latest status from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Live Refresh'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar Input Form */}
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                id="order-tracking-search-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. ORD-172685712, 123e4567, or +1 (555) 234-5678"
                className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
              />
            </div>

            <button
              id="submit-order-track-btn"
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Track Order</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Demo Sample Chips */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 pt-1">
            <span className="font-semibold text-neutral-500">Quick query:</span>
            <button
              type="button"
              onClick={() => {
                setSearchInput('LATEST')
                fetchTracking('LATEST')
              }}
              className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-emerald-400 hover:text-emerald-300 font-mono transition"
            >
              Latest Store Order
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchInput('+1 (555) 234-5678')
                fetchTracking('+1 (555) 234-5678')
              }}
              className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-300 hover:text-white font-mono transition"
            >
              Phone: +1 555-234-5678
            </button>
          </div>
        </form>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs flex items-center space-x-3 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="font-semibold">{error}</p>
              <p className="text-[11px] text-red-400/80 mt-0.5">
                Check that your order ID or phone number matches what was submitted during checkout.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Order Details & Stepper */}
      {orderData && (
        <div className="mt-6 space-y-6 animate-fadeIn">
          
          {/* Top Status Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl p-6 shadow-sm space-y-6">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                    Order Reference
                  </span>
                  <div className="inline-flex items-center space-x-1.5 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {orderData.order.order_ref}
                    </span>
                    <button
                      onClick={() => handleCopy(orderData.order.order_ref, 'ref')}
                      className="text-neutral-500 hover:text-white p-0.5"
                      title="Copy reference code"
                    >
                      {copiedKey === 'ref' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <span className="text-[11px] text-neutral-500 font-mono">
                    (ID: {orderData.order.id.slice(0, 8)}...)
                  </span>
                </div>

                <p className="text-xs text-neutral-400">
                  Placed on {new Date(orderData.order.created_at).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })} • Merchant: <strong className="text-neutral-200">{orderData.order.tenant_name}</strong>
                </p>
              </div>

              {/* Status Badge & ETA */}
              <div className="flex flex-wrap items-center gap-3">
                {badge && (
                  <div className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center space-x-2 ${badge.bg}`}>
                    <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                    <span>{badge.label}</span>
                  </div>
                )}

                <div className="bg-neutral-950 border border-neutral-800 px-3.5 py-1.5 rounded-xl text-xs text-right">
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Estimated Arrival</span>
                  <span className="font-bold text-white text-xs">
                    {orderData.carrierInfo.estimatedDelivery}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Stepper Progress Bar */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Fulfillment Milestones</span>
                </span>
                {lastSyncedAt && (
                  <span className="text-[11px] text-neutral-500 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Synced {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </span>
                )}
              </div>

              {/* Responsive Stepper Steps */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
                {orderData.timeline.map((step, idx) => {
                  const isPast = step.completed && !step.current
                  const isCurrent = step.current
                  const isFuture = !step.completed && !step.current

                  return (
                    <div
                      key={step.status}
                      className={`relative p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-emerald-950/40 border-emerald-600 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/50'
                          : isPast
                          ? 'bg-neutral-950/80 border-emerald-900/60 text-neutral-300'
                          : 'bg-neutral-950/40 border-neutral-800 text-neutral-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isPast
                              ? 'bg-emerald-600 text-white'
                              : isCurrent
                              ? 'bg-emerald-500 text-neutral-950 animate-pulse font-extrabold'
                              : 'bg-neutral-800 text-neutral-500'
                          }`}
                        >
                          {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-emerald-300' : isPast ? 'text-white' : 'text-neutral-400'}`}>
                          {step.title}
                        </h4>
                      </div>

                      <p className="text-[11px] text-neutral-400 leading-tight">
                        {step.description}
                      </p>

                      {step.timestamp && (
                        <div className="mt-2 pt-1.5 border-t border-neutral-800/60 text-[10px] text-emerald-400 font-mono">
                          {step.timestamp}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Demo Simulator Bar to test all 5 states */}
            <div className="pt-4 border-t border-neutral-800/80 bg-neutral-950/60 -mx-6 -mb-6 p-4 rounded-b-2xl sm:rounded-b-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-neutral-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-neutral-300">Live Status Demo Switcher:</span>
                <span className="text-[11px] text-neutral-500 hidden sm:inline">(Updates Supabase order row directly)</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(['pending', 'paid', 'processing', 'shipped', 'delivered'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleQuickStatusChange(st)}
                    disabled={updatingStatus}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition ${
                      orderData.order.status === st
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {statusUpdateMessage && (
              <div className="text-xs text-emerald-400 font-semibold text-right">
                {statusUpdateMessage}
              </div>
            )}

          </div>

          {/* 2-Column Grid: Delivery / Carrier details & Order Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col (2 cols): Carrier & Logistics Updates */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Carrier & Logistics Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Courier & Shipping Dispatch</span>
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                    {orderData.carrierInfo.shippingSpeed}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-neutral-500">Assigned Carrier</span>
                    <p className="text-white font-bold text-xs">{orderData.carrierInfo.carrier}</p>
                    <p className="text-[11px] text-neutral-400">Hub: {orderData.carrierInfo.originHub}</p>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-neutral-500">Waybill Tracking #</span>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs font-bold text-emerald-400">{orderData.carrierInfo.trackingNumber}</p>
                      <button
                        onClick={() => handleCopy(orderData.carrierInfo.trackingNumber, 'trk')}
                        className="text-neutral-500 hover:text-white p-0.5"
                        title="Copy tracking number"
                      >
                        {copiedKey === 'trk' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400">Live GPS telemetry enabled</p>
                  </div>
                </div>

                {/* Recipient & Destination Details */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex items-center space-x-2 font-semibold text-neutral-200">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Delivery Destination Address</span>
                  </div>
                  
                  <div className="pl-6 space-y-1 text-neutral-300">
                    <p className="font-bold text-white">{orderData.order.customer_name}</p>
                    <p className="text-neutral-400 leading-relaxed">{orderData.order.shipping_address}</p>
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-neutral-400">
                      <span className="flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-neutral-500" />
                        <span>{orderData.order.customer_email}</span>
                      </span>
                      {orderData.order.customer_phone && (
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-neutral-500" />
                          <span>{orderData.order.customer_phone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items Breakdown List */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Package Contents ({orderData.items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  </h3>
                  <span className="text-xs text-neutral-400">
                    Verified Manifest
                  </span>
                </div>

                <div className="divide-y divide-neutral-800/60">
                  {orderData.items.map((item) => (
                    <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-center text-neutral-500 shrink-0">
                          <Box className="w-5 h-5 text-emerald-400/80" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{item.product_name}</h4>
                          <p className="text-[11px] text-neutral-400">
                            Qty: <strong className="text-neutral-200">{item.quantity}</strong> × ${Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-white">
                          ${Number(item.total_price).toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-emerald-400 font-medium">Ready in batch</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Col: Financials, Payment Proof & Actions */}
            <div className="space-y-6">
              
              {/* Payment & Receipt Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2 border-b border-neutral-800 pb-3">
                  <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Payment & Summary</span>
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Items Subtotal</span>
                    <span className="text-neutral-200 font-medium">${orderData.order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Shipping & Handling</span>
                    <span className="text-neutral-200 font-medium">
                      {orderData.order.shipping_cost === 0 ? (
                        <span className="text-emerald-400 font-bold">FREE</span>
                      ) : (
                        `$${orderData.order.shipping_cost.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Estimated Tax (8%)</span>
                    <span className="text-neutral-200 font-medium">${orderData.order.tax.toFixed(2)}</span>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex justify-between text-sm font-bold text-white">
                    <span>Total Paid</span>
                    <span className="text-emerald-400">
                      {orderData.order.currency} ${orderData.order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Transaction Proof */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Method:</span>
                    <span className="font-semibold text-neutral-200 uppercase">{orderData.transaction.payment_method.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Txn Ref:</span>
                    <span className="font-mono text-emerald-400">{orderData.transaction.reference}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Ledger Status:</span>
                    <span className="inline-flex items-center text-emerald-400 font-semibold space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{orderData.transaction.status.toUpperCase()}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Support & Actions Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-white">Order Assistance</h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Have inquiries regarding your delivery address or carrier timeline? Reach out to the store dispatch team.
                </p>

                <div className="pt-2 space-y-2">
                  <Link
                    href="/"
                    onClick={onClose}
                    className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 border border-neutral-800 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Storefront Catalog</span>
                  </Link>

                  <Link
                    href="/dashboard"
                    className="w-full py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition"
                  >
                    <span>Merchant Management Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* No Order Selected & Empty State */}
      {!orderData && !loading && !error && (
        <div className="mt-8 py-16 bg-neutral-900/60 border border-neutral-800 rounded-3xl text-center p-8 space-y-4">
          <div className="w-16 h-16 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
            <Truck className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">Enter your Order or Phone Number above</h3>
            <p className="text-xs text-neutral-400">
              You can track active deliveries, view fulfillment milestones, and audit item receipts registered in Supabase.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
