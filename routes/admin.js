import express from 'express';
import multer from 'multer';
import slugify from 'slugify';
import { query } from '../lib/db.js';
import { uploadImage, deleteImage } from '../lib/storage.js';
import { orderPdf } from '../lib/pdf.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function requireAdmin(req,res,next){
  if(req.session?.admin) return next();
  return res.redirect('/admin/login');
}

router.get('/admin/login',(req,res)=> res.render('admin/login'));
router.post('/admin/login',(req,res)=>{
  const { email, password } = req.body;
  if(email===process.env.ADMIN_USER && password===process.env.ADMIN_PASSWORD){
    req.session.admin = { email };
    return res.redirect('/admin');
  }
  res.redirect('/admin/login');
});
router.post('/admin/logout',(req,res)=>{ req.session.admin=null; res.redirect('/'); });

router.get('/admin', requireAdmin, async (req,res)=>{
  const oc = await query('SELECT COUNT(*) FROM orders');
  res.render('admin/dashboard', { count_orders: oc.rows[0].count });
});

// Categories
router.get('/admin/categories', requireAdmin, async (req,res)=>{
  const cats = await query('SELECT * FROM categories ORDER BY created_at DESC');
  res.render('admin/categories_index', { cats: cats.rows });
});
router.get('/admin/categories/new', requireAdmin, (req,res)=> res.render('admin/category_form',{cat:null}));
router.post('/admin/categories/new', requireAdmin, async (req,res)=>{
  const name = req.body.name.trim(); const slug = slugify(name,{lower:true,strict:true});
  await query('INSERT INTO categories(name,slug) VALUES($1,$2)',[name,slug]);
  res.redirect('/admin/categories');
});
router.get('/admin/categories/:id/edit', requireAdmin, async (req,res)=>{
  const c = await query('SELECT * FROM categories WHERE id=$1',[req.params.id]);
  if(!c.rowCount) return res.redirect('/admin/categories');
  res.render('admin/category_form', { cat: c.rows[0] });
});
router.post('/admin/categories/:id/edit', requireAdmin, async (req,res)=>{
  const name = req.body.name.trim(); const slug = slugify(name,{lower:true,strict:true});
  await query('UPDATE categories SET name=$1, slug=$2 WHERE id=$3',[name,slug,req.params.id]);
  res.redirect('/admin/categories');
});
router.post('/admin/categories/:id/delete', requireAdmin, async (req,res)=>{
  await query('DELETE FROM categories WHERE id=$1',[req.params.id]);
  res.redirect('/admin/categories');
});

