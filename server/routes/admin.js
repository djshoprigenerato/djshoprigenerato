
import express from 'express';
import { supabase } from '../supabase.js';
import { requireAdmin } from '../utils/auth.js';
import { deleteImagesForProduct } from '../utils/deleteProductImages.js';

const router = express.Router();

router.use(requireAdmin);

// Categories CRUD
router.get('/categories', async (req,res) => {
  const { data, error } = await supabase.from('categories').select('*').order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/categories', async (req,res) => {
  const { name, description } = req.body;
  const { data, error } = await supabase.from('categories').insert([{ name, description }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.put('/categories/:id', async (req,res) => {
  const id = req.params.id;
  const { name, description } = req.body;
  const { data, error } = await supabase.from('categories').update({ name, description }).eq('id', id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/categories/:id', async (req,res) => {
  const id = req.params.id;
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// Products CRUD
router.get('/products', async (req,res) => {
  const { data, error } = await supabase.from('products').select('*, product_images(*)').order('id', {ascending:false});
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/products', async (req,res) => {
  const { title, description, price_cents, stock, is_active, category_id } = req.body;
  const { data, error } = await supabase.from('products').insert([{
    title, description, price_cents, stock, is_active, category_id
  }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.put('/products/:id', async (req,res) => {
  const id = req.params.id;
  const { title, description, price_cents, stock, is_active, category_id } = req.body;
  const { data, error } = await supabase.from('products').update({
    title, description, price_cents, stock, is_active, category_id
  }).eq('id', id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/products/:id', async (req,res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await deleteImagesForProduct(id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Product image register (client uploads directly to storage; this registers the file)
router.post('/products/:id/images', async (req,res) => {
  const product_id = parseInt(req.params.id, 10);
  const { path, url } = req.body;
  const { data, error } = await supabase.from('product_images').insert([{ product_id, path, url }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/images/:imageId', async (req,res) => {
  const imageId = parseInt(req.params.imageId, 10);
  const bucket = process.env.UPLOADS_BUCKET || 'uploads';
  const { data: img, error: e1 } = await supabase.from('product_images').select('*').eq('id', imageId).single();
  if (e1) return res.status(400).json({ error: e1.message });
  await supabase.storage.from(bucket).remove([img.path]);
  await supabase.from('product_images').delete().eq('id', imageId);
  res.json({ ok: true });
});

// Discounts CRUD
router.get('/discounts', async (req,res) => {
  const { data, error } = await supabase.from('discount_codes').select('*').order('id', {ascending:false});
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/discounts', async (req,res) => {
  const { code, percent_off, amount_off_cents, active, expires_at } = req.body;
  const { data, error } = await supabase.from('discount_codes').insert([{ code, percent_off, amount_off_cents, active, expires_at }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.put('/discounts/:id', async (req,res) => {
  const id = req.params.id;
  const patch = req.body || {};
  const { data, error } = await supabase.from('discount_codes').update(patch).eq('id', id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/discounts/:id', async (req,res) => {
  const id = req.params.id;
  const { error } = await supabase.from('discount_codes').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// Orders list
router.get('/orders', async (req,res) => {
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('id', {ascending:false});
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/orders/:id', async (req,res) => {
  const id = req.params.id;
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

export default router;
