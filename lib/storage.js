// lib/storage.js
import { createClient } from '@supabase/supabase-js';
import { addWatermark } from './watermark.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

const isImage = (mime) => /^image\//i.test(mime || '');

function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const base = u.pathname.split('/').pop() || 'image';
    return base.split('?')[0];
  } catch { return 'image'; }
}

export async function uploadBufferToStorage(buffer, filename, mimetype) {
  // applichiamo watermark se è un’immagine
  const watermarked = isImage(mimetype) ? await addWatermark(buffer) : buffer;

  const safe = (filename || 'file').replace(/\s+/g, '-').toLowerCase();
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, watermarked, {
    contentType: mimetype || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFromUrlToStorage(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Impossibile scaricare ${url}: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const ct = res.headers.get('content-type') || 'image/jpeg';
  const name = filenameFromUrl(url);
  return uploadBufferToStorage(buf, name, ct);
}
