import { createClient } from '@supabase/supabase-js'
import { getSafeSupabaseConfig } from '@/utils/supabase/check-env'

const { url, anonKey } = getSafeSupabaseConfig()

export const supabase = createClient(url, anonKey)

export { createClient }
export default supabase

