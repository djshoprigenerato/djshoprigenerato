// server.js (DJSHOPRIGENERATO – FIX per Render + error handler)
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import { fileURLToPath } from 'url';

import storeRoutes from './routes/store.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Layout wrapper che *invia* la risposta
app.response.render = function (view, options = {}, callback) {
  const res = this;
  const opts = options || {};
  const layout = opts.layout === false ? null : (opts.layout || 'layouts/main');

  res.app.render(view, opts, function (err, html) {
    if (err) return callback ? callback(err) : res.status(500).send('Render error');

    if (!layout) {
      return callback ? callback(null, html) : res.send(html);
    }

    const layoutOpts = { ...opts, body: html };
    res.app.render(layout, layoutOpts, function (err2, out) {
      if (err2) return callback ? callback(err2) : res.status(500).send('Layout render error');
      return callback ? callback(null, out) : res.send(out);
    });
  });
};

// Static
app.use('/public', express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

// Session (ok per iniziare sul piano Free)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Locals
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.freeShipping = true;
  next();
});

// Health check (non tocca il DB)
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Routes
app.use('/', storeRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

// Global error handler (evita 502 e mostra 500)
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

// Render richiede ascolto su 0.0.0.0 e PORT
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on :${PORT}`);
});
