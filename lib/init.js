// lib/init.js
import { query } from './db.js';

async function init() {
  // Sequenza ordini da 456
  await query(`CREATE SEQUENCE IF NOT EXISTS order_no_seq START 456`);

  // Tabelle base (create se assenti)
  await query(`
    CREATE TABLE IF NOT EXISTS categories(
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS products(
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      price_cents INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      images JSONB DEFAULT '[]',
      published BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS discounts(
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('percent','fixed')),
      value INTEGER NOT NULL,
      min_total_cents INTEGER DEFAULT 0,
      max_uses INTEGER,
      used_count INTEGER DEFAULT 0,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orders(
      id SERIAL PRIMARY KEY,
      order_no INTEGER NOT NULL DEFAULT nextval('order_no_seq'),
      email TEXT,
      name TEXT,
      phone TEXT,
      shipping JSONB,
      items JSONB,
      subtotal_cents INTEGER NOT NULL DEFAULT 0,
      discount_code TEXT,
      discount_amount_cents INTEGER DEFAULT 0,
      total_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'paid',
      courier TEXT,
      tracking TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // 🔧 MIGRAZIONI IDMPOTENTI per products (aggiungono colonne se mancano)
  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'`);
  await query(`ALTER TABLE products ALTER COLUMN images SET DEFAULT '[]'`);

  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true`);
  await query(`ALTER TABLE products ALTER COLUMN published SET DEFAULT true`);

  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE products ALTER COLUMN price_cents SET DEFAULT 0`);

  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`);
  await query(`ALTER TABLE products ALTER COLUMN created_at SET DEFAULT now()`);

  console.log('Schema ready.');
}

init()
  .then(() => process.exit(0))
  .catch(err => { console.error('Init error', err); process.exit(1); });
