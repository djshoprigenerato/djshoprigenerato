// server/routes/shop.js
import express from 'express'
import { supabaseAuth, supabaseAdmin } from '../supabase.js'

const router = express.Router()

/* ================== PRODOTTI PUBBLICI ================== */
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

/* ================== CATEGORIE PUBBLICHE ================== */
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

/* ================== PAGINE PUBBLICHE ================== */
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

/* ================== CODICI SCONTO PUBBLICI ================== */
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

/* ================== ORDER RECAP BY STRIPE SESSION ==================
   Usato dalla SuccessPage per mostrare il riepilogo e triggerare lo
   svuotamento del carrello solo quando l’ordine esiste davvero.     */
router.get('/orders/by-session/:sid', async (req, res) => {
  try {
    const sid = req.params.sid
    if (!sid) return res.status(400).json({ error: 'missing session id' })

    // NB: usiamo supabaseAdmin per bypassare RLS sui dettagli ordine.
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        customer_email,
        customer_name,
        shipping_address,
        status,
        total_cents,
        discount_code_id,
        created_at,
        order_items ( product_id, title, quantity, price_cents, image_url )
      `)
      .eq('stripe_session_id', sid)
      .maybeSingle()

    if (error) throw error
    if (!order) return res.status(404).json({ error: 'not found' })

    // Risposta “safe” per il client
    const safe = {
      id: order.id,
      created_at: order.created_at,
      status: order.status,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      shipping_address: order.shipping_address,
      total_cents: order.total_cents,
      discount_code_id: order.discount_code_id || null,
      items: (order.order_items || []).map(i => ({
        product_id: i.product_id,
        title: i.title,
        quantity: i.quantity,
        price_cents: i.price_cents,
        image_url: i.image_url || null
      }))
    }

    res.json(safe)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
