import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey     = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
}
if (!anonKey) {
  console.warn('Missing SUPABASE_ANON_KEY env var (used for auth token verification).');
}

// ✅ Client ADMIN per DB/Storage (bypassa RLS)
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ✅ Client AUTH (anon) per verificare i token utente (getUser(jwt))
export const supabaseAuth = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
