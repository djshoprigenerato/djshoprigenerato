// routes/admin.js — CRUD + galleria + ordini + refund Stripe + PDF con spedizione/telefono
import express from 'express';
import multer from 'multer';
import Stripe from 'stripe';
import { query } from '../lib/db.js';
import { buildOrderPdfBuffer } from '../lib/pdf.js';
import { sendMail, tplShipment } from '../lib/mailer.js';
import {
  uploadBufferToStorage,
  uploadFromUrlToStorage,
  removePublicUrl,
  removeManyPublicUrls,
} from '../lib/storage.js';

const router = express.Router();
const upload = multer();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function ensureAdmin(req, res, next) {
  if (req.session?.user?.is_admin) return next();
  req.session.flash = { type: 'error', msg: 'Area riservata.' };
  return res.redirect('/login');
}

const slugify = (s) =>
  (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
const toCents = (v) => Math.round(parseFloat(String(v || '0').replace(',', '.')) * 100);

async function ensureUniqueSlug(table, baseSlug, excludeId = null) {
  let base = (baseSlug && baseSlug.trim()) ? baseSlug : 'item';
  let slug = base;
  let i = 1;
  while (true) {
    const sql = excludeId
      ? `select 1 from ${table} where slug=$1 and id<>$2 limit 1`
      : `select 1 from ${table} where slug=$1 limit 1`;
    const params = excludeId ? [slug, excludeId] : [slug];
    const r = await query(sql, params);
    if (r.rowCount === 0) return slug;
    i++;
    slug = `${base}-${i}`;
  }
}

/* ======================= DASHBOARD ======================= */
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

router.get('/products/new', ensureAdmin, async (req, res, next) => {
  try {
    const cats = (await query('select id,name from categories order by name')).rows;
    res.render('admin/products_new', { title: 'Nuovo prodotto', cats });
  } catch (e) { next(e); }
});

router.post('/products', ensureAdmin, upload.fields([{name:'image',maxCount:1},{name:'images',maxCount:20}]), async (req, res, next) => {
  try {
    const { title, category_id, price, description, is_active, image_url, cover_url, image_urls } = req.body;
    if (!title || !category_id) {
      req.session.flash = { type:'error', msg:'Titolo e categoria sono obbligatori.' };
      return res.redirect('/admin/products/new');
    }

    let cover = null;
    if (req.files?.image?.[0]?.buffer) {
      cover = await uploadBufferToStorage(
        req.files.image[0].buffer, req.files.image[0].originalname, req.files.image[0].mimetype
      );
    }
    if (!cover && (image_url || cover_url)) {
      const url = image_url || cover_url;
      try { cover = await uploadFromUrlToStorage(url); } catch {}
    }

    const slug = await ensureUniqueSlug('products', slugify(title));
    const ins = await query(
      `insert into products (title, slug, category_id, price_cents, description, image, is_active)
       values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [title, slug, category_id, toCents(price), description || null, cover, Boolean(is_active)]
    );
    const productId = ins.rows[0].id;

    const urlLines = (image_urls || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const fromUrls = [];
    for (const u of urlLines) {
      try { fromUrls.push(await uploadFromUrlToStorage(u)); } catch {}
    }
    const uploaded = [];
    if (req.files?.images?.length) {
      for (const f of req.files.images) {
        uploaded.push(await uploadBufferToStorage(f.buffer, f.originalname, f.mimetype));
      }
    }
    const allUrls = [...fromUrls, ...uploaded];
    for (let i=0;i<allUrls.length;i++) {
      await query('insert into product_images(product_id,url,sort_order) values($1,$2,$3)', [productId, allUrls[i], i]);
    }
    if (!cover && allUrls[0]) {
      await query('update products set image=$1 where id=$2', [allUrls[0], productId]);
    }

    req.session.flash = { type:'success', msg:'Prodotto creato.' };
    res.redirect('/admin/products');
  } catch (e) { next(e); }
});

router.get('/products/:id/edit', ensureAdmin, async (req, res, next) => {
  try {
    const p = (await query('select * from products where id=$1', [req.params.id])).rows[0];
    if (!p) return res.status(404).render('store/404', { title:'Prodotto non trovato' });
    const cats = (await query('select id,name from categories order by name')).rows;
    const images = (await query('select * from product_images where product_id=$1 order by sort_order,id', [p.id])).rows;
    res.render('admin/products_edit', { title: 'Modifica prodotto', p, cats, images });
  } catch (e) { next(e); }
});

router.post('/products/:id', ensureAdmin, upload.fields([{name:'image',maxCount:1},{name:'images',maxCount:20}]), async (req, res, next) => {
  try {
    const { title, category_id, price, description, is_active, image_url, cover_url, image_urls } = req.body;
    const p = (await query('select * from products where id=$1', [req.params.id])).rows[0];
    if (!p) return res.status(404).render('store/404', { title:'Prodotto non trovato' });

    let cover = p.image;
    if (req.files?.image?.[0]?.buffer) {
      cover = await uploadBufferToStorage(
        req.files.image[0].buffer, req.files.image[0].originalname, req.files.image[0].mimetype
      );
    } else if (image_url) {
      try { cover = await uploadFromUrlToStorage(image_url); } catch {}
    } else if (cover_url) {
      if (/^https?:\/\//i.test(cover_url)) {
        try { cover = await uploadFromUrlToStorage(cover_url); } catch {}
      } else {
        cover = cover_url;
      }
    }

    const slug = await ensureUniqueSlug('products', slugify(title || p.title), req.params.id);
    await query(
      `update products set
         title=$1, slug=$2, category_id=$3, price_cents=$4, description=$5, image=$6, is_active=$7
       where id=$8`,
      [title || p.title, slug, category_id || p.category_id, toCents(price ?? p.price_cents/100),
       description ?? p.description, cover, Boolean(is_active), req.params.id]
    );

    const urlLines = (image_urls || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const fromUrls = [];
    for (const u of urlLines) {
      try { fromUrls.push(await uploadFromUrlToStorage(u)); } catch {}
    }
    const uploaded = [];
    if (req.files?.images?.length) {
      for (const f of req.files.images) {
        uploaded.push(await uploadBufferToStorage(f.buffer, f.originalname, f.mimetype));
      }
    }
    const currentMax = (await query('select coalesce(max(sort_order),-1) as m from product_images where product_id=$1', [req.params.id])).rows[0].m;
    let start = (currentMax ?? -1) + 1;
    for (const u of [...fromUrls, ...uploaded]) {
      await query('insert into product_images(product_id,url,sort_order) values($1,$2,$3)', [req.params.id, u, start++]);
    }

    req.session.flash = { type:'success', msg:'Prodotto aggiornato.' };
    res.redirect('/admin/products');
  } catch (e) { next(e); }
});

router.post('/products/:id/delete', ensureAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    const coverRow = await query('select image from products where id=$1', [id]);
    const galleryRows = await query('select url from product_images where product_id=$1', [id]);
    const urls = [
      ...(coverRow.rows[0]?.image ? [coverRow.rows[0].image] : []),
      ...galleryRows.rows.map(r => r.url).filter(Boolean)
    ];

    try {
      await query('delete from product_images where product_id=$1', [id]);
      await query('delete from products where id=$1', [id]);
      removeManyPublicUrls(urls).catch(() => {});
      req.session.flash = { type:'success', msg:'Prodotto eliminato e file rimossi.' };
    } catch {
      await query('update products set is_active=false where id=$1', [id]);
      req.session.flash = { type:'success', msg:'Prodotto disattivato (presente in ordini). File lasciati intatti.' };
    }

    res.redirect('/admin/products');
  } catch (e) { next(e); }
});

router.post('/products/:id/images/:imgId/delete', ensureAdmin, async (req, res, next) => {
  try {
    const del = await query(
      'delete from product_images where id=$1 and product_id=$2 returning url',
      [req.params.imgId, req.params.id]
    );
    const url = del.rows[0]?.url;
    if (url) removePublicUrl(url).catch(() => {});
    req.session.flash = { type:'success', msg:'Immagine rimossa.' };
    res.redirect('/admin/products/' + req.params.id + '/edit');
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
    const slug = await ensureUniqueSlug('categories', slugify(name));
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

    const slug = await ensureUniqueSlug('categories', slugify(name || c.name), req.params.id);
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

// aggiorna stato ordine
router.post('/orders/:id/status', ensureAdmin, async (req, res, next) => {
  try {
    const { status } = req.body; // es: paid, refunded, cancelled, pending, shipped
    await query('update orders set status=$1 where id=$2', [status, req.params.id]);
    req.session.flash = { type: 'success', msg: 'Stato ordine aggiornato.' };
    res.redirect('/admin/orders/' + req.params.id);
  } catch (e) { next(e); }
});

// aggiorna spedizione (provider/tracking + email)
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

// refund Stripe totale/parziale
router.post('/orders/:id/refund', ensureAdmin, async (req, res, next) => {
  try {
    const { amount } = req.body; // in euro (opzionale)
    const o = (await query('select * from orders where id=$1', [req.params.id])).rows[0];
    if (!o) { req.session.flash = { type:'error', msg:'Ordine non trovato.' }; return res.redirect('/admin/orders'); }

    // payment intent id (adatta ai tuoi nomi colonna)
    const pi = o.stripe_payment_intent_id || o.payment_intent_id || null;
    if (!pi) { req.session.flash = { type:'error', msg:'PaymentIntent non disponibile per il rimborso.' }; return res.redirect('/admin/orders/'+o.id); }

    const refunded = Number(o.refunded_cents || 0);
    const maxRefund = Math.max(Number(o.total_cents || 0) - refunded, 0);
    let cents = maxRefund;
    if (amount) {
      const reqCents = Math.round(parseFloat(String(amount).replace(',', '.')) * 100);
      cents = Math.min(Math.max(reqCents, 0), maxRefund);
    }
    if (cents <= 0) {
      req.session.flash = { type:'error', msg:'Importo rimborso non valido o già rimborsato.' };
      return res.redirect('/admin/orders/'+o.id);
    }

    await stripe.refunds.create({ payment_intent: pi, amount: cents });

    await query(
      'update orders set refunded_cents=coalesce(refunded_cents,0)+$1, refunded_at=now(), status=$2 where id=$3',
      [cents, (refunded + cents >= (o.total_cents || 0)) ? 'refunded' : o.status, o.id]
    );

    req.session.flash = { type:'success', msg:`Rimborso di € ${(cents/100).toFixed(2)} creato.` };
    res.redirect('/admin/orders/' + o.id);
  } catch (e) { next(e); }
});

export default router;
