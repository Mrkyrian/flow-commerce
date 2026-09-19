import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfigError } from './env'

let warned = false

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Without valid Supabase credentials there is no session to refresh. Let the
  // request through rather than failing every route, and warn once in the logs.
  const configError = getSupabaseConfigError()
  if (configError) {
    if (!warned) {
      warned = true
      console.warn(`[supabase] Skipping session refresh: ${configError}`)
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Touching the user refreshes the auth cookies on the response.
  await supabase.auth.getUser()

  return supabaseResponse
}
