import express from 'express'
import Stripe from 'stripe'
import bodyParser from 'body-parser'
import { supabaseAdmin } from '../supabase.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Endpoint webhook
router.post('/stripe-webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
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
    try {
      // Inserisci ordine in Supabase con service role
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'paid' })
        .eq('stripe_session_id', session.id)
      if (error) console.error("Errore salvataggio ordine:", error.message)
      else console.log("Ordine aggiornato come 'paid'", data)
    } catch (e) {
      console.error("Errore gestione webhook:", e)
    }
  }

  res.json({ received: true })
})

export default router
