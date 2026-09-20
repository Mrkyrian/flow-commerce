'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  ShoppingBag,
  Settings,
  Plus,
  Search,
  LogOut,
  Store,
  DollarSign,
  Boxes,
  CheckCircle,
  AlertCircle,
  X,
  Menu,
  ChevronRight,
  TrendingUp,
  Tag,
  Layers,
  Filter,
  Trash2,
  RefreshCw,
  CreditCard,
  ArrowUpRight,
  Receipt,
  User,
  Clock,
  ArrowLeft,
  Truck,
  ExternalLink,
  Sparkles
} from 'lucide-react'

interface Tenant {
  id: string
  name: string
  description?: string
  industry_type?: string
  currency?: string
}

interface Product {
  id: string
  tenant_id?: string
  name: string
  description?: string
  price: number
  category?: string
  stock_quantity?: number
  stock?: number
  created_at?: string
  status?: string
}

interface OrderItem {
  id?: string
  order_id: string
  product_id?: string
  product_name?: string
  quantity: number
  unit_price?: number
  price?: number
  total_price?: number
}

interface Order {
  id: string
  tenant_id?: string
  customer_name?: string
  customer_email?: string
  shipping_address?: string
  total_amount?: number
  total?: number
  subtotal?: number
  tax?: number
  shipping_cost?: number
  status: string
  created_at: string
  items?: OrderItem[]
  order_items?: OrderItem[]
}

interface Transaction {
  id: string
  order_id: string
  tenant_id?: string
  amount: number
  currency?: string
  payment_method?: string
  status: string
  transaction_type?: string
  reference?: string
  created_at: string
}

