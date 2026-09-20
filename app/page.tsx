'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import {
  ShoppingBag,
  Search,
  SlidersHorizontal,
  Plus,
  Minus,
  Trash2,
  X,
  Store,
  CheckCircle2,
  Tag,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  LayoutDashboard,
  Filter,
  Eye,
  Star
} from 'lucide-react'

interface StorefrontProduct {
  id: string
  name: string
  description?: string
  price: number
  category?: string
  stock_quantity?: number
  stock?: number
  image_url?: string
  rating?: number
  badge?: string
  tenant_name?: string
}

interface CartItem {
  product: StorefrontProduct
  quantity: number
}

// Curated high quality default catalog items in case database is just initialized
const DEFAULT_PRODUCTS: StorefrontProduct[] = [
  {
    id: 'prod-def-1',
    name: 'Acoustic Studio Pro Wireless Headphones',
    description: 'Precision-engineered active noise cancellation with 40-hour acoustic battery life and lossless audio drivers.',
    price: 249.99,
    category: 'Audio & Tech',
    stock_quantity: 14,
    badge: 'Bestseller',
    rating: 4.9,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    tenant_name: 'Apex Audio Lab'
  },
  {
    id: 'prod-def-2',
    name: 'Minimalist Titanium Automatic Chronograph',
    description: 'Aircraft-grade lightweight titanium casing with sapphire crystal glass and Japanese automatic movement.',
    price: 385.00,
    category: 'Accessories',
    stock_quantity: 6,
    badge: 'Featured',
    rating: 4.8,
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    tenant_name: 'Vanguard Timepieces'
  },
  {
    id: 'prod-def-3',
    name: 'Full-Grain Artisan Leather Messenger',
    description: 'Handcrafted vegetable-tanned full-grain leather with dedicated 16-inch padded laptop partition and brass hardware.',
    price: 195.00,
    category: 'Fashion & Bags',
    stock_quantity: 9,
    badge: 'Trending',
    rating: 4.7,
    image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
    tenant_name: 'Heritage Leatherworks'
  },
  {
    id: 'prod-def-4',
    name: 'Ergonomic Mechanical Keyboard with RGB',
    description: 'Custom hot-swappable tactile switches, double-shot PBT keycaps, and CNC aluminum unibody construction.',
    price: 169.50,
    category: 'Audio & Tech',
    stock_quantity: 18,
    badge: 'New Arrival',
    rating: 4.9,
    image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    tenant_name: 'Apex Audio Lab'
  },
  {
    id: 'prod-def-5',
    name: 'Cold-Brew Precision Thermal Infuser',
    description: 'Double-walled vacuum insulated stainless steel with ultra-fine micro-mesh filter basket for 24hr cold retention.',
    price: 48.00,
    category: 'Home & Living',
    stock_quantity: 22,
    badge: 'Popular',
    rating: 4.6,
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
    tenant_name: 'Nordic Roast Co.'
  },
  {
    id: 'prod-def-6',
    name: 'Polarized Geometric Acetate Sunglasses',
    description: 'Hand-polished Italian acetate frame with 100% UV400 anti-reflective polarized scratch-resistant lenses.',
    price: 129.00,
    category: 'Accessories',
    stock_quantity: 12,
    badge: 'Limited',
    rating: 4.8,
    image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
    tenant_name: 'Vanguard Timepieces'
  },
  {
    id: 'prod-def-7',
    name: 'Organic Botanical Restorative Face Serum',
    description: 'Potent vitamin C, hyaluronic acid, and cold-pressed botanical extracts for deep hydration and barrier protection.',
    price: 64.00,
    category: 'Beauty & Wellness',
    stock_quantity: 30,
    badge: 'Staff Pick',
    rating: 4.9,
    image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
    tenant_name: 'Lumina Botanicals'
  },
  {
    id: 'prod-def-8',
    name: 'Heavyweight Loopback French Terry Hoodie',
    description: '450 GSM custom knit organic cotton with reinforced double-needle coverstitch and relaxed drop-shoulder drape.',
    price: 110.00,
    category: 'Fashion & Bags',
    stock_quantity: 15,
    badge: 'Essential',
    rating: 4.7,
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80',
    tenant_name: 'Heritage Leatherworks'
  }
]

