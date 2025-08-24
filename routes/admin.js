import express from 'express';
import multer from 'multer';
import { query } from '../lib/db.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.is_admin) {
    req.session.flash = { type:'error', msg:'Area riservata.' };
    return res.redirect('/login');
  }
  next();
}

const supa = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function uploadToSupabase(file) {
  if (!supa || !file) return '';
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
  const ext = file.originalname.split('.').pop();
  const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g,'')}`;
  const { data, error } = await supa.storage.from(bucket).upload(filename, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });
  if (error) { console.error(error); return ''; }
  const { data: pub } = supa.storage.from(bucket).getPublicUrl(data.path);
  return pub.publicUrl;
}

router.get('/', requireAdmin, async (req, res) => {
  const stats = {
    products: (await query('select count(*) c from products')).rows[0].c,
    categories: (await query('select count(*) c from categories')).rows[0].c,
    orders: (await query('select count(*) c from orders')).rows[0].c
  };
  res.render('admin/dashboard', { title:'Dashboard', stats });
});

// Categories
router.get('/categories', requireAdmin, async (req, res) => {
  const cats = (await query('select * from categories order by name')).rows;
  res.render('admin/categories', { title:'Categorie', cats });
});

router.post('/categories', requireAdmin, async (req, res) => {
  const { name, slug, description } = req.body;
  try {
    await query('insert into categories(name,slug,description) values($1,$2,$3)', [name, slug, description || '']);
    req.session.flash = { type:'success', msg:'Categoria creata.' };
  } catch (e) { req.session.flash = { type:'error', msg:'Errore: slug duplicato?' }; }
  res.redirect('/admin/categories');
});

router.post('/categories/:id', requireAdmin, async (req, res) => {
  const { name, slug, description } = req.body;
  try {
    await query('update categories set name=$1, slug=$2, description=$3 where id=$4', [name, slug, description || '', req.params.id]);
    req.session.flash = { type:'success', msg:'Categoria aggiornata.' };
  } catch (e) { req.session.flash = { type:'error', msg:'Errore aggiornamento.' }; }
  res.redirect('/admin/categories');
});

router.post('/categories/:id/delete', requireAdmin, async (req, res) => {
  await query('delete from categories where id=$1', [req.params.id]);
  req.session.flash = { type:'success', msg:'Categoria eliminata.' };
  res.redirect('/admin/categories');
});

// Products
router.get('/products', requireAdmin, async (req, res) => {
  const prods = (await query(`select p.*, c.name as category_name
                              from products p left join categories c on p.category_id=c.id
                              order by p.created_at desc`)).rows;
  const cats = (await query('select * from categories order by name')).rows;
  res.render('admin/products', { title:'Prodotti', prods, cats });
});

router.post('/products', requireAdmin, upload.single('image'), async (req, res) => {
  const { category_id, title, slug, description, price_cents, video_url, is_active } = req.body;
  let image = '';
  if (req.file) image = await uploadToSupabase(req.file);
  try {
    await query(`insert into products(category_id,title,slug,description,price_cents,image,video_url,is_active)
                 values($1,$2,$3,$4,$5,$6,$7,$8)`,
                 [category_id || null, title, slug, description || '', parseInt(price_cents || 0), image, video_url || '', is_active ? true : false]);
    req.session.flash = { type:'success', msg:'Prodotto creato.' };
  } catch (e) { console.error(e); req.session.flash = { type:'error', msg:'Errore: slug duplicato?' }; }
  res.redirect('/admin/products');
});

router.post('/products/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const { category_id, title, slug, description, price_cents, video_url, is_active } = req.body;
  const r = await query('select * from products where id=$1', [req.params.id]);
  if (!r.rowCount) { req.session.flash = { type:'error', msg:'Prodotto non trovato.' }; return res.redirect('/admin/products'); }
  let image = r.rows[0].image;
  if (req.file) image = await uploadToSupabase(req.file);
  try {
    await query(`update products set category_id=$1, title=$2, slug=$3, description=$4, price_cents=$5, image=$6, video_url=$7, is_active=$8 where id=$9`,
                [category_id || null, title, slug, description || '', parseInt(price_cents || 0), image, video_url || '', is_active ? true : false, req.params.id]);
    req.session.flash = { type:'success', msg:'Prodotto aggiornato.' };
  } catch (e) { console.error(e); req.session.flash = { type:'error', msg:'Errore aggiornamento.' }; }
  res.redirect('/admin/products');
});

router.post('/products/:id/delete', requireAdmin, async (req, res) => {
  await query('delete from products where id=$1', [req.params.id]);
  req.session.flash = { type:'success', msg:'Prodotto eliminato.' };
  res.redirect('/admin/products');
});

// Orders
router.get('/orders', requireAdmin, async (req, res) => {
  const orders = (await query('select * from orders order by created_at desc')).rows;
  res.render('admin/orders', { title:'Ordini', orders });
});

export default router;
