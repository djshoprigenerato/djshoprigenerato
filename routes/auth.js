import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../lib/db.js';

const router = express.Router();

router.get('/login', (req, res) => res.render('auth/login', { title:'Accedi' }));

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const r = await query('select * from users where email=$1', [email]);
  const u = r.rows[0];
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    req.session.flash = { type:'error', msg:'Credenziali non valide.' };
    return res.redirect('/login');
  }
  req.session.user = { id: u.id, email: u.email, name: u.name, is_admin: u.is_admin };
  res.redirect(u.is_admin ? '/admin' : '/');
});

router.get('/register', (req, res) => res.render('auth/register', { title:'Registrati' }));

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) {
    req.session.flash = { type:'error', msg:'Email e password sono obbligatorie.' };
    return res.redirect('/register');
  }
  const exists = await query('select 1 from users where email=$1', [email]);
  if (exists.rowCount) {
    req.session.flash = { type:'error', msg:'Email gia registrata.' };
    return res.redirect('/register');
  }
  const hash = bcrypt.hashSync(password, 10);
  await query('insert into users(email,password_hash,name,is_admin) values($1,$2,$3,false)', [email, hash, name || '']);
  req.session.flash = { type:'success', msg:'Registrazione completata. Ora accedi.' };
  res.redirect('/login');
});

router.post('/logout', (req, res) => {
  req.session.destroy(()=>res.redirect('/'));
});

export default router;
