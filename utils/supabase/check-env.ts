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

export function getSafeSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isConfigured = isValidSupabaseUrl(rawUrl) && typeof rawKey === 'string' && rawKey.trim().length > 0

  const url = isValidSupabaseUrl(rawUrl) ? rawUrl!.trim() : 'https://placeholder.supabase.co'
  const anonKey = rawKey && typeof rawKey === 'string' && rawKey.trim().length > 0 ? rawKey.trim() : 'placeholder-anon-key'

  return {
    url,
    anonKey,
    isConfigured,
  }
}
