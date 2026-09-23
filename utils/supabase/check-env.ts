export const FALLBACK_SUPABASE_URL = 'https://behlvqwpufjmsaifsqnk.supabase.co'
export const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlaGx2cXdwdWZqbXNhaWZzcW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NzQzNjgsImV4cCI6MjEwNTM1MDM2OH0.ovhYIVQhrP3a7N2CUG_d0DX3DpnkD4W4bvB-bj5rUXA'

export function isValidSupabaseUrl(urlString?: string | null): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false
  }
  const trimmed = urlString.trim().replace(/^["']|["']$/g, '')
  if (!trimmed || trimmed === 'placeholder' || trimmed === 'undefined' || trimmed.startsWith('sb_publishable_')) {
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
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4 !== 0) {
        base64 += '='
      }
      const decoded = typeof atob !== 'undefined'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('utf8')
      const payload = JSON.parse(decoded)
      if (payload && typeof payload.ref === 'string' && payload.ref.length > 0) {
        return `https://${payload.ref.trim()}.supabase.co`
      }
    }
  } catch (err) {
    console.warn('Could not extract Supabase URL from key:', err)
  }
  return null
}

export function getSafeSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const anonKey = rawKey && typeof rawKey === 'string' && rawKey.trim().length > 0 && rawKey !== 'placeholder-anon-key' && rawKey !== 'YOUR_ACTUAL_ANON_KEY_HERE'
    ? rawKey.trim().replace(/^["']|["']$/g, '')
    : FALLBACK_SUPABASE_ANON_KEY

  const derivedUrlFromKey = extractSupabaseUrlFromKey(anonKey)
  const isDirectUrlValid = isValidSupabaseUrl(rawUrl)

  let url = FALLBACK_SUPABASE_URL
  if (isDirectUrlValid) {
    url = rawUrl!.trim().replace(/^["']|["']$/g, '')
  } else if (rawUrl && /^[a-z0-9]{20}$/i.test(rawUrl.trim())) {
    url = `https://${rawUrl.trim()}.supabase.co`
  } else if (derivedUrlFromKey) {
    url = derivedUrlFromKey
  }

  const isConfigured = Boolean(url && anonKey)

  return {
    url,
    anonKey,
    isConfigured,
  }
}
