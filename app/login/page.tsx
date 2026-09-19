"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()

  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfigured) {
      setMessage("Connect Supabase to enable authentication.")
      return
    }
    setLoading(true)
    setMessage("")

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage("Invalid email or password.")
      setLoading(false)
    } else {
      setMessage("Success! Redirecting...")
      router.push("/dashboard")
      router.refresh()
    }
  }

  const handleSignUp = async () => {
    if (!isConfigured) {
      setMessage("Connect Supabase to enable authentication.")
      return
    }
    setLoading(true)
    setMessage("")

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Check your email for the confirmation link!")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-emerald-400">Flow Commerce</h1>

        {message && (
          <div className="mb-4 rounded border border-zinc-700 bg-zinc-800 p-3 text-center text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 focus:border-emerald-500 focus:outline-none"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 focus:border-emerald-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-emerald-600 py-2 font-semibold transition duration-200 hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            className="w-full rounded bg-zinc-800 py-2 font-semibold text-zinc-300 transition duration-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  )
}
