// server.js — DJSHOPRIGENERATO
// Avvio server Express + sessione + no-cache area admin

import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

// Router applicazione
import storeRouter from './routes/store.js';
import adminRouter from './routes/admin.js';

// --------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Render/Heroku behind proxy
app.set('trust proxy', 1);

// View engine EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Statici
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true,
}));

// Parser (POST forms/JSON)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// --------------------------------------------------------
// Sessione
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';
app.use(
  session({
    name: 'djsid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8, // 8 ore
    },
  })
);

// Middleware flash → disponibile in tutte le view
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  res.locals.user = req.session.user || null;
  res.locals.BASE_URL = process.env.BASE_URL || '';
  next();
});

// --------------------------------------------------------
// 🔴 NO-CACHE per l'area admin (evita pagine stale con tasto "indietro")
const noCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
};
app.use('/admin', noCache);

// --------------------------------------------------------
// Healthcheck per Render
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Home redirect (se vuoi la home dello shop su '/')
app.get('/', (req, res) => res.redirect('/store'));

// Router principali
app.use('/', storeRouter);      // pagine shop, autenticazione, checkout, ecc.
app.use('/admin', adminRouter); // backoffice

// 404
app.use((req, res) => {
  res.status(404);
  try {
    return res.render('store/404', { title: 'Pagina non trovata' });
  } catch {
    return res.send('404');
  }
});

// Error handler compatto
// Mostra una pagina d’errore “pulita” in produzione
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

// --------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Listening on :${PORT}`);
});
