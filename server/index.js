// server/index.js
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

// Route modules
import adminRoutes from './routes/admin.js'
import shopRoutes from './routes/shop.js'
import stripeRoutes from './routes/stripe.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())

/**
 * Stripe webhook richiede il RAW body e va montato PRIMA del json parser.
 * Dentro stripeRoutes usiamo qualcosa tipo:
 *   router.post('/webhook', express.raw({ type: 'application/json' }), handler)
 */
app.use('/api', stripeRoutes)

// Parser JSON per tutte le altre API
app.use(express.json())

// API applicative
app.use('/api/admin', adminRoutes)
app.use('/api/shop', shopRoutes)

// Serviamo il build Vite
const clientBuildPath = path.join(__dirname, '../client/dist')
app.use(express.static(clientBuildPath))

// Catch-all per la SPA (React Router)
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Server avviato su porta ${PORT}`)
})
