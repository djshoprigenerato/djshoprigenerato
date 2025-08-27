import pg from 'pg';
const { Pool } = pg;

const useSSL = (process.env.DATABASE_SSL || 'true').toLowerCase() === 'true';
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

export async function query(text, params){
  return pool.query(text, params);
}
