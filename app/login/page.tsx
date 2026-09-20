'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setIsError(false)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setIsError(true)
        setMessage(error.message)
        setLoading(false)
      } else {
        setMessage('Signed in successfully! Launching workspace...')
        if (typeof window !== 'undefined') {
          localStorage.setItem('flow_user_email', email.trim())
        }
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setIsError(true)
      setMessage(err?.message || 'Authentication error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-neutral-950">
      
      {/* Top Bar */}
      <header className="border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <Link
          href="/"
          className="flex items-center space-x-2.5 text-neutral-400 hover:text-white transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center group-hover:border-neutral-700 transition">
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-semibold">Back to Storefront</span>
        </Link>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-neutral-400 hidden sm:inline">New merchant?</span>
          <Link
            href="/signup"
            className="px-3.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-800 rounded-xl text-xs font-semibold transition"
          >
            Create Store
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          
          <div className="relative z-10 text-center mb-6 space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-950/80 border border-emerald-800/80 rounded-full text-emerald-400 text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Merchant Workspace Access</span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Sign In to Your Store
            </h1>
            <p className="text-xs text-neutral-400">
              Enter your credentials to access your merchant catalog and order management portal.
            </p>
          </div>

          {message && (
            <div
              className={`mb-5 p-3.5 rounded-2xl text-xs flex items-center space-x-2.5 border ${
                isError
                  ? 'bg-red-950/80 text-red-200 border-red-800'
                  : 'bg-emerald-950/80 text-emerald-200 border-emerald-800'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold mb-1.5 text-neutral-300">
                Business Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
                  placeholder="merchant@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold mb-1.5 text-neutral-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 rounded-xl font-bold text-xs text-white transition shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
            <p className="text-xs text-neutral-400">
              Need to create a new store?{' '}
              <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-semibold underline">
                Register & Onboard
              </Link>
            </p>
          </div>

        </div>
      </main>

      <footer className="border-t border-neutral-800/80 px-4 py-4 text-center text-xs text-neutral-500">
        Flow Commerce Multi-Tenant Merchant Engine © {new Date().getFullYear()}
      </footer>

    </div>
  )
}
