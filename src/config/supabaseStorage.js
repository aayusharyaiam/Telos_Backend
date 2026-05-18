import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const enableSupabase = process.env.ENABLE_SUPABASE_STORAGE === 'true'

let supabase = null

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  console.log('✅ Supabase Storage client initialized')
} else {
  console.log('⚠️ Supabase Storage not configured - will use local uploads fallback')
}

export const isSupabaseEnabled = () => enableSupabase && supabase !== null

export const getSupabaseClient = () => supabase

export default supabase