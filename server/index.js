// server/index.js
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

import adminRoutes from './routes/admin.js'
import shopRoutes from './routes/shop.js'
import stripeRoutes from './routes/stripe.js'
import sitemapRouter from './routes/sitemap.js' // ⬅️ AGGIUNTO

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.disable('x-powered-by')

// Se stai dietro proxy (Render/Heroku/etc.)
app.set('trust proxy', 1)

// --- CORS (configurabile via env, default permissivo) ---
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || '*' // es. "https://www.djshoprigenerato.eu"
app.use(
  cors({
    origin: ALLOW_ORIGIN,
    credentials: false,
  })
)

// --- Endpoint keep-alive ultra-leggero (no-cache, 204) ---
// Usa un token in query per evitare abusi: aggiungi KEEPALIVE_TOKEN all'env su Render.
// Esempio di chiamata: /_keepalive?t=<TOKEN>&ts=<timestamp>
app.get('/_keepalive', (req, res) => {
  const required = process.env.KEEPALIVE_TOKEN
  const provided = req.query.t
  if (required && provided !== required) {
    return res.status(401).type('text/plain').send('unauthorized')
  }
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  // log opzionale:
  // console.log(`[KEEPALIVE] ${new Date().toISOString()}`)
  return res.status(200).type('text/plain').send('ok')
})

// --- Stripe routes (devono stare PRIMA del JSON parser) ---
// All'interno di stripeRoutes il webhook usa express.raw(...)
app.use('/api', stripeRoutes)

// --- JSON parser per tutte le altre API ---
app.use(express.json())

// --- Rotte API applicative ---
app.use('/api/admin', adminRoutes)
app.use('/api/shop', shopRoutes)

// Healthcheck semplice
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// --- SEO: sitemap.xml (+ robots.txt se attivato nella route) ---
// Monta le route dinamiche PRIMA delle statiche e del catch-all
app.use('/', sitemapRouter) // ⬅️ AGGIUNTO

// --- Static client build ---
const clientBuildPath = path.join(__dirname, '../client/dist')

// Cache forte per assets fingerprintati
app.use(
  '/assets',
  express.static(path.join(clientBuildPath, 'assets'), {
    immutable: true,
    maxAge: '1y',
    index: false,
  })
)

// Altre statiche (es. favicon, logo, ecc.)
app.use(express.static(clientBuildPath, { index: false }))

// --- SPA catch-all: sempre index.html ---
// Imposto no-cache per index.html così il browser prende sempre l’ultima build
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.sendFile(path.join(clientBuildPath, 'index.html'))
})

// --- Error handler API (non interferisce con SPA) ---
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Server avviato su porta ${PORT}`)
})
