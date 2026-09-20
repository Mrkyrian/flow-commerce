'use client'

import { X, Truck } from 'lucide-react'
import OrderTrackerView from './OrderTrackerView'

interface OrderTrackingModalProps {
  isOpen: boolean
  onClose: () => void
  initialQuery?: string
  initialPhone?: string
}

export default function OrderTrackingModal({
  isOpen,
  onClose,
  initialQuery = '',
  initialPhone = '',
}: OrderTrackingModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="tracking-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col animate-scaleIn">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Live Order Tracking</h2>
              <p className="text-[11px] text-neutral-400">Query Supabase orders by order ID or customer phone</p>
            </div>
          </div>

          <button
            id="close-tracking-modal-btn"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            aria-label="Close Tracking Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <OrderTrackerView
            initialQuery={initialQuery}
            initialPhone={initialPhone}
            isModal={true}
            onClose={onClose}
          />
        </div>

      </div>
    </div>
  )
}
