// routes/store.js — shop + checkout Stripe (spedizione gratuita + address)
import express from 'express';
import Stripe from 'stripe';
import { query } from '../lib/db.js';

const router = express.Router();
// MOSTRA la home anche per link vecchi su "/store", senza redirect
router.use((req, res, next) => {
  if (req.method === 'GET' && (req.path === '/store' || req.path === '/index.html')) {
    req.url = '/'; // riscrittura interna al router
  }
  next();
});
const stripeSecret = process.env.STRIPE_SECRET_KEY || null;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const BASE_URL = process.env.BASE_URL || 'https://www.djshoprigenerato.eu';

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
function ensureCart(req) { if (!req.session.cart) req.session.cart = []; }

// Home
router.get('/', asyncHandler(async (req, res) => {
  const cats = (await query('select * from categories order by name')).rows;
  const prods = (await query('select * from products where is_active=true order by created_at desc limit 12')).rows;
  res.render('store/home', { title: 'Home', cats, prods });
}));

// Categoria
router.get('/category/:slug', asyncHandler(async (req, res) => {
  const r = await query('select * from categories where slug=$1', [req.params.slug]);
  const cat = r.rows[0];
  if (!cat) return res.status(404).render('store/404', { title: 'Categoria non trovata' });
  const prods = (await query('select * from products where is_active=true and category_id=$1', [cat.id])).rows;
  res.render('store/category', { title: cat.name, cat, prods });
}));

// Prodotto (con galleria immagini)
router.get('/product/:slug', asyncHandler(async (req, res) => {
  const r = await query(`
    select p.*, c.name as category_name, c.slug as category_slug
    from products p
    left join categories c on p.category_id=c.id
    where p.slug=$1
  `, [req.params.slug]);
  const p = r.rows[0];
  if (!p) return res.status(404).render('store/404', { title: 'Prodotto non trovato' });

  // Galleria immagini
  const images = (await query(
    'select id, url from product_images where product_id=$1 order by sort_order, id',
    [p.id]
  )).rows;

  res.render('store/product', { title: p.title, p, images });
}));

// Carrello
router.post('/cart/add', asyncHandler(async (req, res) => {
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
}));

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

// Checkout - pagina
router.get('/checkout', (req, res) => {
  ensureCart(req);
  if (!req.session.cart.length) return res.redirect('/cart');
  res.render('store/checkout', { title:'Checkout', publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null });
});

// Checkout - creazione sessione Stripe
router.post('/checkout', asyncHandler(async (req, res) => {
  ensureCart(req);
  const { email } = req.body;
  if (!req.session.cart.length) return res.redirect('/cart');

  const total = req.session.cart.reduce((s,i)=> s + i.price_cents*i.quantity, 0);

  // crea ordine "pending"
  const ins = await query(
    'insert into orders(user_id,email,total_cents,status) values($1,$2,$3,$4) returning id',
    [req.session.user?.id || null, email, total, 'pending']
  );
  const orderId = ins.rows[0].id;

  for (const it of req.session.cart) {
    await query(
      'insert into order_items(order_id,product_id,title,unit_price_cents,quantity) values($1,$2,$3,$4,$5)',
      [orderId, it.product_id, it.title, it.price_cents, it.quantity]
    );
  }

  // Se Stripe non è configurato, completa in "demo" (non dovrebbe capitare in live)
  if (!stripe) {
    await query('update orders set status=$1 where id=$2', ['paid', orderId]);
    req.session.cart = [];
    req.session.flash = { type:'success', msg:'Ordine completato (demo senza Stripe).' };
    return res.redirect('/order/' + orderId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card', 'link'],
    customer_email: email,
    line_items: req.session.cart.map(i => ({
      price_data: {
        currency: 'eur',
        product_data: { name: i.title },
        unit_amount: i.price_cents
      },
      quantity: i.quantity
    })),
    // Spedizione: gratuita (SDA & GLS) + indirizzo IT
    shipping_address_collection: { allowed_countries: ['IT'] },
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 0, currency: 'eur' },
        display_name: 'Spedizione gratuita (SDA & GLS)',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 2 },
          maximum: { unit: 'business_day', value: 5 }
        }
      }
    }],
    success_url: `${BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&oid=${orderId}`,
    cancel_url: `${BASE_URL}/checkout/cancel?oid=${orderId}`
  });

  await query('update orders set stripe_session_id=$1 where id=$2', [session.id, orderId]);
  res.redirect(303, session.url);
}));

router.get('/checkout/success', asyncHandler(async (req, res) => {
  const { session_id, oid } = req.query;
  if (session_id) {
    await query('update orders set status=$1 where id=$2', ['paid', oid]);
    req.session.cart = [];
  }
  res.render('store/success', { title: 'Grazie per l\'ordine', orderId: oid });
}));

router.get('/checkout/cancel', (req, res) => {
  const { oid } = req.query;
  res.render('store/cancel', { title: 'Pagamento annullato', orderId: oid });
});

router.get('/order/:id', asyncHandler(async (req, res) => {
  const order = (await query('select * from orders where id=$1', [req.params.id])).rows[0];
  if (!order) return res.status(404).render('store/404', { title: 'Ordine non trovato' });
  const items = (await query('select * from order_items where order_id=$1', [order.id])).rows;
  res.render('store/order', { title:'Dettaglio ordine', order, items });
}));

// Pagine statiche
router.get('/about', (req, res) => res.render('store/about', { title: 'Chi siamo' }));
router.get('/refurb', (req, res) => res.render('store/refurb', { title: 'Processo Rigenerazione' }));
router.get('/warranty', (req, res) => res.render('store/warranty', { title: 'Garanzia' }));
router.get('/shipping', (req, res) => res.render('store/shipping', { title: 'Spedizioni & Resi' }));
router.get('/privacy', (req, res) => res.render('store/privacy', { title: 'Privacy' }));
router.get('/terms', (req, res) => res.render('store/terms', { title: 'Termini' }));
router.get('/faq', (req, res) => res.render('store/faq', { title: 'FAQ' }));

export default router;
