// server/routes/shop.js
import express from 'express'
import { supabaseAuth, supabaseAdmin } from '../supabase.js'
import { getUserFromAuthHeader } from '../utils/auth.js' // legge l'utente dal JWT in Authorization

const router = express.Router()

/* =========================
   PRODOTTI PUBBLICI (lista)
   ========================= */
router.get('/products', async (req, res) => {
  try {
    const { q, category_id } = req.query

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

    const { data, error } = await query
    if (error) throw error
    return res.json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

/* ================================
   PRODOTTO SINGOLO (con galleria)
   ================================ */
router.get('/products/:id', async (req, res) => {
  try {
    const pid = Number(req.params.id)
    if (Number.isNaN(pid)) return res.status(400).json({ error: 'ID non valido' })

    const { data, error } = await supabaseAuth
      .from('products')
      .select(`
        id,
        title,
        description,
        price_cents,
        is_active,
        category_id,
        product_images!inner ( id, url )
      `)
      .eq('id', pid)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Prodotto non trovato' })

    // ordina le immagini per id asc (galleria coerente)
    data.product_images = (data.product_images || []).sort((a, b) => a.id - b.id)

    return res.json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

/* =========================
   CATEGORIE PUBBLICHE
   ========================= */
router.get('/categories', async (_req, res) => {
  try {
    const { data, error } = await supabaseAuth
      .from('categories')
      .select('id, name, description')
      .order('name', { ascending: true })

    if (error) throw error
    return res.json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

/* ==========================================
   PAGINE PUBBLICHE (es. termini & condizioni)
   ========================================== */
router.get('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const { data, error } = await supabaseAuth
      .from('pages')
      .select('slug, title, content_html, updated_at')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw error
    return res.json(
      data || {
        slug,
        title: 'Termini e Condizioni',
        content_html: '<p>Contenuto non ancora impostato.</p>',
      }
    )
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

/* ===============================
   CODICI SCONTO PUBBLICI (validate)
   =============================== */
router.get('/discounts/:code', async (req, res) => {
  const code = req.params.code.trim()

  try {
    // valido se: active = true AND (expires_at IS NULL OR expires_at > now)
    const nowIso = new Date().toISOString()
    const { data, error } = await supabaseAuth
      .from('discount_codes')
      .select('id, code, percent_off, amount_off_cents, active, expires_at')
      .ilike('code', code) // case-insensitive
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return res.status(404).json({ error: 'Codice sconto non trovato o non attivo' })
    }

    return res.json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

/* ======================================================
   ORDINI: pagina di successo (per dettagli post-checkout)
   ====================================================== */
router.get('/orders/success', async (req, res) => {
  try {
    const { session_id } = req.query
    if (!session_id) return res.status(400).json({ error: 'session_id mancante' })

    const { data, error } = await supabaseAdmin
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
        stripe_payment_intent,
        stripe_session_id,
        created_at,
        order_items (
          product_id,
          title,
          quantity,
          price_cents,
          image_url
        )
      `)
      .eq('stripe_session_id', session_id)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Ordine non trovato' })

    return res.json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

/* ==================================
   ORDINI: "I miei ordini" (richiede login)
   ================================== */
router.get('/orders/my', async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(req) // legge il JWT dal header Authorization
    if (!user) return res.status(401).json({ error: 'Non autenticato' })

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        created_at,
        status,
        total_cents,
        stripe_payment_intent
      `)
      .eq('user_id', user.id)
      .order('id', { ascending: false })

    if (error) throw error
    return res.json(data || [])
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

export default router