type TabType = 'products' | 'orders' | 'transactions' | 'settings'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('products')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Products State
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Add Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submittingProduct, setSubmittingProduct] = useState(false)
  const [productFormError, setProductFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'General',
    stock_quantity: '10',
  })

  // Orders & Order Items State
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false)
  const [orderStatusMsg, setOrderStatusMsg] = useState<string | null>(null)

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingOrderStatus(true)
      setOrderStatusMsg(null)

      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update order status')
      }

      // Update in orders state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )

      // Update in selectedOrder
      setSelectedOrder((prev) =>
        prev && prev.id === orderId ? { ...prev, status: newStatus } : prev
      )

      setOrderStatusMsg(`Status updated to ${newStatus.toUpperCase()}`)
      setTimeout(() => setOrderStatusMsg(null), 3000)
    } catch (err: any) {
      setOrderStatusMsg(`Error: ${err.message}`)
      setTimeout(() => setOrderStatusMsg(null), 4000)
    } finally {
      setUpdatingOrderStatus(false)
    }
  }

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
    industry_type: 'E-Commerce / Retail',
    currency: 'USD',
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [settingsError, setSettingsError] = useState('')

  // Fetch initial auth, tenant, and data
  useEffect(() => {
    async function initDashboard() {
      try {
        setLoading(true)
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          router.push('/login')
          return
        }

        setUser(authUser)

        // Fetch tenant member info and joined tenant details
        const { data: membership, error: memberError } = await supabase
          .from('tenant_members')
          .select('tenant_id, role, tenants(id, name, description, industry_type, currency)')
          .eq('user_id', authUser.id)
          .maybeSingle()

        if (memberError || !membership?.tenants) {
          router.push('/onboarding')
          return
        }

        const t = membership.tenants as any
        const currentTenant: Tenant = {
          id: t.id || membership.tenant_id,
          name: t.name || 'My Store',
          description: t.description || '',
          industry_type: t.industry_type || 'Retail',
          currency: t.currency || 'USD',
        }

        setTenant(currentTenant)
        setSettingsForm({
          name: currentTenant.name,
          description: currentTenant.description || '',
          industry_type: currentTenant.industry_type || 'E-Commerce / Retail',
          currency: currentTenant.currency || 'USD',
        })

        // Fetch products, orders, and transactions for this tenant
        fetchProducts(currentTenant.id)
        fetchOrders(currentTenant.id)
        fetchTransactions(currentTenant.id)
      } catch (err) {
        console.error('Failed to initialize vendor dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    initDashboard()
  }, [router, supabase])

  // Fetch Products
  const fetchProducts = useCallback(async (tenantId: string) => {
    setProductsLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) {
        const { data: fallbackData } = await supabase
          .from('products')
          .select('*')
          .limit(50)
        setProducts(fallbackData || [])
      } else {
        setProducts(data || [])
      }
    } catch (err) {
      console.warn('Error fetching products:', err)
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [supabase])

  // Fetch Orders and their associated Order Items
  const fetchOrders = useCallback(async (tenantId: string) => {
    setOrdersLoading(true)
    try {
      // 1. Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })

      if (!ordersError && ordersData && ordersData.length > 0) {
        setOrders(ordersData as Order[])
      } else {
        // Fallback without join
        const { data: simpleOrders } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })

        if (simpleOrders && simpleOrders.length > 0) {
          setOrders(simpleOrders as Order[])
        } else {
          setOrders([])
        }
      }
    } catch (err) {
      console.warn('Error fetching orders:', err)
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [supabase])

  // Fetch Transactions
  const fetchTransactions = useCallback(async (tenantId: string) => {
    setTransactionsLoading(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTransactions(data as Transaction[])
      } else {
        setTransactions([])
      }
    } catch (err) {
      console.warn('Error fetching transactions:', err)
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }, [supabase])

  // Refresh all dashboard data
  const handleRefresh = () => {
    if (tenant?.id) {
      fetchProducts(tenant.id)
      fetchOrders(tenant.id)
      fetchTransactions(tenant.id)
    }
  }

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    }
  }

  // Handle Add Product Submit
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setProductFormError('')
    setFormSuccess('')

    if (!productForm.name.trim()) {
      setProductFormError('Product name is required.')
      return
    }

    const priceNum = parseFloat(productForm.price)
    if (isNaN(priceNum) || priceNum < 0) {
      setProductFormError('Please enter a valid non-negative price.')
      return
    }

    const stockNum = parseInt(productForm.stock_quantity, 10)
    if (isNaN(stockNum) || stockNum < 0) {
      setProductFormError('Please enter a valid stock quantity.')
      return
    }

    setSubmittingProduct(true)

    try {
      const tenantId = tenant?.id

      const newProductPayload = {
        tenant_id: tenantId,
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        price: priceNum,
        category: productForm.category.trim() || 'General',
        stock_quantity: stockNum,
        created_at: new Date().toISOString(),
      }

      let { data, error } = await supabase
        .from('products')
        .insert([newProductPayload])
        .select()
        .single()

      if (error) {
        const fallbackPayload = {
          tenant_id: tenantId,
          name: productForm.name.trim(),
          description: productForm.description.trim() || null,
          price: priceNum,
          category: productForm.category.trim() || 'General',
          stock: stockNum,
        }

        const fallbackResult = await supabase
          .from('products')
          .insert([fallbackPayload])
          .select()
          .single()

        if (fallbackResult.error) {
          const minimalPayload = {
            name: productForm.name.trim(),
            description: productForm.description.trim() || null,
            price: priceNum,
          }
          const minResult = await supabase
            .from('products')
            .insert([minimalPayload])
            .select()
            .single()

          if (minResult.error) {
            throw fallbackResult.error
          }
          data = minResult.data
        } else {
          data = fallbackResult.data
        }
      }

      setFormSuccess('Product created successfully!')
      
      const addedProduct: Product = data || {
        id: `prod-${Date.now()}`,
        tenant_id: tenantId,
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: priceNum,
        category: productForm.category.trim() || 'General',
        stock_quantity: stockNum,
        created_at: new Date().toISOString(),
      }

      setProducts((prev) => [addedProduct, ...prev])

      setTimeout(() => {
        setIsModalOpen(false)
        setFormSuccess('')
        setProductForm({
          name: '',
          description: '',
          price: '',
          category: 'General',
          stock_quantity: '10',
        })
        if (tenantId) {
          fetchProducts(tenantId)
        }
      }, 600)
    } catch (err: any) {
      setProductFormError(err?.message || 'Failed to save product to Supabase.')
    } finally {
      setSubmittingProduct(false)
    }
  }

  // Handle Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await supabase.from('products').delete().eq('id', id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id) return
    setSavingSettings(true)
    setSettingsSuccess('')
    setSettingsError('')

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: settingsForm.name.trim(),
          description: settingsForm.description.trim() || null,
          industry_type: settingsForm.industry_type,
          currency: settingsForm.currency,
        })
        .eq('id', tenant.id)

      if (error) {
        throw error
      }

      setTenant((prev) =>
        prev
          ? {
              ...prev,
              name: settingsForm.name.trim(),
              description: settingsForm.description.trim(),
              industry_type: settingsForm.industry_type,
              currency: settingsForm.currency,
            }
          : null
      )
      setSettingsSuccess('Store settings updated successfully!')
      setTimeout(() => setSettingsSuccess(''), 3000)
    } catch (err: any) {
      setSettingsError(err?.message || 'Failed to update store settings.')
    } finally {
      setSavingSettings(false)
    }
  }

  // Filtered Products
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['all', ...Array.from(set)]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  // Total Revenue Calculated from Transactions or Orders
  const totalRevenue = useMemo(() => {
    if (transactions.length > 0) {
      return transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    }
    return orders.reduce((sum, o) => sum + (Number(o.total_amount ?? o.total) || 0), 0)
  }, [transactions, orders])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-neutral-400 font-medium">Loading Vendor Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row">
      
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between bg-neutral-900 border-b border-neutral-800 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
            F
          </div>
          <div>
            <h1 className="text-sm font-bold text-white truncate max-w-[180px]">
              {tenant?.name || 'Flow Commerce'}
            </h1>
            <p className="text-[10px] text-emerald-400">Vendor Workspace</p>
          </div>
        </div>
        <button
          id="mobile-menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg"
          aria-label="Toggle Menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-neutral-800 flex items-center space-x-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950">
              <Store className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] uppercase bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-semibold border border-emerald-800/60">
                {tenant?.industry_type || 'Store'}
              </span>
              <h2 className="text-sm font-bold text-white truncate mt-1">
                {tenant?.name || 'Flow Commerce'}
              </h2>
            </div>
          </div>

          {/* Quick link back to storefront */}
          <div className="p-3 border-b border-neutral-800/60">
            <Link
              href="/"
              className="flex items-center space-x-2 px-3 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs text-neutral-300 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>View Customer Storefront</span>
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1.5">
            <button
              id="nav-products-btn"
              onClick={() => {
                setActiveTab('products')
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'products'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Package className="w-4 h-4" />
                <span>Products</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === 'products'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {products.length}
              </span>
            </button>

            <button
              id="nav-orders-btn"
              onClick={() => {
                setActiveTab('orders')
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'orders'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === 'orders'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {orders.length}
              </span>
            </button>

            <button
              id="nav-transactions-btn"
              onClick={() => {
                setActiveTab('transactions')
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'transactions'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <CreditCard className="w-4 h-4" />
                <span>Transactions</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === 'transactions'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {transactions.length}
              </span>
            </button>

            <button
              id="nav-settings-btn"
              onClick={() => {
                setActiveTab('settings')
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* User & Sign Out Section */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center justify-between mb-3">
            <div className="truncate pr-2">
              <p className="text-[10px] text-neutral-400">Merchant Account</p>
              <p className="text-xs font-semibold text-neutral-200 truncate">{user?.email}</p>
            </div>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/60">
              {tenant?.currency || 'USD'}
            </span>
          </div>

          <button
            id="sidebar-signout-btn"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-neutral-950 hover:bg-neutral-800 text-red-400 hover:text-red-300 rounded-lg text-xs font-medium transition border border-neutral-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="bg-neutral-900/70 backdrop-blur border-b border-neutral-800 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-20">
          <div>
            <div className="flex items-center space-x-2 text-xs text-neutral-400 mb-0.5">
              <span>{tenant?.name || 'Store'}</span>
              <ChevronRight className="w-3 h-3 text-neutral-600" />
              <span className="capitalize text-emerald-400 font-medium">{activeTab}</span>
            </div>
            <h1 className="text-xl font-bold text-white capitalize">
              {activeTab === 'products' && 'Product Inventory'}
              {activeTab === 'orders' && 'Customer Orders & Items'}
              {activeTab === 'transactions' && 'Payment Transactions'}
              {activeTab === 'settings' && 'Store Configuration'}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              title="Refresh Dashboard Data"
              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs flex items-center justify-center border border-neutral-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {activeTab === 'products' && (
              <button
                id="open-add-product-btn"
                onClick={() => {
                  setProductFormError('')
                  setFormSuccess('')
                  setIsModalOpen(true)
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-2 shadow-lg shadow-emerald-950"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Tab Views */}
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">

          {/* ===================== TAB 1: PRODUCTS ===================== */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-400 font-medium">Total Products</p>
                    <p className="text-2xl font-bold text-white mt-1">{products.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-800/60">
                    <Boxes className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-400 font-medium">Total Orders Received</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{orders.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-neutral-800 text-neutral-300 rounded-xl flex items-center justify-center border border-neutral-700">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-400 font-medium">Recorded Volume</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {tenant?.currency || '$'} {totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-800/60">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    id="search-products-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search product name or category..."
                    className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Category:</span>
                  </div>
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c === 'all' ? 'All Categories' : c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                {productsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-neutral-400">Syncing products from Supabase...</span>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-16 px-4 text-center space-y-4">
                    <div className="w-12 h-12 mx-auto bg-neutral-800 border border-neutral-700 rounded-2xl flex items-center justify-center text-neutral-500">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">No products found</h3>
                      <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                        Add items to your catalog to display them on the storefront.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setProductFormError('')
                        setIsModalOpen(true)
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Product</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-neutral-300">
                      <thead className="bg-neutral-950/60 text-[11px] uppercase tracking-wider text-neutral-400 border-b border-neutral-800 font-semibold">
                        <tr>
                          <th className="px-5 py-3.5">Product Name</th>
                          <th className="px-5 py-3.5">Category</th>
                          <th className="px-5 py-3.5">Price</th>
                          <th className="px-5 py-3.5">Stock</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {filteredProducts.map((product) => {
                          const stock = product.stock_quantity ?? product.stock ?? 0
                          const isLowStock = stock <= 3

                          return (
                            <tr key={product.id} className="hover:bg-neutral-800/40 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="font-semibold text-white">{product.name}</div>
                                {product.description && (
                                  <div className="text-[11px] text-neutral-500 truncate max-w-xs mt-0.5">
                                    {product.description}
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                                  <Tag className="w-3 h-3 mr-1 text-neutral-400" />
                                  {product.category || 'General'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 font-semibold text-white">
                                {tenant?.currency || '$'} {Number(product.price).toFixed(2)}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`font-medium ${isLowStock ? 'text-amber-400 font-bold' : 'text-neutral-200'}`}>
                                  {stock} units
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    stock > 0
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                                      : 'bg-red-950 text-red-300 border border-red-800/50'
                                  }`}
                                >
                                  {stock > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  title="Delete product"
                                  className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB 2: ORDERS & ORDER ITEMS ===================== */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Customer Orders & Order Items</h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Real-time orders stored in the <code className="text-emerald-400 font-mono">orders</code> and <code className="text-emerald-400 font-mono">order_items</code> tables.
                    </p>
                  </div>
                  <span className="text-xs bg-emerald-950 text-emerald-300 px-3 py-1 rounded-full border border-emerald-800/50 font-medium">
                    {orders.length} Recorded Orders
                  </span>
                </div>

                {ordersLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-neutral-400">Loading order records...</span>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <ShoppingBag className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-sm font-semibold text-neutral-300">No orders placed yet</p>
                    <p className="text-xs text-neutral-500">
                      When a customer completes checkout on the storefront, orders and items will be logged here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-neutral-300">
                      <thead className="bg-neutral-950/60 text-[11px] uppercase tracking-wider text-neutral-400 border-b border-neutral-800 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Order ID</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Order Items</th>
                          <th className="px-4 py-3">Total Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Timestamp</th>
                          <th className="px-4 py-3 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {orders.map((order) => {
                          const orderItems = order.order_items || order.items || []
                          const total = Number(order.total_amount ?? order.total ?? 0)

                          return (
                            <tr key={order.id} className="hover:bg-neutral-800/40 transition">
                              <td className="px-4 py-3.5 font-mono text-xs text-emerald-400 font-semibold">
                                {order.id.slice(0, 12)}...
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="font-medium text-white">{order.customer_name || 'Customer'}</div>
                                <div className="text-[11px] text-neutral-500">{order.customer_email || 'No email'}</div>
                              </td>
                              <td className="px-4 py-3.5 text-xs text-neutral-300">
                                {orderItems.length > 0 ? (
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-emerald-400">{orderItems.length} item(s)</span>
                                    <p className="text-[11px] text-neutral-400 truncate max-w-xs">
                                      {orderItems.map((it: any) => `${it.product_name || it.product_id || 'Item'} (x${it.quantity || 1})`).join(', ')}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-neutral-500">1 item</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 font-semibold text-white">
                                {tenant?.currency || '$'} {total.toFixed(2)}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-950 text-emerald-300 border-emerald-800/50">
                                  {order.status ? order.status.toUpperCase() : 'COMPLETED'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-[11px] text-neutral-400">
                                {new Date(order.created_at || Date.now()).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end space-x-1.5">
                                  <Link
                                    href={`/track-order?order=${order.id}`}
                                    className="p-1.5 text-emerald-400 hover:text-white bg-neutral-900 hover:bg-emerald-950 border border-neutral-800 hover:border-emerald-800 rounded-lg text-xs transition flex items-center space-x-1"
                                    title="Track Order Live"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                  </Link>
                                  <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg text-xs transition"
                                    title="View Order Details"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB 3: TRANSACTIONS ===================== */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Payment Transactions Log</h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Audit trail of ledger payments stored in the <code className="text-emerald-400 font-mono">transactions</code> table.
                    </p>
                  </div>
                  <span className="text-xs bg-emerald-950 text-emerald-300 px-3 py-1 rounded-full border border-emerald-800/50 font-medium">
                    {transactions.length} Transactions Logged
                  </span>
                </div>

                {transactionsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-neutral-400">Loading transactions log...</span>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <CreditCard className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-sm font-semibold text-neutral-300">No payment transactions recorded</p>
                    <p className="text-xs text-neutral-500">
                      When a customer completes payment during storefront checkout, transaction records will be saved here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-neutral-300">
                      <thead className="bg-neutral-950/60 text-[11px] uppercase tracking-wider text-neutral-400 border-b border-neutral-800 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Transaction Ref</th>
                          <th className="px-4 py-3">Order ID</th>
                          <th className="px-4 py-3">Payment Method</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {transactions.map((txn) => {
                          const amount = Number(txn.amount || 0)

                          return (
                            <tr key={txn.id} className="hover:bg-neutral-800/40 transition">
                              <td className="px-4 py-3.5 font-mono text-xs text-emerald-400 font-semibold">
                                {txn.reference || txn.id.slice(0, 14)}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[11px] text-neutral-400">
                                {txn.order_id ? `${txn.order_id.slice(0, 12)}...` : 'N/A'}
                              </td>
                              <td className="px-4 py-3.5 capitalize text-neutral-200">
                                <span className="inline-flex items-center gap-1 bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded text-[11px]">
                                  <CreditCard className="w-3 h-3 text-emerald-400" />
                                  {txn.payment_method?.replace('_', ' ') || 'Credit Card'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-bold text-white">
                                {txn.currency || tenant?.currency || 'USD'} {amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-950 text-emerald-300 border-emerald-800/50">
                                  {(txn.status || 'succeeded').toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-[11px] text-neutral-400">
                                {new Date(txn.created_at || Date.now()).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB 4: SETTINGS ===================== */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-6">
              <div>
                <h2 className="text-base font-bold text-white">Store Workspace Settings</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Update your store identification, industry type, and default currency.
                </p>
              </div>

              {settingsSuccess && (
                <div className="p-3.5 bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{settingsSuccess}</span>
                </div>
              )}

              {settingsError && (
                <div className="p-3.5 bg-red-950 text-red-300 border border-red-800/60 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{settingsError}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label htmlFor="setting-store-name" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Store / Vendor Name
                  </label>
                  <input
                    id="setting-store-name"
                    type="text"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="setting-store-desc" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Store Description
                  </label>
                  <textarea
                    id="setting-store-desc"
                    rows={3}
                    value={settingsForm.description}
                    onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                    placeholder="Provide a public bio for your shop..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="setting-industry" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Industry Vertical
                    </label>
                    <select
                      id="setting-industry"
                      value={settingsForm.industry_type}
                      onChange={(e) => setSettingsForm({ ...settingsForm, industry_type: e.target.value })}
                      className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
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
                    <label htmlFor="setting-currency" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Store Currency
                    </label>
                    <select
                      id="setting-currency"
                      value={settingsForm.currency}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                      className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
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

                <div className="pt-2">
                  <button
                    id="save-settings-btn"
                    type="submit"
                    disabled={savingSettings}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center space-x-2"
                  >
                    {savingSettings && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>{savingSettings ? 'Saving Changes...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* ===================== ORDER DETAILS MODAL ===================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Order Receipt Details</h3>
                <p className="text-[11px] font-mono text-emerald-400 mt-0.5">{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-neutral-300">
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-500">Customer:</span>
                <span className="font-semibold text-white">{selectedOrder.customer_name || 'Valued Shopper'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-500">Email:</span>
                <span className="text-neutral-200">{selectedOrder.customer_email || 'N/A'}</span>
              </div>
              {selectedOrder.shipping_address && (
                <div className="flex justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500">Shipping Address:</span>
                  <span className="text-neutral-200 text-right max-w-xs">{selectedOrder.shipping_address}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-500">Status:</span>
                <span className="font-bold text-emerald-400 uppercase">{selectedOrder.status || 'COMPLETED'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-500">Total Charged:</span>
                <span className="font-bold text-white">
                  {tenant?.currency || '$'} {Number(selectedOrder.total_amount ?? selectedOrder.total ?? 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Individual Items list */}
            {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase mb-2">Order Items:</p>
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
                  {selectedOrder.order_items.map((it, idx) => (
                    <div key={it.id || idx} className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-medium text-white">{it.product_name || 'Catalog Item'}</p>
                        <p className="text-[10px] text-neutral-500">Quantity: {it.quantity}</p>
                      </div>
                      <span className="font-semibold text-emerald-400">
                        ${Number(it.total_price || (it.unit_price || it.price || 0) * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

              {/* Live Status Management Controls */}
              <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-white uppercase flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Fulfillment Status & Timeline:</span>
                  </label>
                  {orderStatusMsg && (
                    <span className="text-[10px] text-emerald-400 font-semibold">{orderStatusMsg}</span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
                  {(['pending', 'paid', 'processing', 'shipped', 'delivered'] as const).map((st) => {
                    const currentSt = (selectedOrder.status || 'paid').toLowerCase()
                    const isActive = currentSt === st

                    return (
                      <button
                        key={st}
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, st)}
                        disabled={updatingOrderStatus}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold uppercase transition ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                        } disabled:opacity-50`}
                      >
                        {st}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Link
                  href={`/track-order?order=${selectedOrder.id}`}
                  className="w-full py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition"
                >
                  <Truck className="w-4 h-4" />
                  <span>Track Live as Customer</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 text-emerald-400/80" />
                </Link>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ===================== ADD NEW PRODUCT MODAL ===================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-lg w-full bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add New Product</h3>
                  <p className="text-[11px] text-neutral-400">Add an item to your Supabase catalog inventory</p>
                </div>
              </div>
              <button
                id="close-product-modal-btn"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddProduct} className="p-6 space-y-4 overflow-y-auto">
              
              {productFormError && (
                <div className="p-3 bg-red-950 text-red-300 border border-red-800/60 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{productFormError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label htmlFor="prod-name" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Product Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  id="prod-name"
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="prod-desc" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Product Description
                </label>
                <textarea
                  id="prod-desc"
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Key features, specifications, and details for shoppers..."
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Price & Stock Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prod-price" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Price ({tenant?.currency || 'USD'}) <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    required
                    placeholder="49.99"
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="prod-stock" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Stock Quantity <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                    required
                    placeholder="25"
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label htmlFor="prod-category" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Category
                </label>
                <select
                  id="prod-category"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="General">General Merchandise</option>
                  <option value="Audio & Tech">Audio & Tech</option>
                  <option value="Accessories">Accessories & Jewelry</option>
                  <option value="Fashion & Bags">Fashion & Bags</option>
                  <option value="Home & Living">Home & Living</option>
                  <option value="Beauty & Wellness">Beauty & Wellness</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  id="submit-product-btn"
                  type="submit"
                  disabled={submittingProduct}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center space-x-2 shadow-lg shadow-emerald-950"
                >
                  {submittingProduct ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Product</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
