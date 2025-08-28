import express from 'express'
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'

// Webhook: deve usare raw body
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    try {
      // Retrieve line items (if needed) and record order
      const items = session.metadata ? JSON.parse(session.metadata.items || '[]') : []
      const total_cents = session.amount_total || 0

      const orderPayload = {
        user_id: session.metadata?.user_id || null,
        status: 'paid',
        total_cents,
        customer_email: session.customer_details?.email || null,
        customer_name: session.customer_details?.name || null,
        shipping_address: session.customer_details?.address || null
      }
      const { data: order, error } = await supabaseAdmin.from('orders').insert(orderPayload).select().single()
      if (!error && items.length){
        const orderItems = items.map(i => ({
          order_id: order.id,
          product_id: i.id,
          title: i.title,
          quantity: i.qty,
          price_cents: i.price_cents
        }))
        await supabaseAdmin.from('order_items').insert(orderItems)
      }
    } catch (e) {
      console.error('Order persist error:', e.message)
    }
  }

  res.json({ received: true })
})

// Create checkout session
router.post('/create-checkout-session', express.json(), async (req, res) => {
  try {
    const { cart, customer, discount } = req.body
    if (!Array.isArray(cart) || cart.length === 0) return res.status(400).json({ error: 'Empty cart' })

    const line_items = cart.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: { name: item.title, images: item.image_url ? [item.image_url] : [] },
        unit_amount: item.price_cents
      },
      quantity: item.qty
    }))

    let discountParams = {}
    if (discount) {
      if (discount.percent_off) {
        const coupon = await stripe.coupons.create({ percent_off: discount.percent_off, duration: 'once' })
        discountParams.discounts = [{ coupon: coupon.id }]
      } else if (discount.amount_off_cents) {
        const coupon = await stripe.coupons.create({ amount_off: discount.amount_off_cents, currency: 'eur', duration: 'once' })
        discountParams.discounts = [{ coupon: coupon.id }]
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${SITE_URL}/?success=1`,
      cancel_url: `${SITE_URL}/checkout?canceled=1`,
      customer_email: customer?.email || undefined,
      metadata: {
        user_id: customer?.user_id || '',
        items: JSON.stringify(cart.slice(0, 50)) // avoid huge payload
      },
      ...discountParams
    })

    res.json({ url: session.url })
  } catch (e) {
    console.error('Stripe checkout error:', e.message)
    res.status(500).json({ error: 'Stripe error' })
  }
})

export default router
