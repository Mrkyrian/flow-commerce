import { createBrowserClient } from '@supabase/ssr'
import { getSafeSupabaseConfig } from './check-env'

export function createClient() {
  const { url, anonKey } = getSafeSupabaseConfig()
  return createBrowserClient(
    url,
    anonKey
  )
}


