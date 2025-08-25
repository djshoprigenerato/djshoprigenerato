import express from 'express';
import multer from 'multer';
import { query } from '../lib/db.js';
import { buildOrderPdfBuffer } from '../lib/pdf.js';
import { sendMail, tplShipment } from '../lib/mailer.js';
import { uploadBufferToStorage } from '../lib/storage.js';

const router = express.Router();
const upload = multer(); // in memoria

function ensureAdmin(req, res, next) {
  if (req.session?.user?.is_admin) return next();
  req.session.flash = { type: 'error', msg: 'Area riservata.' };
  return res.redirect('/login');
}

const slugify = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const toCents = (v) => Math.round(parseFloat(String(v || '0').replace(',', '.')) * 100);

// DASHBOARD
router.get('/', ensureAdmin, async (req, res, next) => {
  try {
    const stats = (await query(`
      select
        (select count(*) from products) as products,
        (select count(*) from orders) as orders,
        (select count(*) from orders where status='paid') as orders_paid
    `)).rows[0];
    res.render('admin/dashboard', { title: 'Dashboard', stats });
  } catch (e) { next(e); }
});

/* ======================= PRODOTTI ======================= */
router.get('/products', ensureAdmin, async (req, res, next) => {
  try {
    const { q = '', category = '' } = req.query;
    const cats = (await query('select id, name, slug from categories order by name')).rows;

    const where = [];
    const params = [];
    if (q) { params.push(`%${q}%`); where.push(`(p.title ilike $${params.length} or p.description ilike $${params.length})`); }
    if (category) { params.push(category); where.push(`c.slug = $${params.length}`); }

    let sql = `
      select p.*, c.name as category_name, c.slug as category_slug
      from products p left join categories c on p.category_id=c.id
    `;
    if (where.length) sql += ' where ' + where.join(' and ');
    sql += ' order by p.created_at desc limit 300';

    const products = (await query(sql, params)).rows;
    res.render('admin/products', { title: 'Prodotti', products, cats, q, category });
  } catch (e) { next(e); }
});

// Nuovo prodotto (form)
router.get('/products/new', ensureAdmin, async (req, res, next) => {
  try {
    const cats = (await query('select id,name from categories order by name')).rows;
    res.render('admin/products_new', { title: 'Nuovo prodotto', cats });
  } catch (e) { next(e); }
});

// Crea prodotto
router.post('/products', ensureAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const { title, category_id, price, description, is_active, image_url } = req.body;
    if (!title || !category_id) {
      req.session.flash = { type:'error', msg:'Titolo e categoria sono obbligatori.' };
      return res.redirect('/admin/products/new');
    }
    let image = image_url || null;
    if (req.file && req.file.buffer?.length) {
      image = await uploadBufferToStorage(req.file.buffer, req.file.originalname, req.file.mimetype);
    }
    const slug = slugify(title);
    await query(
      `insert into products (title, slug, category_id, price_cents, description, image, is_active)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (slug) do update set
         title=excluded.title, category_id=excluded.category_id,
         price_cents=excluded.price_cents, description=excluded.description,
         image=coalesce(excluded.image, products.image),
         is_active=excluded.is_active`,
      [title, slug, category_id, toCents(price), description || null, image, Boolean(is_active)]
    );
    req.session.flash = { type:'success', msg:'Prodotto salvato.' };
    res.redirect('/admin/products');
  } catch (e) { next(e); }
});

// Edit prodotto (form)
router.get('/products/:id/edit', ensureAdmin, async (req, res, next) => {
  try {
    const p = (await query('select * from products where id=$1', [req.params.id])).rows[0];
    if (!p) return res.status(404).render('store/404', { title:'Prodotto non trovato' });
    const cats = (await query('select id,name from categories order by name')).rows;
    res.render('admin/products_edit', { title: 'Modifica prodotto', p, cats });
  } catch (e) { next(e); }
});

// Update prodotto
router.post('/products/:id', ensureAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const { title, category_id, price, description, is_active, image_url } = req.body;
    const p = (await query('select * from products where id=$1', [req.params.id])).rows[0];
    if (!p) return res.status(404).render('store/404', { title:'Prodotto non trovato' });

    let image = image_url || p.image;
    if (req.file && req.file.buffer?.length) {
      image = await uploadBufferToStorage(req.file.buffer, req.file.originalname, req.file.mimetype);
    }
    const slug = slugify(title || p.title);
    await query(
      `update products set
         title=$1, slug=$2, category_id=$3, price_cents=$4, description=$5, image=$6, is_active=$7
       where id=$8`,
      [title || p.title, slug, category_id || p.category_id, toCents(price ?? p.price_cents/100), description ?? p.description, image, Boolean(is_active), req.params.id]
    );
    req.session.flash = { type:'success', msg:'Prodotto aggiornato.' };
    res.redirect('/admin/products');
  } catch (e) { next(e); }
});

