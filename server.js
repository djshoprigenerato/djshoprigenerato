// server.js — DJSHOPRIGENERATO
// ES Modules
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';

// Se usi altre middleware, lasciale pure qui (helmet/compression/cookieParser, ecc.)
// import helmet from 'helmet';
// import compression from 'compression';

// Route modules del progetto
import storeRoutes from './routes/store.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';

// ------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Se stai dietro a Render/Proxy
app.set('trust proxy', 1);

// View engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessione (MemoryStore: ok per dev; in prod valuta uno store esterno)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 2, // 2 ore
    },
  })
);

// ------------------------------------------------------------------
// FILE STATICI (CSS, immagini, favicon)
// Serviamo sia senza prefisso che con /public per massima compatibilità

// /css, /img, /favicon.ico, /js, ecc.
app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: true,
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      // Non cache su HTML accidentali nella public
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store');
      }
    },
  })
);

// Opzionale: disponibili anche con /public/...
app.use('/public', express.static(path.join(__dirname, 'public')));

// favicon (coperta anche dallo static di cui sopra)
app.get('/favicon.ico', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'))
);

// ------------------------------------------------------------------
// Rotte

// Healthcheck per Render
app.get('/healthz', (req, res) => res.type('text').send('ok'));

// Home, categorie, prodotto, carrello, checkout, ecc.
// (storeRoutes dovrebbe già definire la GET '/' per la home)
app.use('/', storeRoutes);

// Login/registrazione
app.use('/', authRoutes);

// Area admin
app.use('/admin', adminRoutes);

// Se qualcuno finisce su /store, mandiamolo alla home SENZA cambiare la struttura del sito
app.get('/store', (req, res) => res.redirect('/'));

// ------------------------------------------------------------------
// 404
app.use((req, res, next) => {
  // Se hai views/store/404.ejs lo usiamo, altrimenti testo semplice
  try {
    return res.status(404).render('store/404', {
      title: 'Pagina non trovata',
    });
  } catch (e) {
    return res.status(404).type('text').send('404 — Pagina non trovata');
  }
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  try {
    return res.status(500).render('store/500', {
      title: 'Errore interno',
      error: process.env.NODE_ENV === 'production' ? null : err,
    });
  } catch (e) {
    return res.status(500).type('text').send('500 — Errore interno');
  }
});

// ------------------------------------------------------------------
// Avvio
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on :${PORT}`);
});
