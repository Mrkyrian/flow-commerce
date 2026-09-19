import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-red-400">Authentication error</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Something went wrong while confirming your session. Please try signing in again.
        </p>
        <Link
          href="/login"
          className="inline-block rounded bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  )
}
