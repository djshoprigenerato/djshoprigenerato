import express from 'express';
import { query } from '../lib/db.js';

const router = express.Router();

router.get('/store', (req,res)=> res.redirect('/'));

function initCart(sess){
  if(!sess.cart) sess.cart = { items:[], subtotal_cents:0, discount_code:null, discount_amount_cents:0, total_cents:0 };
}
function recalc(cart){
  cart.subtotal_cents = cart.items.reduce((s,i)=> s + i.price_cents * i.qty, 0);
  cart.total_cents = Math.max(0, cart.subtotal_cents - (cart.discount_amount_cents||0));
}

router.get('/', async (req,res)=>{
  const cats = (await query('SELECT * FROM categories ORDER BY name')).rows;
  const prods = (await query(`SELECT p.*, c.name AS category
                              FROM products p LEFT JOIN categories c ON c.id=p.category_id
                              WHERE published=true ORDER BY p.created_at DESC LIMIT 12`)).rows;
  res.render('store/home', { cats, prods, cart: req.session.cart||{} });
});

router.get('/c/:slug', async (req,res)=>{
  const cat = await query('SELECT * FROM categories WHERE slug=$1',[req.params.slug]);
  if(!cat.rowCount) return res.status(404).render('store/404');
  const prods = (await query('SELECT * FROM products WHERE category_id=$1 AND published=true ORDER BY created_at DESC',[cat.rows[0].id])).rows;
  res.render('store/category', { cat: cat.rows[0], prods, cart: req.session.cart||{} });
});

router.get('/p/:slug', async (req,res)=>{
  const p = await query('SELECT * FROM products WHERE slug=$1',[req.params.slug]);
  if(!p.rowCount) return res.status(404).render('store/404');
  res.render('store/product', { p: p.rows[0], cart: req.session.cart||{} });
});

router.get('/cart', (req,res)=>{
  initCart(req.session);
  res.render('store/cart', { cart: req.session.cart });
});

router.post('/cart/add', async (req,res)=>{
  initCart(req.session);
  const { product_id, qty=1 } = req.body;
  const r = await query('SELECT id,title,price_cents,images FROM products WHERE id=$1',[product_id]);
  if(!r.rowCount) return res.redirect('back');
  const p = r.rows[0];
  const existing = req.session.cart.items.find(i=> i.product_id===p.id);
  if(existing) existing.qty += Number(qty);
  else req.session.cart.items.push({ product_id:p.id, title:p.title, price_cents:p.price_cents, qty:Number(qty), image_url:(p.images||[])[0]?.url || null });
  recalc(req.session.cart);
  res.redirect('/cart');
});

router.post('/cart/apply-coupon', async (req,res)=>{
  initCart(req.session);
  const code = (req.body.code||'').trim().toUpperCase();
  if(!code){ req.session.cart.discount_code=null; req.session.cart.discount_amount_cents=0; recalc(req.session.cart); return res.redirect('/cart'); }
  const d = await query('SELECT * FROM discounts WHERE code=$1',[code]);
  if(!d.rowCount){ req.session.cart.discount_code=null; req.session.cart.discount_amount_cents=0; recalc(req.session.cart); return res.redirect('/cart'); }
  const disc = d.rows[0];
  const now = new Date();
  if((disc.expires_at && new Date(disc.expires_at)<now) || (disc.max_uses && disc.used_count>=disc.max_uses)){
    req.session.cart.discount_code=null; req.session.cart.discount_amount_cents=0; recalc(req.session.cart); return res.redirect('/cart');
  }
  recalc(req.session.cart);
  if(req.session.cart.subtotal_cents < (disc.min_total_cents||0)){
    req.session.cart.discount_code=null; req.session.cart.discount_amount_cents=0; recalc(req.session.cart); return res.redirect('/cart');
  }
  const amount = disc.type==='percent' ? Math.round(req.session.cart.subtotal_cents * (disc.value/100)) : disc.value;
  req.session.cart.discount_code = disc.code;
  req.session.cart.discount_amount_cents = amount;
  recalc(req.session.cart);
  res.redirect('/cart');
});

router.post('/checkout', async (req,res)=>{
  initCart(req.session);
  const { name, email, phone, address, city, zip, province, country } = req.body;
  const cart = req.session.cart;
  recalc(cart);
  const ins = await query(`INSERT INTO orders(email,name,phone,shipping,items,subtotal_cents,discount_code,discount_amount_cents,total_cents,status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'paid') RETURNING *`,
    [email, name, phone, {address,city,zip,province,country}, cart.items, cart.subtotal_cents, cart.discount_code, cart.discount_amount_cents, cart.total_cents]);
  if(cart.discount_code) await query('UPDATE discounts SET used_count=used_count+1 WHERE code=$1',[cart.discount_code]);
  req.session.cart = null;
  res.redirect(`/success?order=${ins.rows[0].order_no}`);
});

router.get('/success', (req,res)=> res.render('store/success', { order_no: req.query.order }));

export default router;
