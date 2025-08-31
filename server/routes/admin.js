// server/routes/admin.js
import express from 'express'
import { supabaseAdmin } from '../supabase.js'
import { requireAdmin } from '../utils/auth.js'

const router = express.Router()
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET || 'uploads'

// protezione admin per tutte le rotte qui sotto
router.use(requireAdmin)

/* =========================== CATEGORIES =========================== */
router.get('/categories', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('id')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/categories', async (req, res) => {
  const { name, description } = req.body
  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({ name, description })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/categories/:id', async (req, res) => {
  const id = req.params.id
  const { error } = await supabaseAdmin.from('categories').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

/* ============================ PRODUCTS ============================ */
// elenco
router.get('/products', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, product_images(*)')
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// dettaglio singolo (con immagini)
router.get('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { data, error } = await supabaseAdmin
      .from('products')
      .select(`
        id, title, description, price_cents, stock, is_active, category_id,
        product_images ( id, url, path )
      `)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// crea
router.post('/products', async (req, res) => {
  const { title, description, price_eur, stock, is_active, category_id } = req.body
  const price_cents = Math.round((Number(price_eur) || 0) * 100)
  const payload = {
    title,
    description,
    price_cents,
    stock: Number(stock || 0),
    is_active: !!is_active,
    category_id: category_id || null,
  }
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert(payload)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// aggiungi immagine (DB; upload su storage già fatto lato client)
router.post('/products/:id/images', async (req, res) => {
  const id = req.params.id
  const { url, path } = req.body
  const { data, error } = await supabaseAdmin
    .from('product_images')
    .insert({ product_id: Number(id), url, path })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// modifica + sincronizza immagini
// body: { title, description, price_eur, stock, is_active, category_id, keep_paths: [] }
router.put('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const {
      title = '',
      description = '',
      price_eur = 0,
      stock = 0,
      is_active = true,
      category_id = null,
      keep_paths = [],
    } = req.body || {}

    // 1) aggiorna campi base
    const { error: updErr } = await supabaseAdmin
      .from('products')
      .update({
        title,
        description,
        price_cents: Math.round(Number(price_eur || 0) * 100),
        stock: Number(stock || 0),
        is_active: !!is_active,
        category_id: category_id ? Number(category_id) : null,
      })
      .eq('id', id)
    if (updErr) throw updErr

    // 2) sincronizza immagini: elimina quelle non presenti in keep_paths
    const { data: imgs, error: listErr } = await supabaseAdmin
      .from('product_images')
      .select('id, path')
      .eq('product_id', id)
    if (listErr) throw listErr

    const keep = new Set((keep_paths || []).filter(Boolean))
    const toDelete = (imgs || []).filter((im) => !keep.has(im.path))

    if (toDelete.length) {
      const paths = toDelete.map((im) => im.path).filter(Boolean)
      // rimuovi dal bucket (best-effort)
      try {
        await supabaseAdmin.storage.from(UPLOADS_BUCKET).remove(paths)
      } catch (e) {
        console.warn('Storage remove error:', e?.message || e)
      }
      // rimuovi righe DB
      const { error: delErr } = await supabaseAdmin
        .from('product_images')
        .delete()
        .in('path', paths)
      if (delErr) throw delErr
    }

    // 3) restituisci prodotto aggiornato
    const { data: prod, error: fetchErr } = await supabaseAdmin
      .from('products')
      .select(`
        id, title, description, price_cents, stock, is_active, category_id,
        product_images ( id, url, path )
      `)
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    res.json(prod)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// elimina prodotto + immagini (DB + storage)
router.delete('/products/:id', async (req, res) => {
  const id = Number(req.params.id)

  // immagini da cancellare dal bucket
  const { data: imgs } = await supabaseAdmin
    .from('product_images')
    .select('id, path')
    .eq('product_id', id)

  // cancellazione righe immagini
  await supabaseAdmin.from('product_images').delete().eq('product_id', id)

  // cancellazione prodotto
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })

  // rimozione file dal bucket (best-effort)
  if (imgs && imgs.length) {
    const paths = imgs.map((i) => i.path).filter(Boolean)
    try {
      await supabaseAdmin.storage.from(UPLOADS_BUCKET).remove(paths)
    } catch (e) {
      console.warn('Storage remove error:', e?.message || e)
    }
  }
  res.json({ ok: true })
})

/* ============================ DISCOUNTS =========================== */
router.get('/discounts', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('discount_codes')
    .select('*')
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/discounts', async (req, res) => {
  const { code, percent_off, amount_off_cents, active, expires_at } = req.body
  const payload = {
    code,
    percent_off: percent_off ? Number(percent_off) : null,
    amount_off_cents: amount_off_cents ? Number(amount_off_cents) : null,
    active: active !== false,
    expires_at: expires_at || null,
  }
  const { data, error } = await supabaseAdmin
    .from('discount_codes')
    .insert(payload)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put('/discounts/:id', async (req, res) => {
  const id = req.params.id
  const { active } = req.body
  const { data, error } = await supabaseAdmin
    .from('discount_codes')
    .update({ active })
    .eq('id', id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/discounts/:id', async (req, res) => {
  const id = req.params.id
  const { error } = await supabaseAdmin
    .from('discount_codes')
    .delete()
    .eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

/* ============================= ORDERS ============================= */
// elenco (read-only)
router.get('/orders', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, created_at, status, total_cents, customer_name, customer_email')
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// dettaglio
router.get('/orders/:id', async (req, res) => {
  const id = req.params.id
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return res.status(500).json({ error: error.message })
  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('order_id', id)
  res.json({ ...order, order_items: items || [] })
})

/* ============================== PAGES ============================= */
// Termini (GET)
router.get('/pages/terms', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pages')
      .select('slug, title, content_html, updated_at')
      .eq('slug', 'terms')
      .maybeSingle()
    if (error) throw error
    res.json(data || { slug: 'terms', title: 'Termini e Condizioni', content_html: '' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Termini (UPSERT)
router.put('/pages/terms', async (req, res) => {
  try {
    const { title, content_html } = req.body
    const { data, error } = await supabaseAdmin
      .from('pages')
      .upsert(
        { slug: 'terms', title: title || 'Termini e Condizioni', content_html },
        { onConflict: 'slug' }
      )
      .select()
      .maybeSingle()
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
