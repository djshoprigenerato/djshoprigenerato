// server.js (DJSHOPRIGENERATO – usa express-ejs-layouts, healthz, error handler)
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';

import storeRoutes from './routes/store.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// EJS + Layouts
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main'); // usa views/layouts/main.ejs

// Static
app.use('/public', express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

// Session (ok per iniziare sul Free plan)
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

// Health check (non tocca DB)
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// fidati del proxy di Render
app.enable('trust proxy');

// NON cambiare più l'host (niente www -> apex). Forza solo HTTPS se richiesto.
app.use((req, res, next) => {
  if (req.path === '/healthz') return next();

  // se FORCE_HTTPS=1 e la richiesta arriva in http, forza https sullo stesso host
  if (process.env.FORCE_HTTPS === '1' && req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }

  next();
});

// Routes
app.use('/', storeRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

// Global error handler (evita 502 → mostra 500 leggibile)
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

// Ascolta su 0.0.0.0 come richiede Render
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on :${PORT}`);
});
