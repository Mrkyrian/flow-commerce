'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  ShoppingBag,
  Check,
  RotateCcw,
  Tag,
  ChevronRight,
  Eye,
  Boxes,
  HelpCircle,
  Zap,
  ArrowUpRight,
  Plus
} from 'lucide-react'

export interface StorefrontProduct {
  id: string
  tenant_id?: string
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

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  recommendedProducts?: StorefrontProduct[]
  suggestedFollowUps?: string[]
}

interface AiShoppingAssistantProps {
  products: StorefrontProduct[]
  currency?: string
  onAddToCart: (product: StorefrontProduct) => void
  onQuickView?: (product: StorefrontProduct) => void
  isOpen?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
}

const STARTER_PROMPTS = [
  'What are your most popular recommendations?',
  'Do you have any products under $100?',
  'Show me audio and tech accessories',
  'What would make a great gift?',
]

export default function AiShoppingAssistant({
  products,
  currency = '$',
  onAddToCart,
  onQuickView,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpenChange,
}: AiShoppingAssistantProps) {
  const [isAiChatOpen, setIsAiChatOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [addedProductId, setAddedProductId] = useState<string | null>(null)

  // Sync with controlled prop if provided
  const isChatOpen = controlledIsOpen !== undefined ? controlledIsOpen : isAiChatOpen

  const setChatOpen = (open: boolean) => {
    setIsAiChatOpen(open)
    if (onOpenChange) onOpenChange(open)
    if (!open && controlledOnClose) controlledOnClose()
  }

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I'm your **Flow AI Shopping Concierge**. Ask me anything about our products, store availability, specs, or ask for personalized recommendations based on your budget!`,
      timestamp: new Date(),
      suggestedFollowUps: STARTER_PROMPTS,
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isChatOpen, messages])

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Build conversation history payload
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/ai/shopping-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            category: p.category,
            stock_quantity: p.stock_quantity ?? p.stock ?? 0,
            image_url: p.image_url,
            badge: p.badge,
            tenant_name: p.tenant_name,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from shopping assistant')
      }

      const data = await response.json()

      // Map recommended IDs to full product objects
      const recommendedProducts: StorefrontProduct[] = []
      if (Array.isArray(data.recommendedProductIds)) {
        data.recommendedProductIds.forEach((id: string) => {
          const match = products.find((p) => p.id === id)
          if (match) recommendedProducts.push(match)
        })
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'Here is what I found for you in our catalog.',
        timestamp: new Date(),
        recommendedProducts: recommendedProducts.length > 0 ? recommendedProducts : undefined,
        suggestedFollowUps: data.suggestedFollowUps || [],
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      console.warn('AI Assistant error:', err)
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `I'm currently unable to connect to the store assistant. Feel free to browse our full catalog above or try asking again in a moment!`,
        timestamp: new Date(),
        suggestedFollowUps: ['Show all products', 'What are the bestsellers?'],
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCartQuickAction = (product: StorefrontProduct) => {
    onAddToCart(product)
    setAddedProductId(product.id)
    setTimeout(() => {
      setAddedProductId(null)
    }, 2000)
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `Chat history cleared! How can I help you discover the perfect item today?`,
        timestamp: new Date(),
        suggestedFollowUps: STARTER_PROMPTS,
      },
    ])
  }

  // Format markdown helper (bold text and line breaks)
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n')
    return (
      <div className="space-y-1.5">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1.5" />
          
          // Replace **text** with bold spans
          const parts = line.split(/(\*\*.*?\*\*)/g)
          return (
            <p key={idx} className="text-xs leading-relaxed">
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-bold text-white">
                      {part.slice(2, -2)}
                    </strong>
                  )
                }
                if (part.startsWith('• ')) {
                  return (
                    <span key={pIdx} className="inline-block pl-1 text-neutral-200">
                      • {part.slice(2)}
                    </span>
                  )
                }
                return <span key={pIdx}>{part}</span>
              })}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* ===================== FLOATING TRIGGER BUTTON ===================== */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isChatOpen && (
          <button
            id="ai-shopping-assistant-toggle"
            onClick={() => setChatOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-full shadow-2xl shadow-emerald-950/60 border border-emerald-400/30 hover:scale-105 active:scale-95 transition-all duration-300"
            title="Open AI Shopping Concierge"
          >
            {/* Animated Pulsing Ring */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400"></span>
            </span>

            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>

            <div className="text-left">
              <div className="text-xs font-extrabold tracking-wide flex items-center gap-1.5">
                <span>Ask AI Assistant</span>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* ===================== AI CHAT DRAWER & BACKDROP ===================== */}
      {isChatOpen && (
        <>
          {/* Backdrop Overlay with z-50 and click-to-close */}
          <div
            id="ai-assistant-backdrop"
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity animate-fadeIn"
            aria-label="Close AI Assistant Overlay"
          />

          {/* AI Chat Drawer / Popup Window on top */}
          <div
            id="ai-assistant-drawer"
            className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[440px] max-h-[92vh] h-[85vh] sm:h-[650px] bg-neutral-900 border border-neutral-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden animate-scaleIn backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Flow AI Concierge</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/90 text-emerald-400 border border-emerald-800">
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Grounded in {products.length} catalog products
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={handleClearChat}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition"
                  title="Reset conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  id="close-ai-assistant"
                  onClick={() => setChatOpen(false)}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition"
                  title="Close AI Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-neutral-900/50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user'

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-br-xs shadow-md shadow-emerald-950/40'
                        : 'bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-bl-xs shadow-md'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Flow Assistant</span>
                      </div>
                    )}

                    {renderFormattedText(msg.content)}
                  </div>

                  {/* Recommended Products with Direct "Add to Cart" Actions */}
                  {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                    <div className="w-full space-y-2.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 px-1">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <ShoppingBag className="w-3 h-3" />
                          Recommended Products ({msg.recommendedProducts.length})
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">1-Click Cart</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {msg.recommendedProducts.map((product) => {
                          const stock = product.stock_quantity ?? product.stock ?? 0
                          const isOutOfStock = stock <= 0
                          const isJustAdded = addedProductId === product.id

                          return (
                            <div
                              key={product.id}
                              className="bg-neutral-950 border border-neutral-800 hover:border-emerald-800/80 rounded-2xl p-3 flex items-center justify-between gap-3 transition group shadow-sm"
                            >
                              {/* Thumbnail Image */}
                              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                                {product.image_url ? (
                                  <Image
                                    src={product.image_url}
                                    alt={product.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                    <ShoppingBag className="w-5 h-5" />
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
                                    {product.category || 'Store'}
                                  </span>
                                  {stock <= 5 && stock > 0 && (
                                    <span className="text-[9px] text-amber-400 font-bold">
                                      • Only {stock} left
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition">
                                  {product.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-extrabold text-white">
                                    {currency}{Number(product.price).toFixed(2)}
                                  </span>
                                  {onQuickView && (
                                    <button
                                      onClick={() => onQuickView(product)}
                                      className="text-[10px] text-neutral-400 hover:text-neutral-200 underline"
                                    >
                                      Details
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Direct Add to Cart Action */}
                              <button
                                id={`ai-add-cart-${product.id}`}
                                onClick={() => handleAddToCartQuickAction(product)}
                                disabled={isOutOfStock}
                                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                                  isJustAdded
                                    ? 'bg-emerald-600 text-white'
                                    : isOutOfStock
                                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                    : 'bg-emerald-950 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-800 hover:border-emerald-500'
                                }`}
                                title={isOutOfStock ? 'Out of stock' : 'Add directly to your shopping cart'}
                              >
                                {isJustAdded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Added!</span>
                                  </>
                                ) : isOutOfStock ? (
                                  <span>Sold Out</span>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Quick Chips */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 w-full">
                      {msg.suggestedFollowUps.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(suggestion)}
                          disabled={isLoading}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-emerald-300 border border-neutral-800 hover:border-emerald-700 transition flex items-center gap-1 text-left"
                        >
                          <span>{suggestion}</span>
                          <ChevronRight className="w-3 h-3 text-neutral-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start space-x-2">
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl rounded-bl-xs p-3.5 text-xs text-neutral-300 flex items-center space-x-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-neutral-400 font-medium pl-1">
                    Checking live inventory...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-neutral-950 border-t border-neutral-800">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center space-x-2"
            >
              <input
                ref={inputRef}
                id="ai-shopping-input"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about products, prices, or recommendations..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              />
              <button
                id="ai-shopping-send"
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white rounded-xl transition shadow-md shadow-emerald-950"
                title="Send inquiry"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
        </>
      )}
    </>
  )
}
