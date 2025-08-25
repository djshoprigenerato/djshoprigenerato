// server.js — DJSHOPRIGENERATO (fix home URL)
// Home = '/', e /store → '/' per retro-compatibilità

import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

import storeRouter from './routes/store.js';
import adminRouter from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// View engine EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Statici
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true,
}));

// Body parsers
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Sessione
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';
app.use(session({
  name: 'djsid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

// Flash → view locals
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  res.locals.user = req.session.user || null;
  res.locals.BASE_URL = process.env.BASE_URL || '';
  next();
});

// No-cache per admin (evita pagine stale col tasto indietro)
const noCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
};
app.use('/admin', noCache);

// Healthcheck
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// ✅ Home dello shop su “/” (NIENTE redirect a /store)
app.use('/', storeRouter);

// 🔁 Retro-compatibilità: se qualcuno va su /store, rimandalo alla home
app.get('/store', (req, res) => res.redirect('/'));

// Admin
app.use('/admin', adminRouter);

// 404
app.use((req, res) => {
  res.status(404);
  try {
    return res.render('store/404', { title: 'Pagina non trovata' });
  } catch {
    return res.send('404');
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500);
  try {
    return res.render('store/error', {
      title: 'Errore interno',
      error: process.env.NODE_ENV === 'production' ? null : err,
    });
  } catch {
    return res.send('Errore interno');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Listening on :${PORT}`);
});
