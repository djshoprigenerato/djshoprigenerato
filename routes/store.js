import express from 'express';
import Stripe from 'stripe';
import { query } from '../lib/db.js';

const router = express.Router();
const stripeSecret = process.env.STRIPE_SECRET_KEY || null;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function ensureCart(req) { if (!req.session.cart) req.session.cart = []; }

router.get('/', async (req, res) => {
  const cats = (await query('select * from categories order by name')).rows;
  const prods = (await query('select * from products where is_active=true order by created_at desc limit 12')).rows;
  res.render('store/home', { title: 'Home', cats, prods });
});

router.get('/category/:slug', async (req, res) => {
  const r = await query('select * from categories where slug=$1', [req.params.slug]);
  const cat = r.rows[0];
  if (!cat) return res.status(404).render('store/404', { title: 'Categoria non trovata' });
  const prods = (await query('select * from products where is_active=true and category_id=$1', [cat.id])).rows;
  res.render('store/category', { title: cat.name, cat, prods });
});

router.get('/product/:slug', async (req, res) => {
  const r = await query(`select p.*, c.name as category_name, c.slug as category_slug
                         from products p left join categories c on p.category_id=c.id where p.slug=$1`, [req.params.slug]);
  const p = r.rows[0];
  if (!p) return res.status(404).render('store/404', { title: 'Prodotto non trovato' });
  res.render('store/product', { title: p.title, p });
});

// CART
router.post('/cart/add', async (req, res) => {
  ensureCart(req);
  const { product_id, quantity } = req.body;
  const r = await query('select id,title,price_cents,slug,image from products where id=$1 and is_active=true', [product_id]);
  const p = r.rows[0];
  if (!p) { req.session.flash = { type:'error', msg:'Prodotto non disponibile.' }; return res.redirect('back'); }
  const qty = Math.max(1, parseInt(quantity || 1));
  const existing = req.session.cart.find(i => i.product_id == p.id);
  if (existing) existing.quantity += qty;
  else req.session.cart.push({ product_id: p.id, title: p.title, price_cents: p.price_cents, quantity: qty, slug: p.slug, image: p.image });
  req.session.flash = { type:'success', msg:'Aggiunto al carrello.' };
  res.redirect('/cart');
});

router.get('/cart', (req, res) => {
  ensureCart(req);
  const items = req.session.cart;
  const total = items.reduce((s,i)=> s + i.price_cents*i.quantity, 0);
  res.render('store/cart', { title:'Carrello', items, total });
});

router.post('/cart/update', (req, res) => {
  ensureCart(req);
  const { product_id, quantity } = req.body;
  const idx = req.session.cart.findIndex(i => i.product_id == product_id);
  if (idx >= 0) {
    const q = Math.max(0, parseInt(quantity || 0));
    if (q === 0) req.session.cart.splice(idx, 1);
    else req.session.cart[idx].quantity = q;
  }
  res.redirect('/cart');
});

// CHECKOUT (free shipping note)
router.get('/checkout', (req, res) => {
  ensureCart(req);
  if (!req.session.cart.length) return res.redirect('/cart');
  res.render('store/checkout', { title:'Checkout', publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null });
});

router.post('/checkout', async (req, res) => {
  ensureCart(req);
  const { email } = req.body;
  if (!req.session.cart.length) return res.redirect('/cart');
  const total = req.session.cart.reduce((s,i)=> s + i.price_cents*i.quantity, 0);

  const ins = await query('insert into orders(user_id,email,total_cents,status) values($1,$2,$3,$4) returning id',
                          [req.session.user?.id || null, email, total, 'pending']);
  const orderId = ins.rows[0].id;
  for (const it of req.session.cart) {
    await query('insert into order_items(order_id,product_id,title,unit_price_cents,quantity) values($1,$2,$3,$4,$5)',
                [orderId, it.product_id, it.title, it.price_cents, it.quantity]);
  }

  if (!stripe) {
    await query('update orders set status=$1 where id=$2', ['paid', orderId]);
    req.session.cart = [];
    req.session.flash = { type:'success', msg:'Ordine completato (demo senza Stripe).' };
    return res.redirect('/order/' + orderId);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: req.session.cart.map(i => ({
        price_data: {
          currency: 'eur',
          product_data: { name: i.title },
          unit_amount: i.price_cents
        },
        quantity: i.quantity
      })),
      success_url: `${BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&oid=${orderId}`,
      cancel_url: `${BASE_URL}/checkout/cancel?oid=${orderId}`
    });
    await query('update orders set stripe_session_id=$1 where id=$2', [session.id, orderId]);
    res.redirect(303, session.url);
  } catch (e) {
    console.error(e);
    req.session.flash = { type:'error', msg:'Errore pagamento: ' + e.message };
    res.redirect('/cart');
  }
});

router.get('/checkout/success', async (req, res) => {
  const { session_id, oid } = req.query;
  if (session_id) {
    await query('update orders set status=$1 where id=$2', ['paid', oid]);
    req.session.cart = [];
  }
  res.render('store/success', { title: 'Grazie per l ordine', orderId: oid });
});

router.get('/checkout/cancel', (req, res) => {
  const { oid } = req.query;
  res.render('store/cancel', { title: 'Pagamento annullato', orderId: oid });
});

router.get('/order/:id', async (req, res) => {
  const order = (await query('select * from orders where id=$1', [req.params.id])).rows[0];
  if (!order) return res.status(404).render('store/404', { title: 'Ordine non trovato' });
  const items = (await query('select * from order_items where order_id=$1', [order.id])).rows;
  res.render('store/order', { title:'Dettaglio ordine', order, items });
});

// Static pages
router.get('/about', (req, res) => res.render('store/about', { title: 'Chi siamo' }));
router.get('/refurb', (req, res) => res.render('store/refurb', { title: 'Processo Rigenerazione' }));
router.get('/warranty', (req, res) => res.render('store/warranty', { title: 'Garanzia' }));
router.get('/shipping', (req, res) => res.render('store/shipping', { title: 'Spedizioni & Resi' }));
router.get('/privacy', (req, res) => res.render('store/privacy', { title: 'Privacy' }));
router.get('/terms', (req, res) => res.render('store/terms', { title: 'Termini' }));
router.get('/faq', (req, res) => res.render('store/faq', { title: 'FAQ' }));

export default router;
