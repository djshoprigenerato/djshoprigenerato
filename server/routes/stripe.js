// server/routes/stripe.js
import express from 'express'
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// ---------- Utility ----------
function originFromReq(req) {
  return process.env.PUBLIC_SITE_URL?.replace(/\/+$/, '') || `${req.protocol}://${req.get('host')}`
}

/**
 * Applica lo sconto al carrello lato server.
 * - cart: [{ id, title, qty, price_cents, image_url }]
 * - discount: { percent_off? , amount_off_cents? }
 * Ritorna un array di line_items pronto per Stripe (price_data con unit_amount scontati).
 */
function buildDiscountedLineItems(cart = [], discount = null) {
  // Normalizza numeri
  const items = cart.map(i => ({
    id: i.id,
    title: i.title,
    qty: Math.max(1, Number(i.qty || 1)),
    price_cents: Math.max(0, Number(i.price_cents || 0)),
    image_url: i.image_url || ''
  }))

  if (!discount) {
    // Nessuno sconto → importi originali
    return items.map(i => ({
      quantity: i.qty,
      price_data: {
        currency: 'eur',
        unit_amount: i.price_cents,
        product_data: {
          name: i.title,
          images: i.image_url ? [i.image_url] : []
        }
      }
    }))
  }

  // Calcola totali originali
  const lineTotals = items.map(i => i.price_cents * i.qty)
  const grandTotal = lineTotals.reduce((a, b) => a + b, 0)

  if (grandTotal <= 0) {
    // Tutto a zero, non servono pro-rata
    return items.map(i => ({
      quantity: i.qty,
      price_data: {
        currency: 'eur',
        unit_amount: 0,
        product_data: { name: i.title, images: i.image_url ? [i.image_url] : [] }
      }
    }))
  }

  // Caso 1: percentuale
  if (discount.percent_off) {
    const p = Math.min(100, Math.max(0, Number(discount.percent_off)))
    const factor = (100 - p) / 100
    return items.map(i => ({
      quantity: i.qty,
      price_data: {
        currency: 'eur',
        unit_amount: Math.max(1, Math.round(i.price_cents * factor)), // almeno 1 cent
        product_data: {
          name: i.title,
          images: i.image_url ? [i.image_url] : []
        }
      }
    }))
  }

  // Caso 2: importo fisso (amount_off_cents) → ripartizione pro-rata
  if (discount.amount_off_cents) {
    let amountOff = Math.min(Number(discount.amount_off_cents) || 0, grandTotal)
    if (amountOff <= 0) {
      // Niente da sottrarre
      return items.map(i => ({
        quantity: i.qty,
        price_data: {
          currency: 'eur',
          unit_amount: i.price_cents,
          product_data: { name: i.title, images: i.image_url ? [i.image_url] : [] }
        }
      }))
    }

    // pro-rata per riga
    const shares = lineTotals.map(t => Math.floor((t / grandTotal) * amountOff))
    let used = shares.reduce((a, b) => a + b, 0)
    let remainder = amountOff - used

    // distribuisci il resto 1c alla volta finché rimane
    for (let idx = 0; remainder > 0 && idx < shares.length; idx++) {
      shares[idx] += 1
      remainder -= 1
    }

    return items.map((i, idx) => {
      const lineTotal = lineTotals[idx]
      const discountedLine = Math.max(0, lineTotal - shares[idx])
      // unit_amount = floor(discountedLine / qty) (almeno 1 cent se la riga ha importo > 0)
      const perUnit = i.qty > 0 ? Math.floor(discountedLine / i.qty) : 0
      const unit_amount = discountedLine > 0 ? Math.max(1, perUnit) : 0

      return {
        quantity: i.qty,
        price_data: {
          currency: 'eur',
          unit_amount,
          product_data: {
            name: i.title,
            images: i.image_url ? [i.image_url] : []
          }
        }
      }
    })
  }

  // Nessuna proprietà di sconto valida → ritorna originale
  return items.map(i => ({
    quantity: i.qty,
    price_data: {
      currency: 'eur',
      unit_amount: i.price_cents,
      product_data: { name: i.title, images: i.image_url ? [i.image_url] : [] }
    }
  }))
}

// ---------- Endpoint NON-webhook (usa JSON) ----------
router.use(express.json())

// Crea la Checkout Session con sconto applicato lato server
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cart, customer, discount } = req.body || {}

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Carrello vuoto.' })
    }

    const line_items = buildDiscountedLineItems(cart, discount)

    // URL di ritorno
    const base = originFromReq(req)
    const success_url = `${base}/success?session_id={CHECKOUT_SESSION_ID}`
    const cancel_url = `${base}/cancel`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      success_url,
      cancel_url,
      customer_email: customer?.email || undefined,
      metadata: {
        user_id: customer?.user_id || '',
        discount_code: discount?.code || '',
        percent_off: discount?.percent_off ? String(discount.percent_off) : '',
        amount_off_cents: discount?.amount_off_cents ? String(discount.amount_off_cents) : ''
      },
      shipping_address_collection: { allowed_countries: ['IT', 'SM', 'VA'] }
    })

    return res.json({ url: session.url })
  } catch (e) {
    console.error('Errore create-checkout-session:', e)
    return res.status(500).json({ error: 'Impossibile creare la sessione di pagamento' })
  }
})

// ---------- Webhook (usa RAW) ----------
async function webhookHandler(req, res) {
  const sig = req.headers['stripe-signature']
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!whSecret) return res.status(500).send('Webhook secret non configurata')

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, whSecret)
  } catch (err) {
    console.error('[stripe] firma non valida:', err?.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Recupera i line items pagati (già scontati)
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })

      // Esempio salvataggio ordine (adatta ai tuoi campi/tabella)
      await supabaseAdmin.from('orders').insert({
        user_id: session.metadata?.user_id || null,
        email: session.customer_details?.email || session.customer_email || null,
        status: 'paid',
        total_cents: session.amount_total ?? null,
        discount_code: session.metadata?.discount_code || null,
        stripe_session_id: session.id,
        items: items?.data?.map(li => ({
          description: li.description,
          quantity: li.quantity,
          amount_subtotal: li.amount_subtotal, // cents
          amount_total: li.amount_total,       // cents
        })) || [],
        shipping: {
          name: session.customer_details?.name || '',
          address: session.customer_details?.address || null
        }
      })
    }

    return res.json({ received: true })
  } catch (e) {
    console.error('Errore gestione webhook:', e)
    return res.status(500).send('Errore interno')
  }
}

// Path ufficiale (consigliato)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), webhookHandler)

// (Facoltativo) Alias se su Stripe hai un endpoint diverso, es. /webhooks/stripe
// router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), webhookHandler)

export default router
