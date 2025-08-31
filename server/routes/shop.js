// server/routes/shop.js
import express from 'express'
import { supabaseAuth, supabaseAdmin } from '../supabase.js'

const router = express.Router()

/* ================== UTILS ================== */
function getBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || ''
  const parts = String(h).trim().split(/\s+/)
  return parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : (parts[0] || '')
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
    console.error('[GET /products] error:', e)
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
    console.error('[GET /categories] error:', e)
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
    console.error('[GET /pages/:slug] error:', e)
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
    console.error('[GET /discounts/:code] error:', e)
    res.status(500).json({ error: e.message })
  }
})

/* ================== I MIEI ORDINI (utente loggato) ==================
   Restituisce SOLO gli ordini dell’utente autenticato (via Bearer).  */
router.get('/my-orders', async (req, res) => {
  try {
    const accessToken = getBearer(req)
    if (!accessToken) return res.status(401).json({ error: 'Unauthorized' })

    // ⚠️ Usa il client "anon" per auth.getUser(token)
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(accessToken)
    if (userErr) {
      console.error('[GET /my-orders] auth.getUser error:', userErr)
      return res.status(401).json({ error: 'Invalid token' })
    }
    const userId = userData?.user?.id
    if (!userId) return res.status(401).json({ error: 'Invalid token' })

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
        courier,
        tracking_code,
        order_items ( product_id, title, quantity, price_cents, image_url )
      `)
      .eq('user_id', userId)
      .order('id', { ascending: false })

    if (error) throw error

    const safe = (data || []).map(o => ({
      id: o.id,
      created_at: o.created_at,
      status: o.status,
      total_cents: o.total_cents,
      customer_name: o.customer_name,
      customer_email: o.customer_email,
      customer_phone: o.customer_phone || null,
      shipping_address: o.shipping_address,
      courier: o.courier || null,
      tracking_code: o.tracking_code || null,
      items: (o.order_items || []).map(i => ({
        product_id: i.product_id,
        title: i.title,
        quantity: i.quantity,
        price_cents: i.price_cents,
        image_url: i.image_url || null,
      })),
    }))

    res.json(safe)
  } catch (e) {
    console.error('[GET /my-orders] error:', e)
    res.status(500).json({ error: e.message })
  }
})

/* ================== ORDER RECAP BY STRIPE SESSION ================== */
router.get('/orders/by-session/:sid', async (req, res) => {
  try {
    const sid = req.params.sid
    if (!sid) return res.status(400).json({ error: 'missing session id' })

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        customer_email,
        customer_name,
        customer_phone,
        shipping_address,
        status,
        total_cents,
        discount_code_id,
        courier,
        tracking_code,
        created_at,
        order_items ( product_id, title, quantity, price_cents, image_url )
      `)
      .eq('stripe_session_id', sid)
      .maybeSingle()

    if (error) throw error
    if (!order) return res.status(404).json({ error: 'not found' })

    const safe = {
      id: order.id,
      created_at: order.created_at,
      status: order.status,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone || null,
      shipping_address: order.shipping_address,
      total_cents: order.total_cents,
      discount_code_id: order.discount_code_id || null,
      courier: order.courier || null,
      tracking_code: order.tracking_code || null,
      items: (order.order_items || []).map(i => ({
        product_id: i.product_id,
        title: i.title,
        quantity: i.quantity,
        price_cents: i.price_cents,
        image_url: i.image_url || null,
      })),
    }

    res.json(safe)
  } catch (e) {
    console.error('[GET /orders/by-session/:sid] error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
