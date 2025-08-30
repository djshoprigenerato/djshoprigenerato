import express from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET || process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Parse RAW body ONLY for this route (needed by Stripe)
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Retrieve full session with line items
      const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] });

      // Parse metadata cart
      let cart = [];
      try { cart = JSON.parse(full?.metadata?.cart || '[]'); } catch (_) { cart = []; }

      // Insert order
      const orderPayload = {
        user_id: full?.metadata?.user_id || null,
        customer_email: full.customer_details?.email || full.customer_email || null,
        customer_name: full.customer_details?.name || null,
        shipping_address: full.customer_details?.address || null,
        status: 'paid',
        total_cents: full.amount_total || 0,
        discount_code_id: full?.metadata?.discount_code_id ? Number(full.metadata.discount_code_id) : null,
        stripe_payment_intent_id: full.payment_intent || null,
        stripe_session_id: full.id,
      };
      const { data: order, error: orderErr } = await supabaseAdmin.from('orders').insert(orderPayload).select().single();
      if (orderErr) throw orderErr;

      // Insert items
      if (Array.isArray(cart) && cart.length) {
        const items = cart.map(i => ({
          order_id: order.id,
          product_id: i.id,
          title: i.title,
          quantity: Number(i.qty) || 1,
          price_cents: Number(i.price_cents) || 0,
          image_url: i.image_url || ''
        }));
        const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(items);
        if (itemsErr) throw itemsErr;
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook handling error', e);
    res.status(500).json({ error: e.message });
  }
});

// JSON for everything else
router.use(express.json());

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cart = [], customer = {}, discount = null } = req.body;
    if (!Array.isArray(cart) || !cart.length) {
      return res.status(400).json({ error: 'Carrello vuoto' });
    }

    const origin = process.env.FRONTEND_ORIGIN || `${req.protocol}://${req.get('host')}`;

    const line_items = cart.map(i => ({
      quantity: Number(i.qty) || 1,
      price_data: {
        currency: 'eur',
        unit_amount: Number(i.price_cents) || 0,
        product_data: {
          name: i.title,
          images: i.image_url ? [i.image_url] : []
        }
      }
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        cart: JSON.stringify(cart.slice(0, 25)), // keep it reasonable in size
        user_id: customer?.user_id || '',
        discount_code_id: discount?.id ? String(discount.id) : ''
      },
      customer_email: customer?.email || undefined
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Error creating checkout session', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