// Delete prodotto
router.post('/products/:id/delete', ensureAdmin, async (req, res, next) => {
  try {
    try {
      await query('delete from products where id=$1', [req.params.id]);
      req.session.flash = { type:'success', msg:'Prodotto eliminato.' };
    } catch {
      await query('update products set is_active=false where id=$1', [req.params.id]);
      req.session.flash = { type:'success', msg:'Prodotto disattivato (non eliminabile perché usato in ordini).' };
    }
    res.redirect('/admin/products');
  } catch (e) { next(e); }
});

/* ======================= CATEGORIE ======================= */
router.get('/categories', ensureAdmin, async (req, res, next) => {
  try {
    const cats = (await query('select * from categories order by name')).rows;
    res.render('admin/categories', { title: 'Categorie', cats });
  } catch (e) { next(e); }
});

router.post('/categories', ensureAdmin, async (req, res, next) => {
  try {
    const { name = '', description = '' } = req.body;
    if (!name.trim()) {
      req.session.flash = { type: 'error', msg: 'Nome categoria obbligatorio.' };
      return res.redirect('/admin/categories');
    }
    const slug = slugify(name);
    await query(
      `insert into categories(name, slug, description)
       values($1,$2,$3)
       on conflict (slug) do update set name=excluded.name, description=excluded.description`,
      [name.trim(), slug, description || null]
    );
    req.session.flash = { type: 'success', msg: 'Categoria salvata.' };
    res.redirect('/admin/categories');
  } catch (e) { next(e); }
});

router.get('/categories/:id/edit', ensureAdmin, async (req, res, next) => {
  try {
    const c = (await query('select * from categories where id=$1', [req.params.id])).rows[0];
    if (!c) return res.status(404).render('store/404', { title:'Categoria non trovata' });
    res.render('admin/categories_edit', { title: 'Modifica categoria', c });
  } catch (e) { next(e); }
});

router.post('/categories/:id', ensureAdmin, async (req, res, next) => {
  try {
    const { name = '', description = '' } = req.body;
    const c = (await query('select * from categories where id=$1', [req.params.id])).rows[0];
    if (!c) return res.status(404).render('store/404', { title:'Categoria non trovata' });

    const slug = slugify(name || c.name);
    await query('update categories set name=$1, slug=$2, description=$3 where id=$4',
      [name || c.name, slug, description ?? c.description, req.params.id]);
    req.session.flash = { type:'success', msg:'Categoria aggiornata.' };
    res.redirect('/admin/categories');
  } catch (e) { next(e); }
});

router.post('/categories/:id/delete', ensureAdmin, async (req, res, next) => {
  try {
    const count = (await query('select count(*)::int as n from products where category_id=$1', [req.params.id])).rows[0].n;
    if (count > 0) {
      req.session.flash = { type:'error', msg:'Impossibile eliminare: ci sono prodotti collegati.' };
      return res.redirect('/admin/categories');
    }
    await query('delete from categories where id=$1', [req.params.id]);
    req.session.flash = { type:'success', msg:'Categoria eliminata.' };
    res.redirect('/admin/categories');
  } catch (e) { next(e); }
});

/* ======================= ORDINI ======================= */
router.get('/orders', ensureAdmin, async (req, res, next) => {
  try {
    const orders = (await query('select * from orders order by created_at desc limit 300')).rows;
    res.render('admin/orders', { title: 'Ordini', orders });
  } catch (e) { next(e); }
});

router.get('/orders/:id', ensureAdmin, async (req, res, next) => {
  try {
    const order = (await query('select * from orders where id=$1', [req.params.id])).rows[0];
    if (!order) return res.status(404).render('store/404', { title: 'Ordine non trovato' });
    const items = (await query('select * from order_items where order_id=$1', [order.id])).rows;
    res.render('admin/orders_show', { title: 'Ordine #' + order.id, order, items });
  } catch (e) { next(e); }
});

router.get('/orders/:id/pdf', ensureAdmin, async (req, res, next) => {
  try {
    const order = (await query('select * from orders where id=$1', [req.params.id])).rows[0];
    if (!order) return res.status(404).send('Ordine non trovato');
    const items = (await query('select * from order_items where order_id=$1', [order.id])).rows;
    const pdf = await buildOrderPdfBuffer(order, items);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ordine-${order.id}.pdf"`);
    return res.send(pdf);
  } catch (e) { next(e); }
});

router.post('/orders/:id/ship', ensureAdmin, async (req, res, next) => {
  try {
    const { provider, tracking } = req.body;
    const o = (await query(
      'update orders set shipping_provider=$1, tracking_code=$2, shipped_at=now() where id=$3 returning *',
      [provider || null, tracking || null, req.params.id]
    )).rows[0];

    if (o?.email) {
      const { subject, html } = tplShipment({
        orderId: o.id,
        provider: o.shipping_provider || 'Corriere',
        tracking: o.tracking_code || ''
      });
      await sendMail({ to: o.email, subject, html });
    }
    req.session.flash = { type: 'success', msg: 'Ordine aggiornato e email inviata.' };
    res.redirect('/admin/orders/' + req.params.id);
  } catch (e) { next(e); }
});

export default router;
