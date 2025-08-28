import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) console.warn('Missing SUPABASE_URL')
if (!SUPABASE_ANON_KEY) console.warn('Missing SUPABASE_ANON_KEY')
if (!SUPABASE_SERVICE_ROLE_KEY) console.warn('Missing SUPABASE_SERVICE_ROLE_KEY')

export const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
})

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})
