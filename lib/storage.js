import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

function svgText(text, size=40, opacity=0.25){
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${size+20}">
  <style>.wm{font:${size}px Inter, Arial, sans-serif;fill:white;opacity:${opacity};}</style>
  <text x="0" y="${size}" class="wm">${text}</text>
</svg>`);
}

export async function watermarked(inputBuffer){
  const mode = (process.env.WATERMARK_MODE || 'text').toLowerCase();
  const image = sharp(inputBuffer).rotate();

  if(mode === 'image' && process.env.WATERMARK_IMAGE_URL){
    const resp = await fetch(process.env.WATERMARK_IMAGE_URL);
    const wmBuf = Buffer.from(await resp.arrayBuffer());
    const meta = await image.metadata();
    const targetW = Math.max(120, Math.round((meta.width || 1200) * 0.25));
    const wm = await sharp(wmBuf).resize({ width: targetW }).png().toBuffer();
    return image
      .resize({ width: 1600, withoutEnlargement: true })
      .composite([{ input: wm, gravity: 'southeast', blend: 'over' }])
      .jpeg({ quality: 88 }).toBuffer();
  } else {
    const text = process.env.WATERMARK_TEXT || 'DJSHOPRIGENERATO';
    const svg = svgText(text);
    return image
      .resize({ width: 1600, withoutEnlargement: true })
      .composite([{ input: svg, gravity: 'southeast' }])
      .jpeg({ quality: 88 }).toBuffer();
  }
}

export async function uploadImage(buffer, filename, folder='products'){
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const processed = await watermarked(buffer);
  const { error } = await supabase.storage.from(bucket).upload(key, processed, {
    contentType: 'image/jpeg', upsert: false
  });
  if(error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return { key, url: data.publicUrl };
}

export async function deleteImage(key){
  if(!key) return;
  await supabase.storage.from(bucket).remove([key]);
}
