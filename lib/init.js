import { query } from './db.js';
import bcrypt from 'bcryptjs';

async function run() {
  await query(`
    create table if not exists users (
      id serial primary key,
      email text unique not null,
      password_hash text not null,
      name text,
      is_admin boolean default false,
      created_at timestamptz default now()
    );
    create table if not exists categories (
      id serial primary key,
      name text not null,
      slug text unique not null,
      description text default ''
    );
    create table if not exists products (
      id serial primary key,
      category_id int references categories(id) on delete set null,
      title text not null,
      slug text unique not null,
      description text default '',
      price_cents int not null,
      image text default '',
      video_url text default '',
      is_active boolean default true,
      created_at timestamptz default now()
    );
    create table if not exists orders (
      id serial primary key,
      user_id int references users(id) on delete set null,
      email text not null,
      total_cents int not null,
      stripe_session_id text,
      status text default 'pending',
      created_at timestamptz default now()
    );
    create table if not exists order_items (
      id serial primary key,
      order_id int references orders(id) on delete cascade,
      product_id int references products(id) on delete set null,
      title text not null,
      unit_price_cents int not null,
      quantity int not null
    );
  `);
  // Campi opzionali per spedizione sull'ordine (idempotente)
await query(`
  alter table orders
    add column if not exists shipping_provider text,
    add column if not exists tracking_code text,
    add column if not exists shipped_at timestamptz
`);


  const admin = await query('select count(*) from users where is_admin=true');
  if (parseInt(admin.rows[0].count) === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await query('insert into users(email,password_hash,name,is_admin) values($1,$2,$3,true)', ['admin@local', hash, 'Admin']);
    console.log('Admin created: admin@local / admin123');
  }
  console.log('Schema ready.');
}

run().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
