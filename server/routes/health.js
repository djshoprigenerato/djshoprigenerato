// server/routes/health.js
import express from 'express'
import { supabaseAuth } from '../supabase.js'

const router = express.Router()

router.get('/healthz', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

router.get('/debug/env', (_req, res) => {
  res.json({
    ok: true,
    supabase_url: process.env.SUPABASE_URL || null,
    anon_key_present: !!process.env.SUPABASE_ANON_KEY,
    service_key_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    site_url: process.env.SITE_URL || null
  })
})

router.get('/debug/ping-supabase', async (_req, res) => {
  try {
    // chiamata innocua: senza token tornerà user:null, ma verifica la reachability
    const { data, error } = await supabaseAuth.auth.getUser()
    res.json({ ok: true, error: error?.message || null, user: data?.user || null })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

export default router
