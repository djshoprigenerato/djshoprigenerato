
import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

router.get('/categories', async (req, res) => {
  const { data, error } = await supabase.from('categories').select('*').order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/products', async (req, res) => {
  const { category_id, q } = req.query;
  let query = supabase.from('products').select('*, product_images(url)').eq('is_active', true).order('id', {ascending:false});
  if (category_id) query = query.eq('category_id', category_id);
  if (q) query = query.ilike('title', `%${q}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/products/:id', async (req, res) => {
  const id = req.params.id;
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('id', id)
    .single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

router.get('/discounts/:code', async (req,res) => {
  const code = (req.params.code || '').trim();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('code', code)
    .eq('active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Invalid code' });
  res.json(data);
});

export default router;
