// server/routes/stripe.js
import express from 'express'
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase.js'

const router = express.Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})
const APP_URL = process.env.APP_URL || process.env.PUBLIC_URL || 'http://localhost:3000'
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

// -----------------------------
// Create checkout session
// -----------------------------
router.post('/create-checkout-session', express.json(), async (req, res) => {
  try {
    const { cart, customer, discount } = req.body || {}

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Cart vuoto' })
    }

    // percentuale o importo fisso in centesimi (intero)
    const percent = Number(discount?.percent_off || 0)
    const amountOff = Number(discount?.amount_off_cents || 0)

    // line items con eventuale sconto incorporato
    const items = cart.map((i) => {
      let unit = Number(i.price_cents || 0)
      if (percent > 0) {
        unit = Math.max(0, Math.round(unit * (100 - percent) / 100))
      }
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: i.title || 'Prodotto',
            images: i.image_url ? [i.image_url] : [],
          },
          unit_amount: unit,
        },
        quantity: Math.max(1, Number(i.qty || 1)),
      }
    })

    // Se c'è importo fisso, lo ripartiamo proporzionalmente tra le righe
    if (amountOff > 0 && percent === 0) {
      const sumLines = cart.reduce((s, i) => s + (i.price_cents || 0) * (i.qty || 1), 0) || 1
      cart.forEach((ci, idx) => {
        const lineAmount = (ci.price_cents || 0) * (ci.qty || 1)
        const share = Math.floor(amountOff * lineAmount / sumLines)
        const perUnitOff = Math.floor(share / Math.max(1, ci.qty || 1))
        items[idx].price_data.unit_amount = Math.max(0, items[idx].price_data.unit_amount - perUnitOff)
      })
    }

    const metadata = {
      discount_code_id: discount?.id ? String(discount.id) : '',
      customer_email: customer?.email || '',
      customer_name: customer?.name || '',
      shipping: JSON.stringify(customer?.shipping || {}),
      user_id: customer?.user_id || '',
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items,
      success_url: `${APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/cancel`,
      customer_email: customer?.email,
      metadata,
    })

    return res.json({ url: session.url })
  } catch (e) {
    console.error('create-checkout-session error', e)
    return res.status(500).json({ error: e.message })
  }
})

// -----------------------------
// Webhook Stripe
// -----------------------------
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('❌ Webhook signature verification failed.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Recupera i line items per costruire order_items
      const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })

      const shipping = (() => {
        try { return JSON.parse(session.metadata?.shipping || '{}') } catch { return {} }
      })()

      const payload = {
        user_id: session.metadata?.user_id || null,
        customer_email: session.customer_details?.email || session.metadata?.customer_email || null,
        customer_name: session.customer_details?.name || session.metadata?.customer_name || null,
        shipping_address: shipping,
        status: 'paid',
        total_cents: session.amount_total || 0,
        discount_code_id: session.metadata?.discount_code_id ? Number(session.metadata.discount_code_id) : null,
        stripe_payment_intent: session.payment_intent || null,
        stripe_session_id: session.id,
      }

      // Inserisci l'ordine
      const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert(payload)
        .select('id')
        .single()

      if (orderErr) throw orderErr

      // Inserisci le righe
      const rows = li.data.map((row) => ({
        order_id: order.id,
        product_id: null,
        title: row.description,
        quantity: row.quantity || 1,
        price_cents: row.amount_subtotal && row.quantity ? Math.round(row.amount_subtotal / row.quantity) : 0,
        image_url: null,
      }))

      if (rows.length) {
        const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(rows)
        if (itemsErr) throw itemsErr
      }
    }

    res.json({ received: true })
  } catch (e) {
    console.error('Webhook handler error', e)
    res.status(500).json({ error: e.message })
  }
})

// -----------------------------
// Ritorna ordine per session id (per la pagina Success)
// -----------------------------
router.get('/orders/by-session/:id', async (req, res) => {
  const { id } = req.params
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id, created_at, total_cents, customer_email, customer_name,
        shipping_address, status, stripe_payment_intent, stripe_session_id,
        discount_code_id,
        order_items (product_id, title, quantity, price_cents, image_url)
      `)
      .eq('stripe_session_id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'not-found' })
    return res.json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

export default router
