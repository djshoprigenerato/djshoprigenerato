import { supabaseAuth } from '../supabase.js'

export async function getUserFromAuthHeader(req){
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const { data, error } = await supabaseAuth.auth.getUser(token)
  if (error) return null
  return data.user
}

export async function requireAuth(req, res, next){
  const user = await getUserFromAuthHeader(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  req.user = user
  next()
}

export async function requireAdmin(req, res, next){
  const user = await getUserFromAuthHeader(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  const roleNeeded = process.env.ADMIN_ROLE_NAME || 'admin'
  const role = user.app_metadata?.role || user.user_metadata?.role
  if (role !== roleNeeded) return res.status(403).json({ error: 'Forbidden' })
  req.user = user
  next()
}
