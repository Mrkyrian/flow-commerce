'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getSupabaseConfigError } from '@/utils/supabase/env'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const configError = getSupabaseConfigError()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
        setLoading(false)
      } else {
        setMessage('Success! Redirecting...')
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to reach Supabase.')
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Check your email for the confirmation link!')
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to reach Supabase.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
        <h1 className="text-2xl font-bold mb-6 text-center text-emerald-400">Flow Commerce Auth</h1>
        
        {configError && (
          <div className="mb-4 p-3 bg-amber-900/40 text-sm text-amber-200 rounded border border-amber-700/60">
            <strong className="block font-semibold">Supabase is not configured</strong>
            {configError}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-gray-700 text-sm text-center rounded border border-gray-600">
            {message}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700 focus:outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || configError !== null}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-semibold transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading || configError !== null}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded font-semibold transition duration-200 text-gray-300 disabled:opacity-50"
          >
            Create Account (Sign Up)
          </button>
        </form>
      </div>
    </div>
  )
            }
