export function isValidSupabaseUrl(urlString?: string | null): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false
  }
  const trimmed = urlString.trim()
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

  const derivedUrl = extractSupabaseUrlFromKey(rawKey)
  const isDirectUrlValid = isValidSupabaseUrl(rawUrl)
  
  const url = isDirectUrlValid
    ? rawUrl!.trim()
    : derivedUrl || 'https://placeholder.supabase.co'

  const anonKey = rawKey && typeof rawKey === 'string' && rawKey.trim().length > 0
    ? rawKey.trim()
    : 'placeholder-anon-key'

  const isConfigured = (isDirectUrlValid || Boolean(derivedUrl)) && anonKey !== 'placeholder-anon-key'

  return {
    url,
    anonKey,
    isConfigured,
  }
}

