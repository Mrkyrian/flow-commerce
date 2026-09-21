export const FALLBACK_SUPABASE_URL = 'https://behlvqwpufjmsalfsqnk.supabase.co'
export const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlaGx2cXdwdWZqbXNhbGZzcW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMwODk3NzQzNjEwMjEwNTM1MDM2OH0.ovhYIVQhrP3a7N2CUG_d0DX3DpnkD4W4bvB-bj5rUXA'

export function isValidSupabaseUrl(urlString?: string | null): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false
  }
  const trimmed = urlString.trim().replace(/^["']|["']$/g, '')
  if (!trimmed || trimmed === 'placeholder' || trimmed === 'undefined') {
    return false
  }
  try {
    const parsed = new URL(trimmed)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname)
  } catch {
    return false
  }
}

export function extractSupabaseUrlFromKey(key?: string | null): string | null {
  if (!key || typeof key !== 'string') return null
  try {
    const parts = key.split('.')
    if (parts.length >= 2) {
      const decoded = typeof atob !== 'undefined'
        ? atob(parts[1])
        : Buffer.from(parts[1], 'base64').toString('utf8')
      const payload = JSON.parse(decoded)
      if (payload && typeof payload.ref === 'string' && payload.ref.length > 0) {
        return `https://${payload.ref.trim()}.supabase.co`
      }
    }
  } catch {
    // ignore
  }
  return null
}

export function getSafeSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const anonKey = rawKey && typeof rawKey === 'string' && rawKey.trim().length > 0 && rawKey !== 'placeholder-anon-key' && rawKey !== 'YOUR_ACTUAL_ANON_KEY_HERE'
    ? rawKey.trim().replace(/^["']|["']$/g, '')
    : FALLBACK_SUPABASE_ANON_KEY

  const derivedUrl = extractSupabaseUrlFromKey(anonKey)
  const isDirectUrlValid = isValidSupabaseUrl(rawUrl)
  
  const url = derivedUrl || (isDirectUrlValid ? rawUrl!.trim().replace(/^["']|["']$/g, '') : FALLBACK_SUPABASE_URL)

  const isConfigured = Boolean(url && anonKey)

  return {
    url,
    anonKey,
    isConfigured,
  }
}
