// server/routes/shop.js
import express from 'express'
import { supabaseAuth, supabaseAdmin } from '../supabase.js'

const router = express.Router()

/* ================== UTILS ================== */
function getBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || ''
  // formati accettati: "Bearer <token>" oppure solo "<token>"
  const parts = String(h).trim().split(/\s+/)
  return parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : (parts[0] || '')
}

function buildTrackingUrl(carrier, code) {
  if (!carrier || !code) return null
  const c = String(carrier).toLowerCase()
  if (c === 'gls') {
    return `https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni/?match=${encodeURIComponent(code)}&type=NAT`
  }
  if (c === 'sda') {
    return `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${encodeURIComponent(code)}`
  }
  return null
}

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

/* ================== I MIEI ORDINI (utente loggato) ==================
   Restituisce solo gli ordini dell’utente autenticato (via Bearer token). */
router.get('/my-orders', async (req, res) => {
  try {
    const accessToken = getBearer(req)
    if (!accessToken) return res.status(401).json({ error: 'Unauthorized' })

    // Recupero dell'utente dal token
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr) throw userErr
    const userId = userData?.user?.id
    if (!userId) return res.status(401).json({ error: 'Invalid token' })

    // Query ordini per user_id
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        created_at,
        status,
        total_cents,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        shipping_carrier,
        tracking_code,
        shipping_tracking_url,
        order_items ( product_id, title, quantity, price_cents, image_url )
      `)
      .eq('user_id', userId)
      .order('id', { ascending: false })

    if (error) throw error

    const safe = (data || []).map(o => {
      const url = o.shipping_tracking_url || buildTrackingUrl(o.shipping_carrier, o.tracking_code)
      return {
        id: o.id,
        created_at: o.created_at,
        status: o.status,
        total_cents: o.total_cents,
        customer_name: o.customer_name,
        customer_email: o.customer_email,
        customer_phone: o.customer_phone || null,
        shipping_address: o.shipping_address, // jsonb (city, line1, line2, country, postal_code, state)
        shipping_carrier: o.shipping_carrier || null,
        tracking_code: o.tracking_code || null,
        shipping_tracking_url: url,
        items: (o.order_items || []).map(i => ({
          product_id: i.product_id,
          title: i.title,
          quantity: i.quantity,
          price_cents: i.price_cents,
          image_url: i.image_url || null
        }))
      }
    })

    res.json(safe)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ============ ORDINE DETTAGLIO (per cliente loggato) ==============
   Verifica il token, controlla che l’ordine appartenga all’utente e restituisce i dettagli. */
router.get('/orders/:id', async (req, res) => {
  try {
    const accessToken = getBearer(req)
    if (!accessToken) return res.status(401).json({ error: 'Unauthorized' })

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr) throw userErr
    const userId = userData?.user?.id
    if (!userId) return res.status(401).json({ error: 'Invalid token' })

    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'id mancante' })

    // carica l'ordine e verifica appartenenza
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        created_at,
        status,
        total_cents,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        shipping_carrier,
        tracking_code,
        shipping_tracking_url,
        order_items ( product_id, title, quantity, price_cents, image_url )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!order) return res.status(404).json({ error: 'not found' })
    if (order.user_id && order.user_id !== userId) {
      // l'ordine esiste ma non appartiene all'utente
      return res.status(403).json({ error: 'forbidden' })
    }

    const url = order.shipping_tracking_url || buildTrackingUrl(order.shipping_carrier, order.tracking_code)

    return res.json({
      id: order.id,
      created_at: order.created_at,
      status: order.status,
      total_cents: order.total_cents,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone || null,
      shipping_address: order.shipping_address,
      shipping_carrier: order.shipping_carrier || null,
      tracking_code: order.tracking_code || null,
      shipping_tracking_url: url,
      items: (order.order_items || []).map(i => ({
        product_id: i.product_id,
        title: i.title,
        quantity: i.quantity,
        price_cents: i.price_cents,
        image_url: i.image_url || null
      }))
    })
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
        customer_phone,
        shipping_address,
        shipping_carrier,
        tracking_code,
        shipping_tracking_url,
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

    const url = order.shipping_tracking_url || buildTrackingUrl(order.shipping_carrier, order.tracking_code)

    const safe = {
      id: order.id,
      created_at: order.created_at,
      status: order.status,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone || null,
      shipping_address: order.shipping_address,
      shipping_carrier: order.shipping_carrier || null,
      tracking_code: order.tracking_code || null,
      shipping_tracking_url: url,
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
