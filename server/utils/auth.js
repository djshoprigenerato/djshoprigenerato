
import { supabase } from '../supabase.js';

export async function getUserFromAuthHeader(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data.user;
  } catch (e) {
    return null;
  }
}

export async function requireAdmin(req, res, next) {
  const user = await getUserFromAuthHeader(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const adminRole = process.env.ADMIN_ROLE_NAME || 'admin';
  const role = user?.app_metadata?.role || user?.user_metadata?.role;
  if (role !== adminRole) return res.status(403).json({ error: 'Forbidden' });
  req.user = user;
  next();
}