// Products
router.get('/admin/products', requireAdmin, async (req,res)=>{
  const prods = await query('SELECT p.*, c.name AS category FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.created_at DESC');
  res.render('admin/products_index', { prods: prods.rows });
});
router.get('/admin/products/new', requireAdmin, async (req,res)=>{
  const cats = await query('SELECT * FROM categories ORDER BY name');
  res.render('admin/product_form', { p:null, cats: cats.rows });
});
router.post('/admin/products/new', requireAdmin, upload.array('images', 10), async (req,res)=>{
  const { title, category_id, price, description, published } = req.body;
  const slug = slugify(title,{lower:true,strict:true}); const price_cents = Math.round(parseFloat(price||'0')*100);
  const imgs = [];
  for(const f of (req.files||[])){ imgs.push(await uploadImage(f.buffer, f.originalname, 'products')); }
  await query('INSERT INTO products(title,slug,category_id,price_cents,description,images,published) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [title, slug, category_id||null, price_cents, description||'', JSON.stringify(imgs), !!published]);
  res.redirect('/admin/products');
});
router.get('/admin/products/:id/edit', requireAdmin, async (req,res)=>{
  const p = await query('SELECT * FROM products WHERE id=$1',[req.params.id]);
  if(!p.rowCount) return res.redirect('/admin/products');
  const cats = await query('SELECT * FROM categories ORDER BY name');
  res.render('admin/product_form', { p: p.rows[0], cats: cats.rows });
});
router.post('/admin/products/:id/edit', requireAdmin, upload.array('images',10), async (req,res)=>{
  const { title, category_id, price, description, published, remove_keys } = req.body;
  const r = await query('SELECT * FROM products WHERE id=$1',[req.params.id]);
  if(!r.rowCount) return res.redirect('/admin/products');
  let imgs = Array.isArray(r.rows[0].images) ? r.rows[0].images : [];
  const toRemove = (Array.isArray(remove_keys)?remove_keys:[remove_keys]).filter(Boolean);
  if(toRemove.length){ imgs = imgs.filter(im=> !toRemove.includes(im.key)); for(const k of toRemove){ await deleteImage(k); } }
  for(const f of (req.files||[])){ imgs.push(await uploadImage(f.buffer, f.originalname, 'products')); }
  const slug = slugify(title,{lower:true,strict:true}); const price_cents = Math.round(parseFloat(price||'0')*100);
  await query('UPDATE products SET title=$1, slug=$2, category_id=$3, price_cents=$4, description=$5, images=$6, published=$7 WHERE id=$8',
    [title, slug, category_id||null, price_cents, description||'', JSON.stringify(imgs), !!published, req.params.id]);
  res.redirect('/admin/products');
});
router.post('/admin/products/:id/delete', requireAdmin, async (req,res)=>{
  const p = await query('SELECT images FROM products WHERE id=$1',[req.params.id]);
  if(p.rowCount){ for(const im of (p.rows[0].images||[])){ await deleteImage(im.key); } }
  await query('DELETE FROM products WHERE id=$1',[req.params.id]);
  res.redirect('/admin/products');
});

// Discounts
router.get('/admin/discounts', requireAdmin, async (req,res)=>{
  const d = await query('SELECT * FROM discounts ORDER BY created_at DESC');
  res.render('admin/discounts_index', { discounts: d.rows });
});
router.get('/admin/discounts/new', requireAdmin, (req,res)=> res.render('admin/discount_form',{d:null}));
router.post('/admin/discounts/new', requireAdmin, async (req,res)=>{
  const { code, type, value, min_total_cents, max_uses, expires_at } = req.body;
  await query('INSERT INTO discounts(code,type,value,min_total_cents,max_uses,expires_at) VALUES($1,$2,$3,$4,$5,$6)',
    [code.trim().toUpperCase(), type, Math.round(Number(value)), Math.round(Number(min_total_cents||0)), max_uses||null, expires_at||null]);
  res.redirect('/admin/discounts');
});
router.get('/admin/discounts/:id/edit', requireAdmin, async (req,res)=>{
  const d = await query('SELECT * FROM discounts WHERE id=$1',[req.params.id]);
  if(!d.rowCount) return res.redirect('/admin/discounts');
  res.render('admin/discount_form', { d: d.rows[0] });
});
router.post('/admin/discounts/:id/edit', requireAdmin, async (req,res)=>{
  const { code, type, value, min_total_cents, max_uses, expires_at } = req.body;
  await query('UPDATE discounts SET code=$1,type=$2,value=$3,min_total_cents=$4,max_uses=$5,expires_at=$6 WHERE id=$7',
    [code.trim().toUpperCase(), type, Math.round(Number(value)), Math.round(Number(min_total_cents||0)), max_uses||null, expires_at||null, req.params.id]);
  res.redirect('/admin/discounts');
});
router.post('/admin/discounts/:id/delete', requireAdmin, async (req,res)=>{
  await query('DELETE FROM discounts WHERE id=$1',[req.params.id]);
  res.redirect('/admin/discounts');
});

// Orders
router.get('/admin/orders', requireAdmin, async (req,res)=>{
  const o = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
  res.render('admin/orders_index', { orders: o.rows });
});
router.get('/admin/orders/:id', requireAdmin, async (req,res)=>{
  const o = await query('SELECT * FROM orders WHERE id=$1',[req.params.id]);
  if(!o.rowCount) return res.redirect('/admin/orders');
  res.render('admin/orders_show', { order: o.rows[0] });
});
router.post('/admin/orders/:id/update', requireAdmin, async (req,res)=>{
  const { courier, tracking, status } = req.body;
  await query('UPDATE orders SET courier=$1, tracking=$2, status=$3 WHERE id=$4',[courier||null, tracking||null, status||'paid', req.params.id]);
  res.redirect(`/admin/orders/${req.params.id}`);
});
router.get('/admin/orders/:id/pdf', requireAdmin, async (req,res)=>{
  const o = await query('SELECT * FROM orders WHERE id=$1',[req.params.id]);
  if(!o.rowCount) return res.redirect('/admin/orders');
  const doc = orderPdf(o.rows[0]);
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="ordine-${o.rows[0].order_no}.pdf"`);
  doc.pipe(res);
});

export default router;
