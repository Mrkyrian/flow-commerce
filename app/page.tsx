import Link from "next/link"

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <div className="w-full max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Flow Commerce</h1>
        <p className="mb-8 text-zinc-400">
          A multi-tenant e-commerce platform built on Next.js and Supabase.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-500"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 transition hover:bg-zinc-800"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
