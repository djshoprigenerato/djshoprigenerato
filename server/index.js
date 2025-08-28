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

// Stripe webhook (RAW body) inside stripeRoutes
app.use('/api', stripeRoutes)

// JSON parser for the rest
app.use(express.json())

// APIs
app.use('/api/admin', adminRoutes)
app.use('/api/shop', shopRoutes)

// Static client
const clientBuildPath = path.join(__dirname, '../client/dist')
app.use('/assets', express.static(path.join(clientBuildPath, 'assets'), { maxAge: '1y', immutable: true }))
app.use(express.static(clientBuildPath))

// SPA catch-all
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Server avviato su porta ${PORT}`)
})
