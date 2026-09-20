import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isValidSupabaseUrl, getSafeSupabaseConfig } from './check-env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const { isConfigured, url, anonKey } = getSafeSupabaseConfig()

  if (!isConfigured || !isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      url,
      anonKey,
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

    await supabase.auth.getUser()
  } catch {
    // Silently fall through if credentials are not yet initialized or network error occurs
  }

  return supabaseResponse
}


