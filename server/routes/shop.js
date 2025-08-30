import express from 'express'
import { supabaseAuth } from '../supabase.js'

const router = express.Router()

// ---- PRODOTTI PUBBLICI (lista/filtri) ----
router.get('/products', async (req, res) => {
  try {
    const { q, category_id, id } = req.query
    let query = supabaseAuth
      .from('products')
      .select(`
        id,
        title,
        description,
        price_cents,
        is_active,
        category_id,
        product_images (id, url)
      `)
      .eq('is_active', true)
      .order('id', { ascending: false })

    if (q) query = query.ilike('title', `%${q}%`)
    if (category_id) query = query.eq('category_id', Number(category_id))
    if (id) query = query.eq('id', Number(id))

    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ---- DETTAGLIO PRODOTTO PUBBLICO ----
router.get('/products/:id', async (req, res) => {
  try {
    const prodId = Number(req.params.id)
    if (!prodId) return res.status(400).json({ error: 'ID non valido' })

    const { data, error } = await supabaseAuth
      .from('products')
      .select(`
        id,
        title,
        description,
        price_cents,
        is_active,
        category_id,
        product_images (id, url)
      `)
      .eq('id', prodId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Prodotto non trovato' })

    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ---- PRODOTTO SINGOLO PUBBLICO ----
router.get('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID non valido' });

    const { data, error } = await supabaseAuth
      .from('products')
      .select(`
        id,
        title,
        description,
        price_cents,
        is_active,
        category_id,
        product_images (id, url)
      `)
      .eq('is_active', true)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Prodotto non trovato' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- CATEGORIE PUBBLICHE ----
router.get('/categories', async (_req, res) => {
  try {
    const { data, error } = await supabaseAuth
      .from('categories')
      .select('id, name, description')
      .order('name', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/** ============ PAGINE PUBBLICHE (Termini & Co.) ============ **/
router.get('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const { data, error } = await supabaseAuth
      .from('pages')
      .select('slug, title, content_html, updated_at')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw error
    res.json(
      data || {
        slug,
        title: 'Termini e Condizioni',
        content_html: '<p>Contenuto non ancora impostato.</p>'
      }
    )
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/** ============ CODICI SCONTO PUBBLICI ============ **/
router.get('/discounts/:code', async (req, res) => {
  const code = req.params.code.trim()

  try {
    const { data, error } = await supabaseAuth
      .from('discount_codes')
      .select('id, code, percent_off, amount_off_cents, active')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return res.status(404).json({ error: 'Codice sconto non trovato o non attivo' })
    }

    return res.json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

export default router
