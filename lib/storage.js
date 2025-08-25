// lib/storage.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

export async function uploadBufferToStorage(buffer, filename, mimetype) {
  const safe = (filename || 'file').replace(/\s+/g, '-').toLowerCase();
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimetype || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}
