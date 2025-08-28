import express from 'express'
import { supabaseAdmin } from '../supabase.js'
import { getUserFromAuthHeader } from '../utils/auth.js'

const router = express.Router()

// 🛒 Prodotti con immagini
router.get('/products', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, product_images(*)')
    .eq('is_active', true)
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// 🛒 Singolo prodotto
router.get('/products/:id', async (req, res) => {
  const id = req.params.id
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, product_images(*)')
    .eq('id', id)
    .single()
  if (error) return res.status(404).json({ error: 'Prodotto non trovato' })
  res.json(data)
})

// 📂 Categorie
router.get('/categories', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('id')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// 💳 Ordini utente loggato
router.get('/my-orders', async (req, res) => {
  const user = await getUserFromAuthHeader(req)
  if (!user) return res.status(401).json({ error: 'Non autorizzato' })

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', user.id)
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
