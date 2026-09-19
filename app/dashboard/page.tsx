import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect("/login")
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const metrics = [
    { label: "Customers", value: "0", hint: "Unified customer directory" },
    { label: "Active orders", value: "0", hint: "Centralized order stream" },
    { label: "Catalog items", value: "0", hint: "Products & services engine" },
  ]

  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">Flow Commerce Engine</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Logged in as: <span className="text-zinc-200">{user.email}</span>
            </p>
          </div>
          <div className="w-full rounded border border-zinc-800 bg-zinc-950 px-4 py-3 text-left md:w-auto md:text-right">
            <span className="rounded-full border border-emerald-700/50 bg-emerald-900/60 px-2.5 py-1 text-xs font-semibold uppercase text-emerald-300">
              Multi-tenant mode
            </span>
            <p className="mt-2 text-lg font-bold text-white">Workspace overview</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-sm"
            >
              <h3 className="text-sm font-medium text-zinc-400">{metric.label}</h3>
              <p className="mt-2 text-3xl font-bold text-emerald-400">{metric.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{metric.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
