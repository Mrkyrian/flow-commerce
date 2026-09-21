import { createBrowserClient } from '@supabase/ssr'
import { getSafeSupabaseConfig } from './check-env'
import { supabase } from '@/lib/supabase'

export function createClient() {
  const { url, anonKey } = getSafeSupabaseConfig()
  return createBrowserClient(
    url,
    anonKey
  )
}

export { supabase }


