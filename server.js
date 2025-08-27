// server.js
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import storeRoutes from './routes/store.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

app.set('trust proxy', 1);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// STATICI
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/css',     express.static(path.join(__dirname, 'public', 'css')));
app.use('/img',     express.static(path.join(__dirname, 'public', 'img')));
app.use('/js',      express.static(path.join(__dirname, 'public', 'js')));
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

// Healthcheck
app.get('/healthz', (req, res) => res.type('text').send('ok'));

// Router
app.use('/', storeRoutes);
app.use('/admin', adminRoutes);

// 404 / 500
app.use((req, res) => res.status(404).render('store/404'));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  try {
    res.status(500).render('store/500');
  } catch {
    res.status(500).type('text').send('500');
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Listening on ${HOST}:${PORT}`);
});
