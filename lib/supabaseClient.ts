import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  FALLBACK_SUPABASE_URL,
  FALLBACK_SUPABASE_ANON_KEY,
  getSafeSupabaseConfig,
} from '@/utils/supabase/check-env'

export { FALLBACK_SUPABASE_URL, FALLBACK_SUPABASE_ANON_KEY }

const { url: safeUrl, anonKey: safeAnonKey } = getSafeSupabaseConfig()

export function createClient(
  url = safeUrl,
  anonKey = safeAnonKey
) {
  return createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

export const supabase = createClient(safeUrl, safeAnonKey)

export default supabase

