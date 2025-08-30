// server/routes/shop.js
import express from 'express'
import { supabaseAuth } from '../supabase.js'

const router = express.Router()

// ---- PRODOTTI PUBBLICI ----
router.get('/products', async (req, res) => {
  try {
    const { q, category_id, id } = req.query
    let query = supabaseAuth
      .from('products')
      .select(`
        id,
        title,
        description,
        price_cents,
        is_active,
        category_id,
        product_images (id, url)
      `)
      .eq('is_active', true)
      .order('id', { ascending: false })

    if (q) query = query.ilike('title', `%${q}%`)
    if (category_id) query = query.eq('category_id', Number(category_id))
    if (id) query = query.eq('id', Number(id))

    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ---- CATEGORIE PUBBLICHE ----
router.get('/categories', async (_req, res) => {
  try {
    const { data, error } = await supabaseAuth
      .from('categories')
      .select('id, name, description')
      .order('name', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ---- PAGINE PUBBLICHE ----
router.get('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const { data, error } = await supabaseAuth
      .from('pages')
      .select('slug, title, content_html, updated_at')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw error
    res.json(
      data || {
        slug,
        title: 'Termini e Condizioni',
        content_html: '<p>Contenuto non ancora impostato.</p>',
      }
    )
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ---- CODICI SCONTO PUBBLICI ----
router.get('/discounts/:code', async (req, res) => {
  const code = (req.params.code || '').trim()
  try {
    const { data, error } = await supabaseAuth
      .from('discount_codes')
      .select('id, code, percent_off, amount_off_cents, active')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Codice sconto non trovato o non attivo' })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router

// in fondo al tuo server/routes/shop.js
router.get('/orders/by-session', async (req, res) => {
  try {
    const { session_id } = req.query
    if (!session_id) return res.status(400).json({ error: 'session_id mancante' })

    const { data: order, error } = await supabaseAuth
      .from('orders')
      .select(`
        id, created_at, total_cents, status, customer_name, customer_email,
        order_items ( product_id, title, quantity, price_cents, image_url )
      `)
      .eq('stripe_session_id', session_id)
      .maybeSingle()

    if (error) throw error
    res.json(order) // può essere null se webhook non ha ancora scritto
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
