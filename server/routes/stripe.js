import express from 'express'
import Stripe from 'stripe'
import bodyParser from 'body-parser'
import { supabaseAdmin } from '../supabase.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Crea checkout session
router.post('/create-checkout-session', express.json(), async (req,res) => {
  try {
    const { cart, customer, discount } = req.body
    let total_cents = 0
    const line_items = cart.map(item => {
      let unit = item.price_cents
      if (discount) {
        if (discount.percent_off) {
          unit = Math.max(0, Math.round(unit * (100 - discount.percent_off) / 100))
        } else if (discount.amount_off_cents) {
          unit = Math.max(0, unit - discount.amount_off_cents)
        }
      }
      total_cents += unit * item.qty
      return {
        price_data: {
          currency: 'eur',
          product_data: { name: item.title, images: [item.image_url || ''] },
          unit_amount: unit
        },
        quantity: item.qty
      }
    })

    // ordine pending
    const { data: order, error: oe } = await supabaseAdmin.from('orders').insert([{
      user_id: customer.user_id || null,
      customer_email: customer.email || null,
      customer_name: customer.name || null,
      shipping_address: customer.shipping || null,
      status: 'pending',
      total_cents: total_cents,
      discount_code_id: discount?.id || null
    }]).select().single()
    if (oe) throw oe

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.SITE_URL}/checkout-success?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/checkout-cancelled`,
      metadata: { order_id: String(order.id) }
    })

    await supabaseAdmin.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id)
    res.json({ id: session.id, url: session.url })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Webhook Stripe (raw body)
router.post('/stripe-webhook', bodyParser.raw({ type: 'application/json' }), async (req,res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const orderId = session.metadata?.order_id
    try {
      // Aggiorna ordine a paid
      await supabaseAdmin.from('orders').update({
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent
      }).eq('id', orderId)

      // (opzionale) salva items da Stripe
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })
      if (lineItems?.data?.length) {
        const rows = lineItems.data.map(li => ({
          order_id: orderId,
          product_id: null,
          title: li.description,
          quantity: li.quantity,
          price_cents: li.amount_subtotal / (li.quantity || 1),
          image_url: (li.price?.product?.images?.[0]) || null
        }))
        await supabaseAdmin.from('order_items').insert(rows)
      }
    } catch (e) {
      console.error('Errore persistenza webhook:', e)
    }
  }

  res.json({ received: true })
})

export default router