export default function StorefrontPage() {
  const supabase = createClient()

  // Product & Data State
  const [products, setProducts] = useState<StorefrontProduct[]>(DEFAULT_PRODUCTS)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'name'>('featured')
  const [priceRange, setPriceRange] = useState<number>(500)

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartSuccessMessage, setCartSuccessMessage] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)

  // Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState<StorefrontProduct | null>(null)

  // Fetch real products from Supabase on mount
  useEffect(() => {
    async function loadCatalog() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, tenants(name)')
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          const dbProducts: StorefrontProduct[] = data.map((item: any, idx: number) => {
            const defaultFallback = DEFAULT_PRODUCTS[idx % DEFAULT_PRODUCTS.length]
            return {
              id: item.id || `db-${idx}`,
              name: item.name || defaultFallback.name,
              description: item.description || defaultFallback.description,
              price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || defaultFallback.price,
              category: item.category || defaultFallback.category,
              stock_quantity: item.stock_quantity ?? item.stock ?? defaultFallback.stock_quantity,
              badge: item.badge || (idx === 0 ? 'New In Catalog' : undefined),
              rating: 4.8,
              image_url: item.image_url || defaultFallback.image_url,
              tenant_name: item.tenants?.name || 'Flow Merchant'
            }
          })

          // Merge db products first, supplemented with curated defaults if catalog is small
          if (dbProducts.length < 4) {
            setProducts([...dbProducts, ...DEFAULT_PRODUCTS.slice(dbProducts.length)])
          } else {
            setProducts(dbProducts)
          }
        }
      } catch (err) {
        console.warn('Using default demo storefront catalog:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCatalog()
  }, [supabase])

  // Categories list derived from products
  const categories = useMemo(() => {
    const list = new Set<string>()
    products.forEach((p) => {
      if (p.category) list.add(p.category)
    })
    return ['All', ...Array.from(list)]
  }, [products])

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.tenant_name && product.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory
      const matchesPrice = product.price <= priceRange

      return matchesSearch && matchesCategory && matchesPrice
    })

    if (sortBy === 'price-low') {
      result = [...result].sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price-high') {
      result = [...result].sort((a, b) => b.price - a.price)
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    }

    return result
  }, [products, searchQuery, selectedCategory, priceRange, sortBy])

  // Cart Operations
  const addToCart = (product: StorefrontProduct, quantity: number = 1) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id)
      if (existing) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prevCart, { product, quantity }]
    })

    setCartSuccessMessage(`Added "${product.name}" to cart`)
    setIsCartOpen(true)
    setTimeout(() => setCartSuccessMessage(null), 2500)
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta
            return newQty > 0 ? { ...item, quantity: newQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId))
  }

  const totalCartItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  }, [cart])

  const shipping = subtotal > 150 || subtotal === 0 ? 0 : 12.0
  const tax = subtotal * 0.08
  const grandTotal = subtotal + shipping + tax

  // Handle Checkout Simulation
  const handleCheckout = () => {
    setIsCheckingOut(true)
    setTimeout(() => {
      setIsCheckingOut(false)
      setOrderComplete(true)
      setCart([])
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-emerald-500 selection:text-neutral-950">
      
      {/* Top Banner */}
      <div className="bg-emerald-950/80 border-b border-emerald-900/60 px-4 py-2 text-center text-xs text-emerald-300 font-medium tracking-wide flex items-center justify-center space-x-3">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span>Complimentary Express Shipping on all global storefront orders above $150</span>
        <span className="hidden sm:inline text-emerald-600">•</span>
        <span className="hidden sm:inline text-emerald-400 font-semibold">Multi-Vendor Powered</span>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950 ring-1 ring-emerald-400/30 group-hover:scale-105 transition duration-200">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Flow<span className="text-emerald-400">Store</span>
              </span>
              <p className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider">Independent Merchants</p>
            </div>
          </Link>

          {/* Search Input in Header */}
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, brands, or categories..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-3">
            <Link
              id="vendor-dashboard-link"
              href="/dashboard"
              className="hidden sm:inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vendor Portal</span>
            </Link>

            <Link
              id="header-login-link"
              href="/login"
              className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition"
            >
              Sign In
            </Link>

            {/* Shopping Cart Trigger Button */}
            <button
              id="open-cart-btn"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center transition active:scale-95"
              aria-label="Open Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartItems > 0 && (
                <span
                  id="cart-badge-count"
                  className="absolute -top-1.5 -right-1.5 bg-white text-emerald-950 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-scaleIn"
                >
                  {totalCartItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 py-3 bg-neutral-900 border-b border-neutral-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950/60 border border-neutral-800 p-8 sm:p-12 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Autumn Release & Artisan Goods</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Curated Commerce from Top Independent Makers.
            </h1>
            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
              Explore direct-to-consumer goods, bespoke electronics, lifestyle accessories, and limited production runs from verified vendors.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setSelectedCategory('All')
                  setSearchQuery('')
                  window.scrollTo({ top: 500, behavior: 'smooth' })
                }}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-950 transition inline-flex items-center space-x-2"
              >
                <span>Browse All Products</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/onboarding"
                className="px-5 py-3 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white text-sm font-medium rounded-xl border border-neutral-700/60 transition"
              >
                Open Your Vendor Store
              </Link>
            </div>
          </div>

          {/* Decorative Corner Glow */}
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-10 bottom-10 hidden lg:block opacity-30 text-emerald-400 pointer-events-none">
            <Store className="w-48 h-48 stroke-1" />
          </div>
        </section>

        {/* Filters & Control Bar */}
        <section className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
            
            {/* Category Filter Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
              <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider pl-1 pr-2 hidden sm:inline">
                Category:
              </span>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    selectedCategory === category
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900'
                      : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800/80'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Sort & Price Filter Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-800">
              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
                <span>Max Price:</span>
                <span className="text-emerald-400 font-bold">${priceRange}</span>
              </div>
              <input
                type="range"
                min="30"
                max="500"
                step="10"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-24 sm:w-28 accent-emerald-500 cursor-pointer"
              />

              <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

              <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
                <span>Sort:</span>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="featured">Featured Picks</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Product Name (A-Z)</option>
                </select>
              </div>
            </div>

          </div>

          {/* Results Count & Active Filters Indicator */}
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>
              Showing <strong className="text-neutral-200">{filteredProducts.length}</strong> items
              {selectedCategory !== 'All' && ` in ${selectedCategory}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
            {(selectedCategory !== 'All' || searchQuery || priceRange < 500) && (
              <button
                onClick={() => {
                  setSelectedCategory('All')
                  setSearchQuery('')
                  setPriceRange(500)
                }}
                className="text-emerald-400 hover:text-emerald-300 font-medium underline"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </section>

        {/* Product Grid */}
        <section>
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-neutral-400 font-medium">Loading catalog items...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 bg-neutral-900 border border-neutral-800 rounded-2xl text-center p-8 space-y-4">
              <div className="w-14 h-14 bg-neutral-800 border border-neutral-700 rounded-2xl mx-auto flex items-center justify-center text-neutral-500">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">No matching products found</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                  We couldn&apos;t find anything matching your search criteria. Try adjusting your category or price filters.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory('All')
                  setSearchQuery('')
                  setPriceRange(500)
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const isOutOfStock = (product.stock_quantity ?? product.stock ?? 1) <= 0

                return (
                  <div
                    key={product.id}
                    className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-neutral-950/60 hover:-translate-y-1"
                  >
                    {/* Card Top / Image Area */}
                    <div className="relative aspect-square w-full bg-neutral-950 overflow-hidden">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-950">
                          <Store className="w-12 h-12" />
                        </div>
                      )}

                      {/* Badge in top left */}
                      {product.badge && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-emerald-900/90 text-emerald-300 border border-emerald-700/60 shadow-md backdrop-blur-sm">
                            {product.badge}
                          </span>
                        </div>
                      )}

                      {/* Quick View Button */}
                      <button
                        onClick={() => setQuickViewProduct(product)}
                        className="absolute bottom-3 right-3 p-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white rounded-xl border border-neutral-700/80 shadow-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                        title="Quick View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {product.category || 'General'}
                          </span>
                          {product.rating && (
                            <div className="flex items-center space-x-1 text-xs text-amber-400 font-medium">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              <span>{product.rating}</span>
                            </div>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                          {product.name}
                        </h3>

                        {product.description && (
                          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                      </div>

                      {/* Card Footer: Price & Add to Cart */}
                      <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-neutral-500 font-medium">Price</p>
                          <p className="text-lg font-extrabold text-white">
                            ${Number(product.price).toFixed(2)}
                          </p>
                        </div>

                        <button
                          id={`add-to-cart-${product.id}`}
                          onClick={() => addToCart(product)}
                          disabled={isOutOfStock}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-md ${
                            isOutOfStock
                              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/40'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
                        </button>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Value Proposition Highlights */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-neutral-800">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex items-start space-x-4">
            <div className="p-3 bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Global Express Logistics</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Fast and fully tracked shipments dispatch directly from certified vendor hubs.
              </p>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex items-start space-x-4">
            <div className="p-3 bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Direct Merchant Escrow</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Your payments are protected with 256-bit encrypted checkout and buyer guarantees.
              </p>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex items-start space-x-4">
            <div className="p-3 bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 rounded-xl">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">30-Day Effortless Returns</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Enjoy complete peace of mind with simple hassle-free returns on all standard catalog orders.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t border-neutral-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              F
            </div>
            <span className="text-sm font-bold text-white">Flow Commerce Engine</span>
          </div>
          <p className="text-xs text-neutral-500 text-center sm:text-right">
            © {new Date().getFullYear()} Flow Commerce Inc. All rights reserved. Multi-tenant storefront platform.
          </p>
        </div>
      </footer>

      {/* ===================== SLIDE-OVER SHOPPING CART SIDEBAR ===================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop overlay */}
          <div
            id="cart-backdrop"
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fadeIn"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <aside className="w-screen max-w-md bg-neutral-900 border-l border-neutral-800 text-white flex flex-col justify-between shadow-2xl animate-slideInRight">
              
              {/* Cart Header */}
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-emerald-950 border border-emerald-800/80 text-emerald-400 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Shopping Cart</h3>
                    <p className="text-xs text-neutral-400">
                      {totalCartItems} {totalCartItems === 1 ? 'item' : 'items'} selected
                    </p>
                  </div>
                </div>
                <button
                  id="close-cart-btn"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Added to cart toast inside slide-over */}
              {cartSuccessMessage && (
                <div className="mx-4 mt-4 p-3 bg-emerald-950/90 text-emerald-300 border border-emerald-800/70 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="truncate">{cartSuccessMessage}</span>
                </div>
              )}

              {/* Order Confirmation Notification */}
              {orderComplete && (
                <div className="m-6 p-5 bg-emerald-950 border border-emerald-800 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-900/60 rounded-full mx-auto flex items-center justify-center text-emerald-300">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Order Placed Successfully!</h4>
                    <p className="text-xs text-emerald-200/80 mt-1">
                      A receipt has been generated and dispatched to your vendor fulfillment queue.
                    </p>
                  </div>
                  <button
                    onClick={() => setOrderComplete(false)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Continue Shopping
                  </button>
                </div>
              )}

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-neutral-800/60">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
                    <div className="w-16 h-16 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center text-neutral-600">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-300">Your cart is empty</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Explore the storefront and add items to your cart.</p>
                    </div>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="pt-4 first:pt-0 flex space-x-4">
                      {/* Product Thumbnail */}
                      <div className="relative w-16 h-16 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0">
                        {item.product.image_url ? (
                          <Image
                            src={item.product.image_url}
                            alt={item.product.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600">
                            <Store className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Product Info & Controls */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-white line-clamp-1">{item.product.name}</h4>
                            <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                              ${Number(item.product.price).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-neutral-500 hover:text-red-400 transition"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quantity Adjuster */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2 bg-neutral-950 border border-neutral-800 rounded-lg p-1">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold px-1.5">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-xs font-bold text-neutral-200">
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer / Checkout Summary */}
              {cart.length > 0 && (
                <div className="p-6 bg-neutral-950 border-t border-neutral-800 space-y-4">
                  <div className="space-y-2 text-xs text-neutral-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-neutral-200 font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Shipping</span>
                      <span className="text-neutral-200 font-medium">
                        {shipping === 0 ? <span className="text-emerald-400 font-bold">FREE</span> : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Tax (8%)</span>
                      <span className="text-neutral-200 font-medium">${tax.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-neutral-800 flex justify-between text-sm font-bold text-white">
                      <span>Grand Total</span>
                      <span className="text-emerald-400">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    id="checkout-btn"
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : (
                      <>
                        <span>Proceed to Secure Checkout</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-neutral-500">
                    Encrypted transactions • 30-Day return guarantee
                  </p>
                </div>
              )}

            </aside>
          </div>
        </div>
      )}

      {/* ===================== QUICK VIEW PRODUCT MODAL ===================== */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
            
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-neutral-950/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full border border-neutral-700 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Image */}
            <div className="relative md:w-1/2 aspect-square bg-neutral-950">
              {quickViewProduct.image_url ? (
                <Image
                  src={quickViewProduct.image_url}
                  alt={quickViewProduct.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                  <Store className="w-16 h-16" />
                </div>
              )}
            </div>

            {/* Modal Details */}
            <div className="p-6 md:w-1/2 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  {quickViewProduct.category || 'General'}
                </span>
                <h3 className="text-xl font-bold text-white">{quickViewProduct.name}</h3>
                <p className="text-2xl font-extrabold text-emerald-400">
                  ${Number(quickViewProduct.price).toFixed(2)}
                </p>
                <p className="text-xs text-neutral-400 leading-relaxed pt-2">
                  {quickViewProduct.description || 'Premium artisan catalog product.'}
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-800 space-y-3">
                <button
                  onClick={() => {
                    addToCart(quickViewProduct)
                    setQuickViewProduct(null)
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950 flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Shopping Cart</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
