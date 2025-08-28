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

// Webhook Stripe (usa raw body dentro stripeRoutes)
app.use('/api', stripeRoutes)

// Parser JSON per le altre API
app.use(express.json())

// API
app.use('/api/admin', adminRoutes)
app.use('/api/shop', shopRoutes)

// Static client (React build)
const clientBuildPath = path.join(__dirname, '../client/dist')
app.use(express.static(clientBuildPath))

// Catch-all → React Router
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Server avviato su porta ${PORT}`)
})
