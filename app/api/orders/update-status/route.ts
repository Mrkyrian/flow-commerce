import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, status } = body

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Both orderId and status are required.' },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']
    const normalized = status.toLowerCase().trim()

    if (!validStatuses.includes(normalized)) {
      return NextResponse.json(
        { error: `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('orders')
      .update({ status: normalized })
      .eq('id', orderId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Supabase update order error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update order status.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${normalized.toUpperCase()}.`,
      order: data || { id: orderId, status: normalized },
    })
  } catch (err: any) {
    console.error('Update status route error:', err)
    return NextResponse.json(
      { error: err?.message || 'Server error updating status.' },
      { status: 500 }
    )
  }
}
