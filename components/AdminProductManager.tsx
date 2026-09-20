'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Check,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Tag,
  DollarSign,
  Boxes,
  Eye,
  ArrowUpDown,
  X,
  Sparkles,
  Layers,
  Archive,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  TrendingDown,
  AlertTriangle,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react'

export interface AdminProduct {
  id: string
  tenant_id?: string
  name: string
  description?: string | null
  price: number
  category?: string
  stock_quantity?: number
  stock?: number
  status?: string // 'active' | 'draft' | 'out_of_stock' | 'archived'
  image_url?: string | null
  created_at?: string
  tenants?: { name: string }
}

interface AdminProductManagerProps {
  products: AdminProduct[]
  tenantId?: string
  currency?: string
  onProductCreated?: (newProd: AdminProduct) => void
  onProductUpdated?: (updatedProd: AdminProduct) => void
  onProductDeleted?: (id: string) => void
  onRefresh?: () => void
  isLoading?: boolean
}

const PRESET_CATEGORIES = [
  'General',
  'Audio & Tech',
  'Accessories & Jewelry',
  'Fashion & Apparel',
  'Home & Living',
  'Beauty & Wellness',
  'Art & Collectibles',
  'Books & Stationery'
]

const SAMPLE_IMAGE_PRESETS = [
  { name: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80' },
  { name: 'Watch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80' },
  { name: 'Leather Bag', url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80' },
  { name: 'Candle & Home', url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&q=80' },
  { name: 'Skincare', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80' },
  { name: 'Camera', url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80' },
]

export default function AdminProductManager({
  products,
  tenantId,
  currency = 'USD',
  onProductCreated,
  onProductUpdated,
  onProductDeleted,
  onRefresh,
  isLoading = false,
}: AdminProductManagerProps) {
  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'stock-asc' | 'name-asc'>('newest')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Modals & Action States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<AdminProduct | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form State (shared for Add and Edit)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'General',
    customCategory: '',
    stock_quantity: '10',
    status: 'active',
    image_url: '',
  })

  // AI Product Copy Generator State
  const [showAiCopyGenerator, setShowAiCopyGenerator] = useState(false)
  const [aiKeyword, setAiKeyword] = useState('')
  const [aiTone, setAiTone] = useState<'persuasive' | 'luxury' | 'modern' | 'minimal' | 'tech'>('persuasive')
  const [isGeneratingAiCopy, setIsGeneratingAiCopy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [generatedAiResult, setGeneratedAiResult] = useState<{
    title: string
    description: string
    category: string
    suggestedPrice?: number
    tags?: string[]
    highlights?: string[]
  } | null>(null)

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text })
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  // Generate AI Copy handler
  const handleGenerateAiCopy = async (overrideKeyword?: string) => {
    const keywordToUse = (overrideKeyword || aiKeyword || formData.name).trim()
    if (!keywordToUse) {
      setAiError('Please provide a product idea, keyword, or name to generate copy.')
      return
    }

    setIsGeneratingAiCopy(true)
    setAiError(null)

    try {
      const response = await fetch('/api/ai/product-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keywordToUse,
          existingName: formData.name,
          categoryHint: formData.category !== 'General' ? formData.category : '',
          tone: aiTone,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate product copy')
      }

      const data = await response.json()
      setGeneratedAiResult(data)
    } catch (err: any) {
      setAiError(err?.message || 'Error generating AI copy. Please try again.')
    } finally {
      setIsGeneratingAiCopy(false)
    }
  }

  // Apply AI Copy to Form
  const handleApplyAiCopy = (field?: 'all' | 'title' | 'description' | 'category' | 'price') => {
    if (!generatedAiResult) return

    setFormData((prev) => {
      const next = { ...prev }
      if (!field || field === 'all' || field === 'title') {
        next.name = generatedAiResult.title
      }
      if (!field || field === 'all' || field === 'description') {
        next.description = generatedAiResult.description
      }
      if (!field || field === 'all' || field === 'category') {
        if (generatedAiResult.category) {
          const isPreset = PRESET_CATEGORIES.includes(generatedAiResult.category)
          if (isPreset) {
            next.category = generatedAiResult.category
          } else {
            next.category = 'Custom'
            next.customCategory = generatedAiResult.category
          }
        }
      }
      if (!field || field === 'all' || field === 'price') {
        if (generatedAiResult.suggestedPrice && (!prev.price || prev.price === '0' || prev.price === '')) {
          next.price = String(generatedAiResult.suggestedPrice)
        }
      }
      return next
    })

    showToast(
      'success',
      field === 'all'
        ? 'AI Product Title, Description & Category applied!'
        : `AI ${field} applied to product form!`
    )
  }

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'General',
      customCategory: '',
      stock_quantity: '10',
      status: 'active',
      image_url: '',
    })
    setModalError(null)
    setShowAiCopyGenerator(false)
    setGeneratedAiResult(null)
    setAiKeyword('')
    setAiError(null)
    setIsAddModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (product: AdminProduct) => {
    const stockVal = product.stock_quantity ?? product.stock ?? 0
    const cat = product.category || 'General'
    const isPresetCat = PRESET_CATEGORIES.includes(cat)

    setFormData({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      category: isPresetCat ? cat : 'Custom',
      customCategory: isPresetCat ? '' : cat,
      stock_quantity: String(stockVal),
      status: product.status || (stockVal > 0 ? 'active' : 'out_of_stock'),
      image_url: product.image_url || '',
    })
    setModalError(null)
    setShowAiCopyGenerator(false)
    setGeneratedAiResult(null)
    setAiKeyword(product.name)
    setAiError(null)
    setEditingProduct(product)
  }

  // Submit Add Product (Direct Supabase API call)
  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!formData.name.trim()) {
      setModalError('Product Name is required.')
      return
    }

    const priceNum = parseFloat(formData.price)
    if (isNaN(priceNum) || priceNum < 0) {
      setModalError('Please enter a valid price (greater than or equal to 0).')
      return
    }

    const stockNum = parseInt(formData.stock_quantity, 10)
    if (isNaN(stockNum) || stockNum < 0) {
      setModalError('Please enter a valid stock quantity.')
      return
    }

    const effectiveCategory = formData.category === 'Custom' 
      ? (formData.customCategory.trim() || 'General') 
      : formData.category

    setSubmitting(true)

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price: priceNum,
          stock_quantity: stockNum,
          category: effectiveCategory,
          status: formData.status,
          image_url: formData.image_url.trim() || null,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save product to Supabase.')
      }

      const created: AdminProduct = json.product || {
        id: `prod-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: priceNum,
        stock_quantity: stockNum,
        category: effectiveCategory,
        status: formData.status,
        image_url: formData.image_url.trim() || null,
        created_at: new Date().toISOString(),
      }

      onProductCreated?.(created)
      showToast('success', `Product "${created.name}" created and synced to Supabase!`)
      setIsAddModalOpen(false)
    } catch (err: any) {
      console.error('Save product error:', err)
      setModalError(err?.message || 'Failed to create product in database.')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Edit Product (Direct Supabase API call)
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    setModalError(null)

    if (!formData.name.trim()) {
      setModalError('Product Name cannot be empty.')
      return
    }

    const priceNum = parseFloat(formData.price)
    if (isNaN(priceNum) || priceNum < 0) {
      setModalError('Please enter a valid price (greater than or equal to 0).')
      return
    }

    const stockNum = parseInt(formData.stock_quantity, 10)
    if (isNaN(stockNum) || stockNum < 0) {
      setModalError('Please enter a valid stock quantity.')
      return
    }

    const effectiveCategory = formData.category === 'Custom' 
      ? (formData.customCategory.trim() || 'General') 
      : formData.category

    setSubmitting(true)

    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price: priceNum,
          stock_quantity: stockNum,
          category: effectiveCategory,
          status: formData.status,
          image_url: formData.image_url.trim() || null,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update product in Supabase.')
      }

      const updated: AdminProduct = json.product || {
        ...editingProduct,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: priceNum,
        stock_quantity: stockNum,
        stock: stockNum,
        category: effectiveCategory,
        status: formData.status,
        image_url: formData.image_url.trim() || null,
      }

      onProductUpdated?.(updated)
      showToast('success', `Product "${updated.name}" updated successfully in Supabase!`)
      setEditingProduct(null)
    } catch (err: any) {
      console.error('Update product error:', err)
      setModalError(err?.message || 'Failed to update product in database.')
    } finally {
      setSubmitting(false)
    }
  }

  // Quick Status Toggle directly from Table / Card
  const handleQuickStatusToggle = async (product: AdminProduct, newStatus: string) => {
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          status: newStatus,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update status')
      }

      const updated: AdminProduct = { ...product, status: newStatus }
      onProductUpdated?.(updated)
      showToast('success', `Status for "${product.name}" set to ${newStatus.toUpperCase()}`)
    } catch (err: any) {
      showToast('error', `Status update failed: ${err.message}`)
    }
  }

  // Quick Stock Adjustment (+/- 5 or custom)
  const handleQuickStockAdjust = async (product: AdminProduct, delta: number) => {
    const current = product.stock_quantity ?? product.stock ?? 0
    const newStock = Math.max(0, current + delta)

    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          stock_quantity: newStock,
          status: newStock === 0 ? 'out_of_stock' : (product.status === 'out_of_stock' ? 'active' : product.status),
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to adjust stock')
      }

      const updated: AdminProduct = {
        ...product,
        stock_quantity: newStock,
        stock: newStock,
        status: newStock === 0 ? 'out_of_stock' : product.status,
      }
      onProductUpdated?.(updated)
      showToast('success', `Stock for "${product.name}" updated to ${newStock} units`)
    } catch (err: any) {
      showToast('error', `Stock adjustment failed: ${err.message}`)
    }
  }

  // Confirm Delete Product (Direct Supabase API call)
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(deletingProduct.id)}`, {
        method: 'DELETE',
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete product from Supabase.')
      }

      onProductDeleted?.(deletingProduct.id)
      showToast('success', `Product "${deletingProduct.name}" removed from database.`)
      setDeletingProduct(null)
    } catch (err: any) {
      console.error('Delete product error:', err)
      showToast('error', `Failed to delete product: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Metrics summary
  const metrics = useMemo(() => {
    let totalStock = 0
    let totalValue = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let activeCount = 0

    products.forEach((p) => {
      const qty = p.stock_quantity ?? p.stock ?? 0
      const price = Number(p.price) || 0
      totalStock += qty
      totalValue += qty * price

      const isOutOfStock = qty === 0 || p.status === 'out_of_stock'
      const isLow = qty > 0 && qty <= 5

      if (isOutOfStock) outOfStockCount++
      else if (isLow) lowStockCount++

      if (p.status === 'active' || (!p.status && qty > 0)) activeCount++
    })

    return {
      totalProducts: products.length,
      totalStock,
      totalValue,
      lowStockCount,
      outOfStockCount,
      activeCount,
    }
  }, [products])

  // Extract category options from real data
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    PRESET_CATEGORIES.forEach((c) => set.add(c))
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['all', ...Array.from(set)]
  }, [products])

  // Filtered & Sorted Product List
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search query
        const q = searchQuery.toLowerCase().trim()
        const matchesQuery =
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          p.id.toLowerCase().includes(q)

        // Category filter
        const matchesCategory =
          selectedCategory === 'all' ||
          (p.category || 'General').toLowerCase() === selectedCategory.toLowerCase()

        // Status filter
        const qty = p.stock_quantity ?? p.stock ?? 0
        const prodStatus = p.status || (qty > 0 ? 'active' : 'out_of_stock')
        let matchesStatus = true

        if (selectedStatus === 'active') matchesStatus = prodStatus === 'active' && qty > 0
        else if (selectedStatus === 'low_stock') matchesStatus = qty > 0 && qty <= 5
        else if (selectedStatus === 'out_of_stock') matchesStatus = qty === 0 || prodStatus === 'out_of_stock'
        else if (selectedStatus === 'draft') matchesStatus = prodStatus === 'draft'
        else if (selectedStatus === 'archived') matchesStatus = prodStatus === 'archived'

        return matchesQuery && matchesCategory && matchesStatus
      })
      .sort((a, b) => {
        const priceA = Number(a.price) || 0
        const priceB = Number(b.price) || 0
        const stockA = a.stock_quantity ?? a.stock ?? 0
        const stockB = b.stock_quantity ?? b.stock ?? 0

        switch (sortBy) {
          case 'price-asc':
            return priceA - priceB
          case 'price-desc':
            return priceB - priceA
          case 'stock-asc':
            return stockA - stockB
          case 'name-asc':
            return a.name.localeCompare(b.name)
          case 'newest':
          default:
            return (b.created_at ? new Date(b.created_at).getTime() : 0) -
              (a.created_at ? new Date(a.created_at).getTime() : 0)
        }
      })
  }, [products, searchQuery, selectedCategory, selectedStatus, sortBy])

  return (
    <div className="space-y-6">

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-semibold border backdrop-blur-md animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700 shadow-emerald-950'
              : 'bg-red-950/90 text-red-200 border-red-700 shadow-red-950'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Action Header Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-950/80 border border-emerald-800/80 rounded-full text-emerald-400 text-xs font-semibold mb-1">
            <Package className="w-3.5 h-3.5" />
            <span>Supabase Product Inventory Table</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Admin Product Management
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Create, modify prices & stock, update descriptions, toggle active statuses, and manage items in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onRefresh && (
            <button
              id="refresh-products-btn"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-xl text-xs font-medium transition flex items-center space-x-2"
              title="Sync latest from Supabase"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh DB</span>
            </button>
          )}

          <button
            id="add-new-product-btn"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-emerald-950"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Inventory KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-4.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Total Catalog Items</span>
            <div className="w-8 h-8 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-800/60">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.totalProducts}</p>
          <span className="text-[11px] text-emerald-400 font-medium">
            {metrics.activeCount} active in storefront
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Inventory Stock Units</span>
            <div className="w-8 h-8 bg-neutral-800 text-neutral-300 rounded-xl flex items-center justify-center border border-neutral-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.totalStock.toLocaleString()}</p>
          <span className="text-[11px] text-neutral-400">Total units across products</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Total Inventory Value</span>
            <div className="w-8 h-8 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-800/60">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {currency} {metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-neutral-400">Calculated retail valuation</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Stock Alerts</span>
            <div className="w-8 h-8 bg-amber-950 text-amber-400 rounded-xl flex items-center justify-center border border-amber-800/60">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-2xl font-bold text-amber-400">{metrics.lowStockCount}</p>
            <span className="text-xs text-neutral-500">low /</span>
            <p className="text-2xl font-bold text-red-400">{metrics.outOfStockCount}</p>
            <span className="text-xs text-neutral-500">out</span>
          </div>
          <span className="text-[11px] text-neutral-400">Requires restocking</span>
        </div>
      </div>

      {/* Search, Filters, and Sort Toolbar */}
      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            id="search-admin-products-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, category, or ID..."
            className="w-full pl-10 pr-8 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Category Dropdown */}
          <div className="relative">
            <select
              id="filter-admin-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:border-emerald-500 appearance-none font-medium"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              id="filter-admin-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:border-emerald-500 appearance-none font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active & In Stock</option>
              <option value="low_stock">Low Stock (≤ 5)</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="draft">Drafts</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort By Dropdown */}
          <div className="relative">
            <select
              id="sort-admin-products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:border-emerald-500 appearance-none font-medium"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price-asc">Sort: Price (Low → High)</option>
              <option value="price-desc">Sort: Price (High → Low)</option>
              <option value="stock-asc">Sort: Stock (Low → High)</option>
              <option value="name-asc">Sort: Name (A → Z)</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'table'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Table View"
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'grid'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Grid Card View"
            >
              Grid
            </button>
          </div>

        </div>

      </div>

      {/* Main Products Listing: Table or Grid */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-neutral-400 font-medium">Syncing product records from Supabase...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-4">
            <div className="w-14 h-14 mx-auto bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center text-neutral-500">
              <Package className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-white">No matching products found</h3>
              <p className="text-xs text-neutral-400">
                {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'Try clearing your search query or reset filters to view all catalog items.'
                  : 'Your database has no products yet. Create your first product below.'}
              </p>
            </div>
            
            <div className="pt-2 flex justify-center gap-3">
              {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('all')
                    setSelectedStatus('all')
                  }}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl text-xs font-semibold transition"
                >
                  Reset Filters
                </button>
              )}
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-md shadow-emerald-950 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950/80 text-[11px] uppercase tracking-wider text-neutral-400 border-b border-neutral-800 font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Product & Thumbnail</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-4 py-3.5">Stock Level</th>
                  <th className="px-4 py-3.5">Active Status</th>
                  <th className="px-4 py-3.5">Quick Stock Adjust</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredProducts.map((product) => {
                  const stock = product.stock_quantity ?? product.stock ?? 0
                  const isLow = stock > 0 && stock <= 5
                  const isOutOfStock = stock === 0
                  const status = product.status || (stock > 0 ? 'active' : 'out_of_stock')

                  return (
                    <tr key={product.id} className="hover:bg-neutral-800/40 transition-colors group">
                      
                      {/* Thumbnail & Title */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-3.5">
                          <div className="relative w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-neutral-600" />
                            )}
                          </div>

                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <h4 className="font-bold text-white text-xs truncate group-hover:text-emerald-400 transition-colors">
                              {product.name}
                            </h4>
                            <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                              {product.description || 'No description provided.'}
                            </p>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              ID: {product.id.slice(0, 10)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-950 text-neutral-300 border border-neutral-800">
                          <Tag className="w-3 h-3 mr-1 text-emerald-400" />
                          {product.category || 'General'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-white text-sm">
                          {currency} {Number(product.price).toFixed(2)}
                        </span>
                      </td>

                      {/* Stock Level */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`font-bold ${
                                isOutOfStock
                                  ? 'text-red-400'
                                  : isLow
                                  ? 'text-amber-400'
                                  : 'text-emerald-300'
                              }`}
                            >
                              {stock} units
                            </span>
                            {isLow && (
                              <span className="px-1.5 py-0.2 bg-amber-950 border border-amber-800 text-amber-300 rounded text-[9px] font-bold uppercase">
                                Low
                              </span>
                            )}
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="w-20 bg-neutral-950 rounded-full h-1.5 border border-neutral-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOutOfStock
                                  ? 'bg-red-500 w-0'
                                  : isLow
                                  ? 'bg-amber-400 w-1/4'
                                  : 'bg-emerald-500 w-3/4'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Active Status Dropdown / Pill */}
                      <td className="px-4 py-3.5">
                        <select
                          value={status}
                          onChange={(e) => handleQuickStatusToggle(product, e.target.value)}
                          className={`text-[11px] font-bold rounded-lg px-2.5 py-1 border focus:outline-none transition cursor-pointer ${
                            status === 'active'
                              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                              : status === 'draft'
                              ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                              : status === 'archived'
                              ? 'bg-neutral-950 border-neutral-800 text-neutral-500'
                              : 'bg-red-950/80 border-red-700 text-red-300'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="out_of_stock">Out of Stock</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>

                      {/* Quick Stock Adjustment (+ / -) */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleQuickStockAdjust(product, -1)}
                            disabled={stock <= 0}
                            className="w-6 h-6 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 border border-neutral-800 rounded-md flex items-center justify-center text-xs font-bold text-neutral-300 transition"
                            title="Decrease Stock by 1"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-xs font-mono font-semibold text-neutral-300">
                            {stock}
                          </span>
                          <button
                            onClick={() => handleQuickStockAdjust(product, 1)}
                            className="w-6 h-6 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-md flex items-center justify-center text-xs font-bold text-neutral-300 transition"
                            title="Increase Stock by 1"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleQuickStockAdjust(product, 10)}
                            className="px-1.5 h-6 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-md flex items-center justify-center text-[10px] font-bold text-emerald-400 transition"
                            title="Add +10 stock"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            id={`edit-product-${product.id}`}
                            onClick={() => handleOpenEditModal(product)}
                            className="p-2 bg-neutral-950 hover:bg-emerald-950 hover:text-emerald-300 text-neutral-300 border border-neutral-800 hover:border-emerald-700 rounded-xl transition"
                            title="Edit product details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-product-${product.id}`}
                            onClick={() => setDeletingProduct(product)}
                            className="p-2 bg-neutral-950 hover:bg-red-950 hover:text-red-300 text-neutral-400 border border-neutral-800 hover:border-red-700 rounded-xl transition"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View Layout */
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const stock = product.stock_quantity ?? product.stock ?? 0
              const isOutOfStock = stock === 0
              const isLow = stock > 0 && stock <= 5
              const status = product.status || (stock > 0 ? 'active' : 'out_of_stock')

              return (
                <div
                  key={product.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4.5 flex flex-col justify-between hover:border-neutral-700 transition space-y-4"
                >
                  <div className="space-y-3">
                    {/* Card Image Banner */}
                    <div className="relative w-full h-40 bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800/80">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 space-y-1">
                          <Package className="w-8 h-8" />
                          <span className="text-[10px]">No Image</span>
                        </div>
                      )}

                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-black/70 backdrop-blur text-white border border-white/10">
                          {product.category || 'General'}
                        </span>
                      </div>

                      <div className="absolute top-2.5 right-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur ${
                            status === 'active'
                              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                              : status === 'draft'
                              ? 'bg-neutral-900/90 text-neutral-300 border-neutral-700'
                              : status === 'archived'
                              ? 'bg-black/90 text-neutral-500 border-neutral-800'
                              : 'bg-red-950/90 text-red-300 border-red-700'
                          }`}
                        >
                          {status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Card Title & Desc */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-white text-sm line-clamp-1">{product.name}</h4>
                        <span className="text-emerald-400 font-bold text-sm shrink-0">
                          {currency} {Number(product.price).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
                        {product.description || 'No description added yet.'}
                      </p>
                    </div>

                    {/* Stock status indicator */}
                    <div className="flex items-center justify-between text-xs bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800/80">
                      <span className="text-neutral-400">Inventory:</span>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${isOutOfStock ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'}`}>
                          {stock} in stock
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleQuickStockAdjust(product, -1)}
                            disabled={stock <= 0}
                            className="w-5 h-5 bg-neutral-950 hover:bg-neutral-800 rounded flex items-center justify-center font-bold text-neutral-400 hover:text-white disabled:opacity-30"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleQuickStockAdjust(product, 1)}
                            className="w-5 h-5 bg-neutral-950 hover:bg-neutral-800 rounded flex items-center justify-center font-bold text-neutral-400 hover:text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 font-mono">
                      ID: {product.id.slice(0, 8)}...
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(product)}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-emerald-950 hover:text-emerald-300 text-neutral-300 border border-neutral-800 hover:border-emerald-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setDeletingProduct(product)}
                        className="p-1.5 bg-neutral-900 hover:bg-red-950 hover:text-red-300 text-neutral-400 border border-neutral-800 hover:border-red-700 rounded-xl transition"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ===================== ADD / EDIT PRODUCT MODAL ===================== */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative max-w-xl w-full bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl flex items-center justify-center">
                  {editingProduct ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Catalog Product'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Direct mapping to Supabase <code className="text-emerald-400 font-mono">products</code> table
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setEditingProduct(null)
                }}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={editingProduct ? handleSaveEditProduct : handleSaveNewProduct}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              {modalError && (
                <div className="p-3.5 bg-red-950/80 text-red-300 border border-red-800 rounded-xl text-xs flex items-center space-x-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* AI Auto-Generate Prompt Card / Banner */}
              <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-800/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 bg-emerald-900/80 border border-emerald-700 text-emerald-300 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>AI Product Copy Generator</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-900 text-emerald-300 border border-emerald-700">
                          Gemini 3.8
                        </span>
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        Generate high-converting titles, descriptions, and category tags from simple keywords
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAiCopyGenerator(!showAiCopyGenerator)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
                  >
                    <span>{showAiCopyGenerator ? 'Hide AI Assistant' : 'Open AI Assistant'}</span>
                  </button>
                </div>

                {showAiCopyGenerator && (
                  <div className="pt-2 border-t border-emerald-900/40 space-y-3 animate-fadeIn">
                    {/* Prompt input & Tone selection */}
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={aiKeyword}
                          onChange={(e) => setAiKeyword(e.target.value)}
                          placeholder="e.g. handmade titanium chronograph watch or noise canceling earbuds..."
                          className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                        />

                        <select
                          value={aiTone}
                          onChange={(e: any) => setAiTone(e.target.value)}
                          className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="persuasive">Sales & Persuasive</option>
                          <option value="luxury">Luxury & Premium</option>
                          <option value="modern">Modern & Sleek</option>
                          <option value="minimal">Clean & Minimalist</option>
                          <option value="tech">Tech & Feature-Rich</option>
                        </select>

                        <button
                          type="button"
                          id="submit-generate-ai-copy-btn"
                          onClick={() => handleGenerateAiCopy()}
                          disabled={isGeneratingAiCopy}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-950 shrink-0"
                        >
                          {isGeneratingAiCopy ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Generate Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Quick Idea Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="text-neutral-500 font-medium">Quick Ideas:</span>
                        {[
                          'Noise-Canceling Studio Headphones',
                          'Minimalist Titanium Watch',
                          'Full-Grain Leather Bag',
                          'Cold-Brew Thermal Infuser',
                          'Botanical Facial Serum',
                        ].map((idea) => (
                          <button
                            key={idea}
                            type="button"
                            onClick={() => {
                              setAiKeyword(idea)
                              handleGenerateAiCopy(idea)
                            }}
                            className="px-2 py-0.5 rounded-lg bg-neutral-900/90 hover:bg-emerald-950 text-neutral-300 hover:text-emerald-300 border border-neutral-800 hover:border-emerald-700 transition"
                          >
                            + {idea}
                          </button>
                        ))}
                      </div>
                    </div>

                    {aiError && (
                      <div className="p-2.5 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-[11px] flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>{aiError}</span>
                      </div>
                    )}

                    {/* AI Generated Result Preview */}
                    {generatedAiResult && (
                      <div className="bg-neutral-950 border border-emerald-800/80 rounded-2xl p-3.5 space-y-2.5 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            AI Copy Ready
                          </span>
                          <button
                            type="button"
                            id="apply-all-ai-copy-btn"
                            onClick={() => handleApplyAiCopy('all')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-md shadow-emerald-950"
                          >
                            <Check className="w-3 h-3" />
                            <span>Apply All to Product</span>
                          </button>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-500 font-semibold">Title:</span>
                              <button
                                type="button"
                                onClick={() => handleApplyAiCopy('title')}
                                className="text-[10px] text-emerald-400 hover:underline"
                              >
                                Apply Title Only
                              </button>
                            </div>
                            <p className="text-white font-bold">{generatedAiResult.title}</p>
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-500 font-semibold">Description:</span>
                              <button
                                type="button"
                                onClick={() => handleApplyAiCopy('description')}
                                className="text-[10px] text-emerald-400 hover:underline"
                              >
                                Apply Description Only
                              </button>
                            </div>
                            <p className="text-neutral-300 leading-relaxed text-[11px]">
                              {generatedAiResult.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-900 text-[10px]">
                            <span className="text-neutral-400">
                              Category: <strong className="text-emerald-300">{generatedAiResult.category}</strong>
                            </span>
                            {generatedAiResult.suggestedPrice && (
                              <span className="text-neutral-400">
                                Suggested Price: <strong className="text-white">${Number(generatedAiResult.suggestedPrice).toFixed(2)}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Product Title with Auto-Generate with AI Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="product-name-input" className="block text-xs font-semibold text-neutral-300">
                    Product Name <span className="text-emerald-400">*</span>
                  </label>
                  <button
                    type="button"
                    id="auto-generate-title-ai-btn"
                    onClick={() => {
                      setShowAiCopyGenerator(true)
                      if (formData.name && !aiKeyword) setAiKeyword(formData.name)
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 hover:border-emerald-600 transition shadow-sm"
                    title="Generate product title with Gemini AI"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Auto-Generate with AI</span>
                  </button>
                </div>
                <input
                  id="product-name-input"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Masterwork Chronograph Watch"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Description with Auto-Generate with AI Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="product-desc-input" className="block text-xs font-semibold text-neutral-300">
                    Product Description
                  </label>
                  <button
                    type="button"
                    id="auto-generate-desc-ai-btn"
                    onClick={() => {
                      setShowAiCopyGenerator(true)
                      if (formData.name && !aiKeyword) setAiKeyword(formData.name)
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 hover:border-emerald-600 transition shadow-sm"
                    title="Generate sales description with Gemini AI"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Auto-Generate with AI</span>
                  </button>
                </div>
                <textarea
                  id="product-desc-input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed specifications, materials, warranty, or customer highlights..."
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none transition"
                />
              </div>

              {/* Price & Stock in 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product-price-input" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Price ({currency}) <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="product-price-input"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="129.99"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="product-stock-input" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Inventory Stock Quantity <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Boxes className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="product-stock-input"
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      placeholder="25"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Category & Status in 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product-cat-input" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Category
                  </label>
                  <select
                    id="product-cat-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    {PRESET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="Custom">+ Custom Category Name</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="product-status-input" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Active Catalog Status
                  </label>
                  <select
                    id="product-status-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="active">Active (Visible to Shoppers)</option>
                    <option value="draft">Draft (Hidden from Store)</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Custom Category input if chosen */}
              {formData.category === 'Custom' && (
                <div>
                  <label htmlFor="custom-cat-name" className="block text-xs font-semibold text-neutral-300 mb-1">
                    Custom Category Name
                  </label>
                  <input
                    id="custom-cat-name"
                    type="text"
                    value={formData.customCategory}
                    onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                    placeholder="e.g. Vintage Watches, Kitchenware, Gaming..."
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Image URL with Preset Suggestions */}
              <div>
                <label htmlFor="product-img-input" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Image URL
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <ImageIcon className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="product-img-input"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full pl-8 pr-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-400">
                  <span className="text-neutral-500">Sample presets:</span>
                  {SAMPLE_IMAGE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: p.url })}
                      className="px-2 py-0.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-md text-emerald-400 hover:text-white transition"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Box if image exists */}
              {formData.image_url && (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center space-x-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                    <Image
                      src={formData.image_url}
                      alt="Preview"
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-xs text-neutral-400">
                    <p className="font-semibold text-white">Image Preview Active</p>
                    <p className="text-[11px] text-emerald-400">Verified image URL</p>
                  </div>
                </div>
              )}

              {/* Form Bottom Buttons */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setEditingProduct(null)
                  }}
                  className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold border border-neutral-800 transition"
                >
                  Cancel
                </button>

                <button
                  id="submit-product-form-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-emerald-950 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full bg-neutral-900 border border-red-900/60 rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleIn">
            <div className="w-12 h-12 bg-red-950 border border-red-800 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">Delete Product from Database?</h3>
              <p className="text-xs text-neutral-400">
                Are you sure you want to permanently remove <strong className="text-white">&ldquo;{deletingProduct.name}&rdquo;</strong> from the Supabase <code className="text-emerald-400 font-mono">products</code> table?
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs space-y-1 text-neutral-400">
              <div className="flex justify-between">
                <span>Product ID:</span>
                <span className="font-mono text-neutral-300">{deletingProduct.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="font-bold text-white">{currency} {Number(deletingProduct.price).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                disabled={submitting}
                className="flex-1 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-product-btn"
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-950 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
