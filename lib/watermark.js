// lib/watermark.js — applica watermark con sharp
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const DEFAULTS = {
  enabled: (process.env.WATERMARK_ENABLED ?? 'true').toLowerCase() !== 'false',
  type: (process.env.WATERMARK_TYPE || 'image'), // 'image' | 'text'
  imagePath: process.env.WATERMARK_IMAGE_PATH || path.join(process.cwd(), 'public', 'img', 'watermark.png'),
  text: process.env.WATERMARK_TEXT || 'DJSHOPRIGENERATO',
  position: (process.env.WATERMARK_POSITION || 'southeast'), // southeast|southwest|northeast|northwest|center
  opacity: Number(process.env.WATERMARK_OPACITY || 0.35),
  scale: Number(process.env.WATERMARK_SCALE || 0.18), // % del lato minore
  margin: parseInt(process.env.WATERMARK_MARGIN || '16', 10),
};

function svgText(text, fontSize) {
  const fill = '#FFFFFF';
  const stroke = '#000000';
  const strokeWidth = 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${text.length * fontSize * 0.62}" height="${fontSize*1.6}">
      <style>.t{font:${fontSize}px sans-serif;font-weight:700}</style>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" class="t"
            fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}">${text}</text>
    </svg>`
  );
}

export async function addWatermark(buffer, cfg = {}) {
  const opt = { ...DEFAULTS, ...cfg };
  if (!opt.enabled) return buffer;

  const base = sharp(buffer);
  const meta = await base.metadata();
  if (!meta.width || !meta.height) return buffer;

  const target = Math.max(32, Math.round(Math.min(meta.width, meta.height) * opt.scale));

  let overlayBuf;
  try {
    if (opt.type === 'image') {
      const file = await fs.readFile(opt.imagePath);
      overlayBuf = await sharp(file).resize({ width: target }).png().toBuffer();
    } else {
      overlayBuf = await sharp(svgText(opt.text, Math.round(target * 0.45))).png().toBuffer();
    }
  } catch {
    overlayBuf = await sharp(svgText(opt.text, Math.round(target * 0.45))).png().toBuffer();
  }

  const ovMeta = await sharp(overlayBuf).metadata();
  const w = meta.width, h = meta.height, ow = ovMeta.width || target, oh = ovMeta.height || target;

  const m = opt.margin;
  let left = Math.round((w - ow) / 2);
  let top  = Math.round((h - oh) / 2);
  if (opt.position.includes('north')) top = m;
  if (opt.position.includes('south')) top = h - oh - m;
  if (opt.position.includes('west'))  left = m;
  if (opt.position.includes('east'))  left = w - ow - m;

  return await base
    .composite([{ input: overlayBuf, left, top, blend: 'over', opacity: opt.opacity }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
