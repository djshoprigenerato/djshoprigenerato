// server/routes/stripe.js
import express from 'express'
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase.js'

const router = express.Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

// Se impostato, lo usiamo. Altrimenti ricaviamo l'origin dalla request.
function getBaseUrl(req) {
  const envUrl = (process.env.PUBLIC_BASE_URL || '').trim()
  if (envUrl && /^https?:\/\//i.test(envUrl)) return envUrl.replace(/\/+$/,'')
  // X-Forwarded-* è presente su Render/Proxy
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

// ---------- CREATE CHECKOUT SESSION ----------
router.post('/create-checkout-session', express.json(), async (req, res) => {
  try {
    const { cart = [], customer, discount } = req.body || {}

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Carrello vuoto' })
    }

    // Line items (cent)
    const line_items = cart.map((i) => {
      const hasValidImage = i.image_url && /^https?:\/\//i.test(i.image_url)
      return {
        quantity: i.qty || 1,
        price_data: {
          currency: 'eur',
          product_data: {
            name: i.title || `#${i.id}`,
            ...(hasValidImage ? { images: [i.image_url] } : {}),
          },
          unit_amount: Number(i.price_cents),
        },
      }
    })

    // Sconto una tantum su Stripe
    let discounts = []
    if (discount?.percent_off) {
      const coupon = await stripe.coupons.create({
        percent_off: Number(discount.percent_off),
        duration: 'once',
        name: discount.code || 'Sconto',
      })
      discounts = [{ coupon: coupon.id }]
    } else if (discount?.amount_off_cents) {
      const coupon = await stripe.coupons.create({
        amount_off: Number(discount.amount_off_cents),
        currency: 'eur',
        duration: 'once',
        name: discount.code || 'Sconto',
      })
      discounts = [{ coupon: coupon.id }]
    }

    // Metadati per il webhook
    const metadata = {
      user_id: customer?.user_id || '',
      discount_code_id: discount?.id ? String(discount.id) : '',
      cart_json: JSON.stringify(cart.slice(0, 50)),
    }

    const BASE_URL = getBaseUrl(req)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel`,
      line_items,
      discounts,
      customer_email: customer?.email || undefined,
      metadata,
      shipping_address_collection: {
        allowed_countries: ['IT', 'FR', 'ES', 'DE', 'AT', 'BE', 'NL'],
      },
    })

    return res.json({ url: session.url })
  } catch (e) {
    console.error('create-checkout-session error:', e?.raw || e)
    return res.status(400).json({ error: e?.raw?.message || e?.message || 'Errore' })
  }
})

// ---------- WEBHOOK ----------
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    let event
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err?.message)
      return res.status(400).send(`Bad signature: ${err.message}`)
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = await stripe.checkout.sessions.retrieve(
          event.data.object.id,
          { expand: ['line_items', 'customer_details'] }
        )

        const {
          id: stripe_session_id,
          payment_intent,
          amount_total,
          customer_details,
          metadata,
        } = session

        let cart = []
        try { cart = JSON.parse(metadata?.cart_json || '[]') } catch {}

        // ORDINE
        const orderPayload = {
          user_id: metadata?.user_id || null,
          customer_email: customer_details?.email || null,
          customer_name: customer_details?.name || null,
          shipping_address: customer_details?.address || null,
          status: 'paid',
          total_cents: amount_total || 0,
          discount_code_id: metadata?.discount_code_id ? Number(metadata.discount_code_id) : null,
          stripe_payment_intent_id:
            typeof payment_intent === 'string' ? payment_intent : payment_intent?.id || null,
          stripe_session_id,
        }

        const { data: order, error: orderErr } = await supabaseAdmin
          .from('orders')
          .insert(orderPayload)
          .select('id')
          .single()

        if (orderErr) throw orderErr

        // RIGHE ORDINE
        const itemsPayload = cart.map((i) => ({
          order_id: order.id,
          product_id: i.id,
          title: i.title || '',
          quantity: i.qty || 1,
          price_cents: Number(i.price_cents) || 0,
          image_url: i.image_url || i.product_images?.[0]?.url || '',
        }))

        if (itemsPayload.length) {
          const { error: itemsErr } = await supabaseAdmin
            .from('order_items')
            .insert(itemsPayload)
          if (itemsErr) throw itemsErr
        }

        console.log('✅ Ordine creato:', order.id, 'session:', stripe_session_id)
      }

      res.json({ received: true })
    } catch (e) {
      console.error('Webhook handling error:', e)
      // Manteniamo 200 per evitare retry loop
      res.json({ received: true })
    }
  }
)

export default router
