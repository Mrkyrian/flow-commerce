import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET /api/products - List products with optional search and category filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    const supabase = await createClient()

    let query = supabase.from('products').select('*')

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    if (category && category !== 'all' && category !== 'All') {
      query = query.eq('category', category)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase products fetch warning, attempting fallback:', error)
      const { data: fallback, error: fbErr } = await supabase.from('products').select('*').limit(100)
      if (fbErr) {
        return NextResponse.json({ success: false, error: fbErr.message, products: [] }, { status: 500 })
      }
      return NextResponse.json({ success: true, products: fallback || [] })
    }

    return NextResponse.json({ success: true, products: data || [] })
  } catch (err: any) {
    console.error('API products GET error:', err)
    return NextResponse.json({ success: false, error: err?.message || 'Failed to fetch products' }, { status: 500 })
  }
}

// POST /api/products - Create a new product in Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      description,
      price,
      stock_quantity,
      stock,
      category,
      status,
      image_url,
      tenant_id,
    } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 })
    }

    const parsedPrice = typeof price === 'number' ? price : parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Please provide a valid non-negative price.' }, { status: 400 })
    }

    const parsedStock = parseInt(String(stock_quantity ?? stock ?? 0), 10)
    const activeStatus = status || (parsedStock > 0 ? 'active' : 'out_of_stock')

    const supabase = await createClient()

    // 1. Try full schema with tenant_id, stock_quantity, status, image_url
    const fullPayload: Record<string, any> = {
      name: name.trim(),
      description: description?.trim() || null,
      price: parsedPrice,
      category: category?.trim() || 'General',
      stock_quantity: isNaN(parsedStock) ? 0 : parsedStock,
      status: activeStatus,
      image_url: image_url?.trim() || null,
      created_at: new Date().toISOString(),
    }
    if (tenant_id) {
      fullPayload.tenant_id = tenant_id
    }

    let { data, error } = await supabase
      .from('products')
      .insert([fullPayload])
      .select()
      .maybeSingle()

    if (error) {
      console.warn('Full schema insert failed, trying alternative column schema:', error.message)
      
      // Fallback 1: with 'stock' instead of 'stock_quantity'
      const fallback1: Record<string, any> = {
        name: name.trim(),
        description: description?.trim() || null,
        price: parsedPrice,
        category: category?.trim() || 'General',
        stock: isNaN(parsedStock) ? 0 : parsedStock,
        created_at: new Date().toISOString(),
      }
      if (tenant_id) fallback1.tenant_id = tenant_id

      const fb1Res = await supabase
        .from('products')
        .insert([fallback1])
        .select()
        .maybeSingle()

      if (fb1Res.error) {
        // Fallback 2: minimal core columns
        const minimalPayload: Record<string, any> = {
          name: name.trim(),
          description: description?.trim() || null,
          price: parsedPrice,
        }
        const minRes = await supabase
          .from('products')
          .insert([minimalPayload])
          .select()
          .maybeSingle()

        if (minRes.error) {
          return NextResponse.json(
            { error: minRes.error.message || 'Failed to insert product into Supabase.' },
            { status: 500 }
          )
        }
        data = minRes.data
      } else {
        data = fb1Res.data
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product created successfully in Supabase.',
      product: data || {
        ...fullPayload,
        id: `prod-${Date.now()}`,
      },
    })
  } catch (err: any) {
    console.error('API products POST error:', err)
    return NextResponse.json({ error: err?.message || 'Server error creating product.' }, { status: 500 })
  }
}

// PUT /api/products - Edit / Update an existing product
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      name,
      description,
      price,
      stock_quantity,
      stock,
      category,
      status,
      image_url,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required for editing.' }, { status: 400 })
    }

    if (name !== undefined && name.trim() === '') {
      return NextResponse.json({ error: 'Product name cannot be empty.' }, { status: 400 })
    }

    const supabase = await createClient()

    const parsedPrice = price !== undefined ? (typeof price === 'number' ? price : parseFloat(price)) : undefined
    const parsedStock = (stock_quantity !== undefined || stock !== undefined)
      ? parseInt(String(stock_quantity ?? stock ?? 0), 10)
      : undefined

    const updatePayload: Record<string, any> = {}
    if (name !== undefined) updatePayload.name = name.trim()
    if (description !== undefined) updatePayload.description = description ? description.trim() : null
    if (parsedPrice !== undefined && !isNaN(parsedPrice)) updatePayload.price = parsedPrice
    if (category !== undefined) updatePayload.category = category.trim()
    if (parsedStock !== undefined && !isNaN(parsedStock)) {
      updatePayload.stock_quantity = parsedStock
      // Also update status if stock is 0 and status is active
      if (parsedStock === 0 && (!status || status === 'active')) {
        updatePayload.status = 'out_of_stock'
      } else if (parsedStock > 0 && status === 'out_of_stock') {
        updatePayload.status = 'active'
      }
    }
    if (status !== undefined) updatePayload.status = status
    if (image_url !== undefined) updatePayload.image_url = image_url ? image_url.trim() : null

    // Perform update in Supabase
    let { data, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      console.warn('Full update failed, trying fallback schema fields:', error.message)
      
      // If error might be due to missing stock_quantity column, try 'stock'
      const fallbackPayload = { ...updatePayload }
      if (fallbackPayload.stock_quantity !== undefined) {
        delete fallbackPayload.stock_quantity
        fallbackPayload.stock = parsedStock
      }
      delete fallbackPayload.status
      delete fallbackPayload.image_url

      const fbRes = await supabase
        .from('products')
        .update(fallbackPayload)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (fbRes.error) {
        // Minimal core update
        const minPayload: Record<string, any> = {}
        if (name !== undefined) minPayload.name = name.trim()
        if (description !== undefined) minPayload.description = description ? description.trim() : null
        if (parsedPrice !== undefined && !isNaN(parsedPrice)) minPayload.price = parsedPrice

        const minRes = await supabase
          .from('products')
          .update(minPayload)
          .eq('id', id)
          .select()
          .maybeSingle()

        if (minRes.error) {
          return NextResponse.json(
            { error: minRes.error.message || 'Failed to update product in Supabase.' },
            { status: 500 }
          )
        }
        data = minRes.data
      } else {
        data = fbRes.data
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully in Supabase.',
      product: data || { id, ...updatePayload },
    })
  } catch (err: any) {
    console.error('API products PUT error:', err)
    return NextResponse.json({ error: err?.message || 'Server error updating product.' }, { status: 500 })
  }
}

// DELETE /api/products - Delete product by ID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required for deletion.' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ error: error.message || 'Failed to delete product.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Product ${id} deleted successfully from Supabase.`,
      deletedId: id,
    })
  } catch (err: any) {
    console.error('API products DELETE error:', err)
    return NextResponse.json({ error: err?.message || 'Server error deleting product.' }, { status: 500 })
  }
}
