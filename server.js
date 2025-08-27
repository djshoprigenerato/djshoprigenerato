import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import storeRoutes from './routes/store.js';
import adminRoutes from './routes/admin.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 10000;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'changeme',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' }
}));

app.use(storeRoutes);
app.use(adminRoutes);

app.use((req,res)=> res.status(404).render('store/404'));
app.use((err,req,res,next)=>{ console.error(err); res.status(500).render('store/500'); });

app.listen(PORT, ()=> console.log('Listening on :' + PORT));
