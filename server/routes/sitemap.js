// server/routes/sitemap.js
import express from "express"
import axios from "axios"

const router = express.Router()

// Utility per escape XML
const esc = (s = "") =>
  String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&apos;")

// Cache in memoria (semplice): rigenera dopo N minuti
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minuti
let cacheXml = null
let cacheTime = 0

// Base URL pubblico del sito (cambia se serve)
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://www.djshoprigenerato.eu"

// Helper per costruire URL assoluti
const abs = (path) => {
  if (!path) return ""
  if (/^https?:\/\//i.test(path)) return path
  return `${PUBLIC_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

// Mappa category/product -> slug fallback
const slugify = (str = "") =>
  str
    .toString()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")   // rimuove accentate
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,80)

router.get("/sitemap.xml", async (req, res) => {
  try {
    // serve da cache?
    const now = Date.now()
    if (cacheXml && now - cacheTime < CACHE_TTL_MS) {
      res.set("Content-Type", "application/xml")
      res.set("Cache-Control", "public, max-age=600") // 10 minuti lato bot
      return res.send(cacheXml)
    }

    // 1) URL statici principali
    const urls = [
      { loc: abs("/"), changefreq: "daily", priority: "1.0" },
      { loc: abs("/prodotti"), changefreq: "daily", priority: "0.9" },
      { loc: abs("/chi-siamo"), changefreq: "monthly", priority: "0.5" },
      { loc: abs("/contatti"), changefreq: "monthly", priority: "0.5" },
    ]

    // 2) Recupero categorie e prodotti dall’API pubblica
    //    (se i tuoi endpoint sono diversi, aggiorna gli URL qui)
    const [cats, prods] = await Promise.all([
      axios.get(abs("/api/shop/categories")).then(r => r.data).catch(() => []),
      // imposta un limite alto per includere tutto; se hai paginazione, ciclare le pagine
      axios.get(abs("/api/shop/products"), { params: { limit: 2000 } })
           .then(r => r.data).catch(() => []),
    ])

    // 3) Categorie -> /categoria/:slug
    ;(cats || []).forEach(c => {
      const slug = c.slug || slugify(c.name || c.id)
      urls.push({
        loc: abs(`/categoria/${slug}`),
        changefreq: "weekly",
        priority: "0.8",
        lastmod: c.updated_at || c.created_at
      })
    })

    // 4) Prodotti -> /prodotto/:slug (con immagini in namespace image)
    //    ipotizziamo campi: slug | id | name | updated_at | coverUrl | images
    const productXml = (p) => {
      const pSlug = p.slug || slugify(p.name || p.id)
      const loc = abs(`/prodotto/${pSlug}`)
      const lastmod = p.updated_at || p.created_at
      const images = []
      if (p.coverUrl) images.push(abs(p.coverUrl))
      if (Array.isArray(p.images)) {
        p.images.forEach(u => u && images.push(abs(u)))
      }
      // blocco <url> con immagini
      return [
        `<url>`,
        `<loc>${esc(loc)}</loc>`,
        lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ``,
        `<changefreq>weekly</changefreq>`,
        `<priority>0.7</priority>`,
        ...images.map(src => [
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
      // static + categorie
      ...urls.map(u => [
        `<url>`,
        `<loc>${esc(u.loc)}</loc>`,
        u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ``,
        u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ``,
        u.priority ? `<priority>${u.priority}</priority>` : ``,
        `</url>`
      ].join("")),
      // prodotti con immagini
      ...(prods || []).map(productXml),
      `</urlset>`
    ].join("\n")

    // salva in cache
    cacheXml = xml
    cacheTime = now

    res.set("Content-Type", "application/xml")
    res.set("Cache-Control", "public, max-age=600")
    return res.send(xml)
  } catch (err) {
    // fallback sicuro
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${esc(abs("/"))}</loc></url>
</urlset>`
    res.set("Content-Type", "application/xml")
    res.status(200).send(fallback)
  }
})

export default router
