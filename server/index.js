// server/index.js
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

// error handlers globali (evitano crash silenziosi)
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err)
})

import adminRoutes from './routes/admin.js'
import shopRoutes from './routes/shop.js'
import stripeRoutes from './routes/stripe.js'
import healthRoutes from './routes/health.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())

// ⚠️ Stripe webhook richiede raw body: montiamo prima delle altre JSON routes
app.use('/api', stripeRoutes)

// Health/diagnostica (JSON)
app.use('/api', healthRoutes)

// JSON parser per tutto il resto
app.use(express.json())

// API applicative
app.use('/api/admin', adminRoutes)
app.use('/api/shop', shopRoutes)

// Static client
const clientBuildPath = path.join(__dirname, '../client/dist')
app.use(express.static(clientBuildPath))

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Server avviato su porta ${PORT}`)
})
