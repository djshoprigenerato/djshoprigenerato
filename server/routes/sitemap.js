// server/routes/sitemap.js
import express from "express"

const router = express.Router()

// ===== Config =====
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://www.djshoprigenerato.eu"

// ===== Utils =====
const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

const abs = (path = "") => {
  if (!path) return PUBLIC_BASE_URL + "/"
  if (/^https?:\/\//i.test(path)) return path
  return `${PUBLIC_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

const slugify = (str = "") =>
  str
    .toString()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

// ===== Cache in memoria =====
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minuti
let cacheXml = null
let cacheTime = 0

// ===== Fetch helper (senza axios) =====
const getJson = async (url) => {
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } })
    if (!r.ok) return []
    return await r.json()
  } catch {
    return []
  }
}

// ===== /sitemap.xml =====
router.get("/sitemap.xml", async (_req, res) => {
  try {
    // Cache
    const now = Date.now()
    if (cacheXml && now - cacheTime < CACHE_TTL_MS) {
      res.set("Content-Type", "application/xml")
      res.set("Cache-Control", "public, max-age=600")
      return res.send(cacheXml)
    }

    // URL statici
    const urls = [
      { loc: abs("/"), changefreq: "daily", priority: "1.0" },
      { loc: abs("/prodotti"), changefreq: "daily", priority: "0.9" },
      { loc: abs("/chi-siamo"), changefreq: "monthly", priority: "0.5" },
      { loc: abs("/contatti"), changefreq: "monthly", priority: "0.5" }
    ]

    // API pubbliche (adatta se i tuoi endpoint differiscono)
    const cats = await getJson(abs("/api/shop/categories"))
    const prods = await getJson(abs("/api/shop/products?limit=2000"))

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

    // Prodotti con immagini
    const productXml = (p) => {
      const pSlug = p.slug || slugify(p.name || p.id)
      const loc = abs(`/prodotto/${pSlug}`)
      const lastmod = p.updated_at || p.created_at
      const images = []
      if (p.coverUrl) images.push(abs(p.coverUrl))
      if (Array.isArray(p.images)) p.images.forEach((u) => u && images.push(abs(u)))

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
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${esc(abs("/"))}</loc></url>
</urlset>`
    res.set("Content-Type", "application/xml")
    return res.status(200).send(fallback)
  }
})

// (Opzionale) robots.txt dinamico
router.get("/robots.txt", (_req, res) => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    `Sitemap: ${abs("/sitemap.xml")}`
  ].join("\n")
  res.set("Content-Type", "text/plain").send(body)
})

export default router
