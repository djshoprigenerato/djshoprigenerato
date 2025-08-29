// server/routes/stripe.js
import express from 'express'
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase.js'

const router = express.Router()

// --- STRIPE SETUP ---
const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  console.warn('[stripe] STRIPE_SECRET_KEY non impostata')
}
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2023-10-16'
})

// URL pubblica del sito (es. https://www.djshoprigenerato.eu)
const SITE_URL = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || 'http://localhost:3000'

// =======================
//   CREATE CHECKOUT
// =======================
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cart, customer, discount } = req.body

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Carrello vuoto o non valido' })
    }

    // Line items: prezzi SEMPRE in centesimi (EUR)
    const line_items = cart.map((i) => {
      const unit = Number(i.price_cents || 0)
      const qty = Number(i.qty || 1)
      return {
        price_data: {
          currency: 'eur',
          unit_amount: unit,
          product_data: {
            name: i.title || `Prodotto #${i.id}`,
            // salvo il nostro product_id dentro i metadata del prodotto Stripe
            metadata: { product_id: String(i.id) },
            images: i.image_url ? [i.image_url] : []
          }
        },
        quantity: qty
      }
    })

    // Se arriva uno sconto valido, creo al volo un coupon ONE-SHOT da applicare alla sessione
    let discounts = undefined
    if (discount?.id || discount?.percent_off || discount?.amount_off_cents) {
      const hasPercent = Number(discount.percent_off) > 0
      const hasAmount  = Number(discount.amount_off_cents) > 0

      if (hasPercent || hasAmount) {
        const coupon = await stripe.coupons.create({
          duration: 'once',
          ...(hasPercent ? { percent_off: Number(discount.percent_off) } : {}),
          ...(hasAmount  ? { amount_off: Number(discount.amount_off_cents), currency: 'eur' } : {})
        })
        discounts = [{ coupon: coupon.id }]
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      discounts,
      // Puoi anche abilitare address collection se vuoi:
      // shipping_address_collection: { allowed_countries: ['IT'] },
      customer_email: customer?.email || undefined,
      client_reference_id: customer?.user_id || undefined,
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/checkout?canceled=1`,
      // Metadati essenziali (limite Stripe ~500 chars; evito il carrello completo)
      metadata: {
        user_id: customer?.user_id || '',
        discount_code_id: discount?.id ? String(discount.id) : '',
        discount_percent_off: discount?.percent_off ? String(discount.percent_off) : '',
        discount_amount_off_cents: discount?.amount_off_cents ? String(discount.amount_off_cents) : ''
      }
    })

    res.json({ url: session.url })
  } catch (e) {
    console.error('[stripe] create-checkout-session error:', e)
    res.status(500).json({ error: 'Errore creazione sessione di pagamento' })
  }
})

// =======================
//        WEBHOOK
// =======================
// Serve raw body SOLO qui, non altrove!
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!whSecret) {
      console.warn('[stripe] STRIPE_WEBHOOK_SECRET non impostata')
      return res.sendStatus(500)
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, whSecret)
    } catch (err) {
      console.error('[stripe] webhook signature error:', err?.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Gestione eventi
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object

        // espando le line_items per ricavare quantità e metadata dei prodotti
        const full = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items.data.price.product']
        })

        const user_id = full.client_reference_id || full.metadata?.user_id || null
        const customer_email = full.customer_details?.email || session.customer_email || null
        const customer_name = full.customer_details?.name || null
        const shipping_address = full.customer_details?.address || null

        const discount_code_id = full.metadata?.discount_code_id
          ? Number(full.metadata.discount_code_id)
          : null

        const total_cents = Number(full.amount_total || 0)
        const payment_intent = typeof full.payment_intent === 'string'
          ? full.payment_intent
          : full.payment_intent?.id

        // 1) Inserisco l’ordine
        const { data: orderIns, error: orderErr } = await supabaseAdmin
          .from('orders')
          .insert({
            user_id,
            customer_email,
            customer_name,
            shipping_address,
            status: 'paid',
            total_cents,
            discount_code_id: discount_code_id || null,
            stripe_payment_intent: payment_intent || null,
            stripe_session_id: full.id
          })
          .select('id')
          .single()

        if (orderErr) throw orderErr
        const orderId = orderIns.id

        // 2) Inserisco le righe
        const itemsPayload = (full.line_items?.data || []).map((li) => {
          // prendo il nostro product_id dai metadata del prodotto Stripe
          const meta = li.price?.product?.metadata || {}
          const ourProductId = meta.product_id ? Number(meta.product_id) : null
          return {
            order_id: orderId,
            product_id: ourProductId,
            title: li.description || li.price?.product?.name || 'Prodotto',
            quantity: Number(li.quantity || 1),
            price_cents: Number(li.amount_subtotal || 0) / Number(li.quantity || 1), // unit
            image_url: (li.price?.product?.images || [])[0] || null
          }
        })

        if (itemsPayload.length) {
          const { error: itemsErr } = await supabaseAdmin
            .from('order_items')
            .insert(itemsPayload)
          if (itemsErr) throw itemsErr
        }

        // tutto ok
        return res.json({ received: true })
      }

      // altri eventi utili (opzionale)
      if (event.type === 'checkout.session.async_payment_failed' ||
          event.type === 'checkout.session.expired') {
        // potresti marcare eventuali ordini "pending" come failed/expired, se li crei prima
      }

      res.json({ received: true })
    } catch (err) {
      console.error('[stripe] webhook handler error:', err)
      res.status(500).send('Webhook handler failed')
    }
  }
)

export default router
