import express from 'express';
import { query } from '../lib/db.js';
import { buildOrderPdfBuffer } from '../lib/pdf.js';
import { sendMail, tplShipment } from '../lib/mailer.js';

const router = express.Router();

function ensureAdmin(req, res, next) {
  if (req.session?.user?.is_admin) return next();
  req.session.flash = { type: 'error', msg: 'Area riservata.' };
  return res.redirect('/login');
}

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

// PRODOTTI (lista + ricerca/filtri)
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
    sql += ' order by p.created_at desc limit 200';

    const products = (await query(sql, params)).rows;
    res.render('admin/products_index', { title: 'Prodotti', products, cats, q, category });
  } catch (e) { next(e); }
});

// ORDINI — lista
router.get('/orders', ensureAdmin, async (req, res, next) => {
  try {
    const orders = (await query('select * from orders order by created_at desc limit 200')).rows;
    res.render('admin/orders_index', { title: 'Ordini', orders });
  } catch (e) { next(e); }
});

// ORDINE — dettaglio
router.get('/orders/:id', ensureAdmin, async (req, res, next) => {
  try {
    const order = (await query('select * from orders where id=$1', [req.params.id])).rows[0];
    if (!order) return res.status(404).render('store/404', { title: 'Ordine non trovato' });
    const items = (await query('select * from order_items where order_id=$1', [order.id])).rows;
    res.render('admin/orders_show', { title: 'Ordine #' + order.id, order, items });
  } catch (e) { next(e); }
});

// ORDINE — PDF
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

// ORDINE — marca SPEDITO + email cliente
router.post('/orders/:id/ship', ensureAdmin, async (req, res, next) => {
  try {
    const { provider, tracking } = req.body;
    const o = (await query('update orders set shipping_provider=$1, tracking_code=$2, shipped_at=now() where id=$3 returning *',
      [provider || null, tracking || null, req.params.id])).rows[0];
    if (o && o.email) {
      const { subject, html } = tplShipment({ orderId: o.id, provider: o.shipping_provider || 'Corriere', tracking: o.tracking_code || '' });
      await sendMail({ to: o.email, subject, html });
    }
    req.session.flash = { type: 'success', msg: 'Ordine aggiornato e email inviata.' };
    res.redirect('/admin/orders/' + req.params.id);
  } catch (e) { next(e); }
});

export default router;
