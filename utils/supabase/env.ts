/**
 * Reads and validates the public Supabase environment variables.
 *
 * These helpers never throw and never echo the variable values, so they are
 * safe to call during static prerendering, in middleware, and in the browser.
 */

const URL_VAR = 'NEXT_PUBLIC_SUPABASE_URL'
const KEY_VAR = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

const URL_EXAMPLE = 'https://<project-ref>.supabase.co'

export type SupabaseEnv = {
  url: string
  anonKey: string
}

function looksLikeApiKey(value: string) {
  return (
    value.startsWith('sb_publishable_') ||
    value.startsWith('sb_secret_') ||
    value.startsWith('eyJ')
  )
}

function looksLikeUrl(value: string) {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Returns a human-readable description of what is wrong with the Supabase
 * configuration, or `null` when both variables look usable.
 */
export function getSupabaseConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url) {
    return `${URL_VAR} is not set. Set it to your Supabase project URL (${URL_EXAMPLE}).`
  }

  if (!looksLikeUrl(url)) {
    if (looksLikeApiKey(url)) {
      return `${URL_VAR} holds a Supabase API key instead of a project URL. Set it to ${URL_EXAMPLE} and keep the key in ${KEY_VAR}.`
    }
    return `${URL_VAR} is not a valid http(s) URL. It should look like ${URL_EXAMPLE}.`
  }

  if (!anonKey) {
    return `${KEY_VAR} is not set. Copy the anon/publishable key from Supabase → Project Settings → API.`
  }

  if (looksLikeUrl(anonKey)) {
    return `${KEY_VAR} holds a URL instead of an API key. The two Supabase variables look swapped.`
  }

  return null
}

/**
 * Returns the validated Supabase configuration, or throws an error that names
 * the misconfigured variable. Call this only where a client is actually needed.
 */
export function requireSupabaseEnv(): SupabaseEnv {
  const error = getSupabaseConfigError()
  if (error) {
    throw new Error(`Supabase is not configured correctly: ${error}`)
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
  }
}
