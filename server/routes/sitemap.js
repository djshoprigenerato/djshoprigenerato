// server/routes/sitemap.js
import express from "express"

const router = express.Router()

// ===== Utils =====
const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

const slugify = (str = "") =>
  str
    .toString()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

// Cache in memoria (10 min)
const CACHE_TTL_MS = 10 * 60 * 1000
let cacheXml = null
let cacheTime = 0

// Fetch helper con timeout e base dinamica
const getJson = async (base, path) => {
  try {
    const url = new URL(path, base).toString()
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 8000) // 8s timeout
    const r = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "djshop-sitemap/1.0" },
      signal: ac.signal
    })
    clearTimeout(t)
    if (!r.ok) return []
    return await r.json()
  } catch {
    return []
  }
}

// /sitemap.xml
router.get("/sitemap.xml", async (req, res) => {
  try {
    // Se cache fresca, servila
    const now = Date.now()
    if (cacheXml && now - cacheTime < CACHE_TTL_MS) {
      res.set("Content-Type", "application/xml")
      res.set("Cache-Control", "public, max-age=600")
      return res.send(cacheXml)
    }

    // Base URL dal contesto della richiesta (evita problemi DNS/SSL/loop)
    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim()
    const host = req.headers["x-forwarded-host"] || req.headers.host
    const BASE = `${proto}://${host}`

    const abs = (p = "/") => new URL(p, BASE).toString()

    // URL statici
    const urls = [
      { loc: abs("/"), changefreq: "daily", priority: "1.0" },
      { loc: abs("/prodotti"), changefreq: "daily", priority: "0.9" },
      { loc: abs("/chi-siamo"), changefreq: "monthly", priority: "0.5" },
      { loc: abs("/contatti"), changefreq: "monthly", priority: "0.5" }
    ]

    // Dati da API interne (no auth)
    const cats = await getJson(BASE, "/api/shop/categories")
    const prods = await getJson(BASE, "/api/shop/products?limit=2000")

    // Categorie
    ;(cats || []).forEach((c) => {
      const slug = c.slug || slugify(c.name || c.id)
      urls.push({
        loc: abs(`/categoria/${slug}`),
        changefreq: "weekly",
        priority: "0.8",
        lastmod: c.updated_at || c.created_at
      })
    })

    // Prodotti (con immagini)
    const productXml = (p) => {
      const pSlug = p.slug || slugify(p.name || p.id)
      const loc = abs(`/prodotto/${pSlug}`)
      const lastmod = p.updated_at || p.created_at
      const images = []
      const norm = (u) => {
        if (!u) return null
        try { return new URL(u, BASE).toString() } catch { return null }
      }
      if (p.coverUrl) { const n = norm(p.coverUrl); if (n) images.push(n) }
      if (Array.isArray(p.images)) p.images.forEach((u) => { const n = norm(u); if (n) images.push(n) })

      return [
        `<url>`,
        `<loc>${esc(loc)}</loc>`,
        lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ``,
        `<changefreq>weekly</changefreq>`,
        `<priority>0.7</priority>`,
        ...images.map((src) => [
          `<image:image>`,
          `<image:loc>${esc(src)}</image:loc>`,
          p.name ? `<image:title>${esc(p.name)}</image:title>` : ``,
          `</image:image>`
        ].join("")),
        `</url>`
      ].join("")
    }

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
      `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
      ...urls.map((u) => [
        `<url>`,
        `<loc>${esc(u.loc)}</loc>`,
        u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ``,
        u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ``,
        u.priority ? `<priority>${u.priority}</priority>` : ``,
        `</url>`
      ].join("")),
      ...(prods || []).map(productXml),
      `</urlset>`
    ].join("\n")

    cacheXml = xml
    cacheTime = now

    res.set("Content-Type", "application/xml")
    res.set("Cache-Control", "public, max-age=600")
    return res.send(xml)
  } catch {
    // Fallback minimal sempre valido
    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim()
    const host = req.headers["x-forwarded-host"] || req.headers.host
    const BASE = `${proto}://${host}`
    const abs = (p = "/") => new URL(p, BASE).toString()

    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${esc(abs("/"))}</loc></url>
</urlset>`
    res.set("Content-Type", "application/xml")
    return res.status(200).send(fallback)
  }
})

// (Opzionale) robots.txt dinamico
router.get("/robots.txt", (req, res) => {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim()
  const host = req.headers["x-forwarded-host"] || req.headers.host
  const BASE = `${proto}://${host}`
  const abs = (p = "/") => new URL(p, BASE).toString()

  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    `Sitemap: ${abs("/sitemap.xml")}`
  ].join("\n")
  res.set("Content-Type", "text/plain").send(body)
})

export default router
