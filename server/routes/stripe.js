// server/routes/stripe.js
import express from 'express'
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase.js'

const router = express.Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
})

const BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000'

// ---------- CREATE CHECKOUT SESSION ----------
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cart = [], customer, discount } = req.body

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Carrello vuoto' })
    }

    // Line items in Stripe (in centesimi)
    const line_items = cart.map(i => ({
      quantity: i.qty || 1,
      price_data: {
        currency: 'eur',
        product_data: { name: i.title || `#${i.id}`, images: i.image_url ? [i.image_url] : [] },
        unit_amount: Number(i.price_cents) // SEMPRE cent
      }
    }))

    // Se esiste uno sconto, creiamo un coupon Stripe “una tantum”
    let discounts = []
    if (discount?.percent_off) {
      const coupon = await stripe.coupons.create({
        percent_off: Number(discount.percent_off),
        duration: 'once',
        name: discount.code
      })
      discounts = [{ coupon: coupon.id }]
    } else if (discount?.amount_off_cents) {
      const coupon = await stripe.coupons.create({
        amount_off: Number(discount.amount_off_cents),
        currency: 'eur',
        duration: 'once',
        name: discount.code
      })
      discounts = [{ coupon: coupon.id }]
    }

    // Metadati per il webhook
    const metadata = {
      user_id: customer?.user_id || '',
      discount_code_id: discount?.id ? String(discount.id) : '',
      cart_json: JSON.stringify(cart.slice(0, 50)) // limite difensivo
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel`,
      line_items,
      discounts,
      customer_email: customer?.email || undefined,
      metadata,
      shipping_address_collection: { allowed_countries: ['IT','FR','ES','DE','AT','BE','NL'] },
    })

    return res.json({ url: session.url })
  } catch (e) {
    console.error('create-checkout-session error:', e)
    res.status(500).json({ error: e.message })
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
          metadata
        } = session

        // Ricostruisci il carrello dai metadata (affidabile per i nostri id)
        let cart = []
        try {
          cart = JSON.parse(metadata?.cart_json || '[]')
        } catch {}

        // Inserisci ORDINE
        const orderPayload = {
          user_id: metadata?.user_id || null,
          customer_email: customer_details?.email || null,
          customer_name: customer_details?.name || null,
          shipping_address: customer_details?.address || null, // jsonb
          status: 'paid',
          total_cents: amount_total || 0,
          discount_code_id: metadata?.discount_code_id ? Number(metadata.discount_code_id) : null,
          stripe_payment_intent_id: typeof payment_intent === 'string' ? payment_intent : (payment_intent?.id || null),
          stripe_session_id,
        }

        const { data: order, error: orderErr } = await supabaseAdmin
          .from('orders')
          .insert(orderPayload)
          .select('id')
          .single()

        if (orderErr) throw orderErr

        // Inserisci RIGHE ORDINE
        const itemsPayload = cart.map(i => ({
          order_id: order.id,
          product_id: i.id,
          title: i.title || '',
          quantity: i.qty || 1,
          price_cents: Number(i.price_cents) || 0,
          image_url: i.image_url || (i.product_images?.[0]?.url || '')
        }))

        if (itemsPayload.length) {
          const { error: itemsErr } = await supabaseAdmin
            .from('order_items')
            .insert(itemsPayload)
          if (itemsErr) throw itemsErr
        }

        console.log('✅ Ordine creato:', order.id, 'da session:', stripe_session_id)
      }

      // Importante: sempre 200 OK o Stripe riprova
      res.json({ received: true })
    } catch (e) {
      console.error('Webhook handling error:', e)
      res.status(200).json({ received: true }) // non far fallire per evitare tempeste di retry
    }
  }
)

export default router
