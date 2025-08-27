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

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// statici
app.use('/public', express.static(path.join(__dirname, 'public')));

// parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// sessione
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// health
app.get('/healthz', (req, res) => res.type('text').send('ok'));

// routers
app.use('/', storeRoutes);
app.use('/admin', adminRoutes);

// errors
app.use((req,res)=>res.status(404).render('store/404',{title:'404'}));
app.use((err,req,res,next)=>{
  console.error('Unhandled error:', err);
  res.status(500).render('store/500',{title:'Errore'});
});

app.listen(PORT, HOST, () => {
  console.log(`Listening on ${HOST}:${PORT}`);
});
