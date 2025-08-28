// server/index.js
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

import adminRoutes from './routes/admin.js'
import shopRoutes from './routes/shop.js'
import stripeRoutes from './routes/stripe.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.disable('x-powered-by')
app.use(cors())

/**
 * 1) Webhook Stripe (usa RAW body) – montato PRIMA di qualsiasi json parser.
 *    Dentro stripeRoutes deve esserci:
 *      router.post('/webhook', express.raw({ type: 'application/json' }), handler)
 */
app.use('/api', stripeRoutes)

/** 2) Parser JSON per tutte le altre API */
app.use(express.json())

/** 3) API applicative */
app.use('/api/admin', adminRoutes)
app.use('/api/shop', shopRoutes)

/** 4) Static per la SPA (Vite build) */
const clientBuildPath = path.join(__dirname, '../client/dist')

// a) Monta esplicitamente /assets (css/js/img con cache lunga)
app.use(
  '/assets',
  express.static(path.join(clientBuildPath, 'assets'), {
    maxAge: '1y',
    immutable: true
  })
)

// b) Static root per index.html e altri file a root della build
app.use(express.static(clientBuildPath))

/** 5) Catch-all: tutte le altre GET tornano l'index della SPA */
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'))
})

/** 6) Avvio server */
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Server avviato su porta ${PORT}`)
})
