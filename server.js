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

// Simple layout support
const renderView = app.response.render;
app.response.render = function(view, options = {}, callback) {
  const self = this;
  const opts = options || {};
  const cb = callback || function(){};
  self.app.render(view, opts, function(err, html) {
    if (err) return cb(err);
    const layout = opts.layout === false ? null : (opts.layout || 'layouts/main');
    if (!layout) return self.send(html);
    opts.body = html;
    self.app.render(layout, opts, cb);
  });
};

// Static
app.use('/public', express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

// Sessions (MemoryStore for demo; Render restarts may clear sessions)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
}));

// Expose locals
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.freeShipping = true;
  next();
});

// Routes
app.use('/', storeRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('store/404', { title: 'Pagina non trovata' });
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
