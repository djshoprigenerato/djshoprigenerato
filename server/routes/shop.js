// server/routes/shop.js
import express from 'express'
import { supabaseAuth } from '../supabase.js'

const router = express.Router()

// ---- PRODOTTI PUBBLICI ----
router.get('/products', async (req, res) => {
  try {
    const { q, category_id } = req.query
    let query = supabaseAuth
      .from('products')
      .select('id, title, description, price_cents, is_active, category_id, product_images (id, url)')
      .eq('is_active', true)
      .order('id', { ascending: false })

    if (q) query = query.ilike('title', `%${q}%`)
    if (category_id) query = query.eq('category_id', Number(category_id))

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
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** ============ PAGINE PUBBLICHE (Termini) ============ **/
router.get('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const { data, error } = await supabaseAuth
      .from('pages')
      .select('slug, title, content_html, updated_at')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw error
    res.json(data || { slug, title: 'Termini e Condizioni', content_html: '<p>Contenuto non ancora impostato.</p>' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** ============ SCONTI PUBBLICI ============ **/
router.get('/discounts/:code', async (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase()
    if (!code) return res.status(404).json({ error: 'Codice non valido' })

    const { data, error } = await supabaseAuth
      .from('discounts')
      .select('id, code, percent_off, amount_off_cents, is_active, valid_from, valid_to, min_order_cents')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Codice non trovato o inattivo' })

    const now = new Date()
    if (data.valid_from && new Date(data.valid_from) > now)
      return res.status(404).json({ error: 'Codice non ancora attivo' })
    if (data.valid_to && new Date(data.valid_to) < now)
      return res.status(404).json({ error: 'Codice scaduto' })

    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
