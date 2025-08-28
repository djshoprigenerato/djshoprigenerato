import express from 'express'
import { supabaseAdmin } from '../supabase.js'
import { requireAuth } from '../utils/auth.js'

const router = express.Router()

function withPriceEUR(p){ return { ...p, price_eur: (p.price_cents ?? 0)/100 } }

router.get('/categories', async (_req,res)=>{
  const { data, error } = await supabaseAdmin.from('categories').select('*').order('id')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.get('/products', async (req,res)=>{
  const { category_id, q } = req.query
  let query = supabaseAdmin.from('products').select('*, product_images(url)').eq('is_active', true).order('id', { ascending: false })
  if (category_id) query = query.eq('category_id', category_id)
  if (q) query = query.ilike('title', `%${q}%`)
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json((data||[]).map(withPriceEUR))
})

router.get('/products/:id', async (req,res)=>{
  const id = req.params.id
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, product_images(*)')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return res.status(404).json({ error: 'Prodotto non trovato' })
  res.json(withPriceEUR(data))
})

router.get('/discounts/:code', async (req,res)=>{
  const code = (req.params.code || '').trim()
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('discount_codes')
    .select('*')
    .eq('code', code)
    .eq('active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Invalid code' })
  res.json({ ...data, amount_off_eur: data.amount_off_cents ? data.amount_off_cents/100 : null })
})

router.get('/my-orders', requireAuth, async (req,res)=>{
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, created_at, status, total_cents')
    .eq('user_id', req.user.id)
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json((data||[]).map(o => ({ ...o, total_eur: (o.total_cents||0)/100 })))
})

export default router
