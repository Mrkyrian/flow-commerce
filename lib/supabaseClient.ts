import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const FALLBACK_SUPABASE_URL = 'https://behlvqwpufjmsalfsqnk.supabase.co'
export const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlaGx2cXdwdWZqbXNhbGZzcW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMwODk3NzQzNjEwMjEwNTM1MDM2OH0.ovhYIVQhrP3a7N2CUG_d0DX3DpnkD4W4bvB-bj5rUXA'

function cleanUrl(urlString?: string | null): string {
  if (!urlString || typeof urlString !== 'string') return FALLBACK_SUPABASE_URL
  const trimmed = urlString.trim().replace(/^["']|["']$/g, '')
  try {
    const parsed = new URL(trimmed)
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname)) {
      return trimmed
    }
  } catch {
    // If not a valid URL, fall back to exact FALLBACK_SUPABASE_URL
  }
  return FALLBACK_SUPABASE_URL
}

function cleanKey(keyString?: string | null): string {
  if (!keyString || typeof keyString !== 'string') return FALLBACK_SUPABASE_ANON_KEY
  const trimmed = keyString.trim().replace(/^["']|["']$/g, '')
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'YOUR_ACTUAL_ANON_KEY_HERE') {
    return FALLBACK_SUPABASE_ANON_KEY
  }
  return trimmed
}

const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabaseAnonKey = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export function createClient(
  url = supabaseUrl,
  anonKey = supabaseAnonKey
) {
  return createSupabaseClient(cleanUrl(url), cleanKey(anonKey))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
