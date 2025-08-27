// server.js
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Routers
import storeRoutes from './routes/store.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

// Fidati del proxy di Render per X-Forwarded-* (necessario per cookie secure)
app.set('trust proxy', 1);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Statici (serviti da /public/..)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Sessione
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'changeme',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // ok su Render con trust proxy
      sameSite: 'lax',
    },
  })
);

// Health check (usato da Render e per debug rapido)
app.get('/healthz', (req, res) => res.type('text').send('ok'));

// Routers
// NB: lo store deve vivere su "/" (home, categorie, prodotto, ecc.)
app.use('/', storeRoutes);
// NB: l'admin vive su "/admin"
app.use('/admin', adminRoutes);

// 404 e 500
app.use((req, res) => res.status(404).render('store/404'));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  try {
    res.status(500).render('store/500');
  } catch {
    res.status(500).type('text').send('500');
  }
});

// Avvio (bind esplicito a 0.0.0.0 per Render)
app.listen(PORT, HOST, () => {
  console.log(`Listening on ${HOST}:${PORT}`);
});
