import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

// Importa le route aggiornate
import adminRoutes from './routes/admin.js'
import shopRoutes from './routes/shop.js'
import stripeRoutes from './routes/stripe.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Middleware base
app.use(cors())
app.use(express.json()) // per JSON body

// Routes API
app.use('/api/admin', adminRoutes)
app.use('/api/shop', shopRoutes)
app.use('/api', stripeRoutes) // webhook Stripe incluso

// Serve il frontend buildato (React)
const clientBuildPath = path.join(__dirname, '../client/dist')
app.use(express.static(clientBuildPath))

// Catch-all → React Router gestisce le route
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'))
})

// Avvio server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Server avviato su porta ${PORT}`)
})
