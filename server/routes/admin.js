// server/routes/admin.js
import express from 'express'
import nodemailer from 'nodemailer'
import { supabaseAdmin } from '../supabase.js'
import { requireAdmin } from '../utils/auth.js'

const router = express.Router()
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET || 'uploads'

// ----------------------- MAILER -----------------------
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true', // true per 465, false per 587
  auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
})

// mittente di default
const DEFAULT_FROM = process.env.SMTP_FROM || 'ordini@djshoprigenerato.eu'

// tracking URL
function buildTrackingUrl(carrier, code) {
  if (!carrier || !code) return null
  const c = String(carrier).toLowerCase()
  if (c === 'gls') return `https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni/?match=${encodeURIComponent(code)}&type=NAT`
  if (c === 'sda') return `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${encodeURIComponent(code)}`
  return null
}

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
// elenco (con campi utili + righe articoli per export)
router.get('/orders', async (_req, res) => {
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
      shipping_tracking,
      order_items ( title, quantity, price_cents )
    `)
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// dettaglio (tutti i campi + righe)
router.get('/orders/:id', async (req, res) => {
  const id = req.params.id
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items ( id, title, quantity, price_cents, image_url )
    `)
    .eq('id', id)
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  res.json(order || {})
})

// aggiorna corriere + tracking e invia email al cliente
router.put('/orders/:id/shipment', async (req, res) => {
  try {
    const id = Number(req.params.id)
    let { carrier, tracking } = req.body || {}
    if (!carrier || !tracking) {
      return res.status(400).json({ error: 'carrier e tracking sono obbligatori' })
    }
    carrier = String(carrier).toLowerCase()
    if (!['gls','sda'].includes(carrier)) {
      return res.status(400).json({ error: 'carrier non valido: usa gls o sda' })
    }

    const url = buildTrackingUrl(carrier, tracking)

    // aggiorna ordine
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('orders')
      .update({
        shipping_carrier: carrier,
        tracking_code: tracking,
        shipping_tracking_url: url,
        status: 'shipped'
      })
      .eq('id', id)
      .select('id, customer_email, customer_name, shipping_carrier, tracking_code, shipping_tracking_url, created_at')
      .single()
    if (updErr) throw updErr

    // invia email (best-effort)
    try {
      if (updated?.customer_email) {
        const html = `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
            <h2>Il tuo ordine #${updated.id} è stato spedito</h2>
            <p>Ciao ${updated.customer_name || ''},</p>
            <p>ti informiamo che il tuo ordine #${updated.id} del ${new Date(updated.created_at).toLocaleString()} è stato affidato al corriere <strong>${updated.shipping_carrier?.toUpperCase()}</strong>.</p>
            <p>Codice di tracking: <strong>${updated.tracking_code}</strong></p>
            ${updated.shipping_tracking_url ? `<p>Puoi seguire la spedizione da qui: <a href="${updated.shipping_tracking_url}">${updated.shipping_tracking_url}</a></p>` : ''}
            <hr/>
            <p>Grazie per aver scelto DJ Shop Rigenerato!</p>
          </div>
        `
        await mailer.sendMail({
          from: DEFAULT_FROM,
          to: updated.customer_email,
          subject: `Il tuo ordine #${updated.id} è stato spedito`,
          html
        })
      }
    } catch (mailErr) {
      console.warn('Mailer error:', mailErr?.message || mailErr)
      // non blocchiamo la risposta admin se l'email fallisce
    }

    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
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
