import express from 'express'
import { supabaseAdmin } from '../supabase.js'
import { requireAdmin } from '../utils/auth.js'

const router = express.Router()
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET || 'uploads'

router.use(requireAdmin)

// Categories
router.get('/categories', async (_req,res)=>{
  const { data, error } = await supabaseAdmin.from('categories').select('*').order('id')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})
router.post('/categories', async (req,res)=>{
  const { name, description } = req.body
  const { data, error } = await supabaseAdmin.from('categories').insert({ name, description }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})
router.delete('/categories/:id', async (req,res)=>{
  const id = req.params.id
  const { error } = await supabaseAdmin.from('categories').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// Products
router.get('/products', async (_req,res)=>{
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, product_images(*)')
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/products', async (req,res)=>{
  const { title, description, price_eur, stock, is_active, category_id } = req.body
  const price_cents = Math.round((Number(price_eur)||0)*100)
  const payload = { title, description, price_cents, stock: Number(stock||0), is_active: !!is_active, category_id: category_id || null }
  const { data, error } = await supabaseAdmin.from('products').insert(payload).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/products/:id/images', async (req,res)=>{
  const id = req.params.id
  const { url, path } = req.body
  const { data, error } = await supabaseAdmin.from('product_images').insert({ product_id: Number(id), url, path }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/products/:id', async (req,res)=>{
  const id = Number(req.params.id)
  // take images to delete from storage
  const { data: imgs } = await supabaseAdmin.from('product_images').select('id, path').eq('product_id', id)
  // delete product (cascade for images in DB if FK with ON DELETE CASCADE not set; do manual)
  await supabaseAdmin.from('product_images').delete().eq('product_id', id)
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })

  // delete files from storage (best-effort)
  if (imgs && imgs.length){
    const paths = imgs.map(i => i.path).filter(Boolean)
    try {
      await supabaseAdmin.storage.from(UPLOADS_BUCKET).remove(paths)
    } catch (e) {
      console.warn('Storage remove error:', e?.message || e)
    }
  }
  res.json({ ok: true })
})

// Discounts
router.get('/discounts', async (_req,res)=>{
  const { data, error } = await supabaseAdmin.from('discount_codes').select('*').order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})
router.post('/discounts', async (req,res)=>{
  const { code, percent_off, amount_off_cents, active, expires_at } = req.body
  const payload = {
    code,
    percent_off: percent_off ? Number(percent_off) : null,
    amount_off_cents: amount_off_cents ? Number(amount_off_cents) : null,
    active: active !== false,
    expires_at: expires_at || null
  }
  const { data, error } = await supabaseAdmin.from('discount_codes').insert(payload).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})
router.put('/discounts/:id', async (req,res)=>{
  const id = req.params.id
  const { active } = req.body
  const { data, error } = await supabaseAdmin.from('discount_codes').update({ active }).eq('id', id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})
router.delete('/discounts/:id', async (req,res)=>{
  const id = req.params.id
  const { error } = await supabaseAdmin.from('discount_codes').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// Orders (read-only)
router.get('/orders', async (_req,res)=>{
  const { data, error } = await supabaseAdmin.from('orders').select('id, created_at, status, total_cents, customer_name, customer_email').order('id', { ascending:false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})
router.get('/orders/:id', async (req,res)=>{
  const id = req.params.id
  const { data: order, error } = await supabaseAdmin.from('orders').select('*').eq('id', id).single()
  if (error) return res.status(500).json({ error: error.message })
  const { data: items } = await supabaseAdmin.from('order_items').select('*').eq('order_id', id)
  res.json({ ...order, order_items: items || [] })
})
/** ============ ADMIN PAGINE (Termini) ============ **/
// Carica Termini
router.get('/pages/terms', requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pages')
      .select('slug, title, content_html, updated_at')
      .eq('slug', 'terms')
      .maybeSingle()
    if (error) throw error
    res.json(data || { slug: 'terms', title: 'Termini e Condizioni', content_html: '' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
// Salva/Upsert Termini
router.put('/pages/terms', requireAdmin, async (req, res) => {
  try {
    const { title, content_html } = req.body
    const { data, error } = await supabaseAdmin
      .from('pages')
      .upsert({ slug: 'terms', title: title || 'Termini e Condizioni', content_html }, { onConflict: 'slug' })
      .select()
      .maybeSingle()
    if (error) throw error
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
