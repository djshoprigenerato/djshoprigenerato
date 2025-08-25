// server.js — DJSHOPRIGENERATO (Render + Stripe LIVE + Webhook + HTTPS toggle)
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';

import Stripe from 'stripe';                       // <-- UNICO import di Stripe
import { query } from './lib/db.js';
import { sendMail, tplOrderConfirmation } from './lib/mailer.js';
import { buildOrderPdfBuffer } from './lib/pdf.js';

import storeRoutes from './routes/store.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ====== Proxy & redirect (NO cambio host; SOLO HTTPS se abilitato) ======
app.enable('trust proxy'); // Render usa un proxy
app.use((req, res, next) => {
  if (req.path === '/healthz') return next();
  if (process.env.FORCE_HTTPS === '1' && req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

// ====== Stripe Webhook (PRIMA dei body parsers, raw body!) ======
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

if (stripe) {
  app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // Aggiorna a 'paid' SOLO se non è già paid (evita doppie email)
        const upd = await query(
          'update orders set status=$1 where stripe_session_id=$2 and status<>$1 returning id,email,total_cents',
          ['paid', session.id]
        );

        if (upd.rowCount) {
          const orderId = upd.rows[0].id;
          const email = upd.rows[0].email;
          const totalEUR = (upd.rows[0].total_cents || 0) / 100;

          const items = (await query('select * from order_items where order_id=$1', [orderId])).rows;
          const orderRow = (await query('select * from orders where id=$1', [orderId])).rows[0];
          const pdf = await buildOrderPdfBuffer(orderRow, items);

          const { subject, html } = tplOrderConfirmation({ orderId, totalEUR });
          await sendMail({
            to: email,
            subject,
            html,
            attachments: [{ filename: `ordine-${orderId}.pdf`, content: pdf }]
          });
        }
      }

      return res.json({ received: true });
    } catch (err) {
      console.error('Webhook verify failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });
}

// ====== Static & middlewares ======
app.use('/public', express.static(path.join(__dirname, 'public')));

// Body parsers (solo DOPO il webhook!)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

// Session (ok per iniziare sul piano Free)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
}));

// Locals disponibili in tutte le view
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.freeShipping = true; // badge "Spedizione gratuita"
  next();
});

// EJS + layouts
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Healthcheck (non tocca DB)
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Routes
app.use('/', storeRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

// Global error handler → mostra 500 leggibile (no 502)
app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err);
  try {
    return res.status(500).render('store/500', { title: 'Errore interno', error: err.message || String(err) });
  } catch {
    return res.status(500).send('Errore interno');
  }
});

// 404
app.use((req, res) => {
  res.status(404).render('store/404', { title: 'Pagina non trovata' });
});

// Start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on :${PORT}`);
});
