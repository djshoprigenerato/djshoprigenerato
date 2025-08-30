// server/routes/stripe.js
import express from "express";
import Stripe from "stripe";
import { supabaseAdmin } from "../supabase.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Questo router è montato PRIMA del body parser globale.
// Attivo express.json SOLO per le route NON webhook.
router.use((req, res, next) => {
  if (req.originalUrl === "/webhooks/stripe") return next();
  return express.json()(req, res, next);
});

/**
 * Utility: calcola l'URL assoluto del frontend (production + dev).
 * FRONTEND_URL può essere definita su Render (consigliato).
 */
function getFrontendBase(req) {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/+$/, "");
  const proto = (req.headers["x-forwarded-proto"] || "https");
  const host = req.headers.host;
  return `${proto}://${host}`;
}

/**
 * Crea la checkout session.
 * Body atteso: { cart:[{id,title,qty,price_cents,image_url}], customer:{...}, discount?:{id,percent_off,amount_off_cents} }
 */
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { cart = [], customer = {}, discount = null } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Carrello vuoto" });
    }

    const line_items = cart.map((i) => ({
      quantity: Number(i.qty) || 1,
      price_data: {
        currency: "eur",
        unit_amount: Number(i.price_cents), // importo pieno
        product_data: {
          name: i.title || `Prodotto #${i.id}`,
          metadata: { product_id: String(i.id) }
        }
      }
    }));

    // Applico lo sconto IN STRIPE (così il totale corrisponde anche lì).
    // Creo un coupon "usa-e-getta" e lo attacco alla sessione.
    let discounts = [];
    if (discount && (discount.percent_off || discount.amount_off_cents)) {
      const couponPayload = { duration: "once" };
      if (discount.percent_off) couponPayload.percent_off = Number(discount.percent_off);
      if (discount.amount_off_cents) {
        couponPayload.amount_off = Number(discount.amount_off_cents);
        couponPayload.currency = "eur";
      }
      const coupon = await stripe.coupons.create(couponPayload);
      discounts = [{ coupon: coupon.id }];
    }

    const base = getFrontendBase(req);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customer.email || undefined,
      line_items,
      discounts,
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cancel`,
      metadata: {
        user_id: customer.user_id || "",
        discount_code_id: discount?.id ? String(discount.id) : "",
        cart: JSON.stringify(cart.slice(0, 100)) // salvo il carrello per il webhook
      }
    });

    return res.json({ url: session.url });
  } catch (e) {
    console.error("create-checkout-session error:", e);
    return res.status(500).json({ error: e.message || "Errore Stripe" });
  }
});

/**
 * Webhook Stripe (RAW body!).
 * Su evento "checkout.session.completed" salva orders + order_items.
 */
router.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;
    try {
      const sig = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("⚠️  Webhook signature verification failed.", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      try {
        const session = event.data.object;

        const user_id =
          (session.metadata && session.metadata.user_id) || null;
        const discount_code_id =
          session.metadata?.discount_code_id
            ? Number(session.metadata.discount_code_id)
            : null;

        let cart = [];
        try {
          cart = JSON.parse(session.metadata?.cart || "[]");
        } catch {
          cart = [];
        }

        const { data: order, error } = await supabaseAdmin
          .from("orders")
          .insert({
            user_id,
            customer_email:
              session.customer_details?.email || session.customer_email || null,
            customer_name: session.customer_details?.name || null,
            shipping_address: session.customer_details?.address || null,
            status: "paid",
            total_cents: session.amount_total || null,
            discount_code_id,
            stripe_payment_intent_id: session.payment_intent || null,
            stripe_session_id: session.id
          })
          .select()
          .single();

        if (error) throw error;

        // Inserisco le righe
        if (order && Array.isArray(cart)) {
          const rows = cart.map((i) => ({
            order_id: order.id,
            product_id: i.id,
            title: i.title || "",
            quantity: Number(i.qty) || 1,
            price_cents: Number(i.price_cents) || 0,
            image_url: i.image_url || (i.product_images?.[0]?.url || null)
          }));
          const { error: itemsErr } = await supabaseAdmin
            .from("order_items")
            .insert(rows);
          if (itemsErr) throw itemsErr;
        }
      } catch (e) {
        console.error("Webhook handling error:", e);
        // Non ritentiamo: ma logghiamo per diagnosi
      }
    }

    return res.json({ received: true });
  }
);

/**
 * Restituisce l'ordine (con items) partendo dalla session_id Stripe.
 * Usata dalla SuccessPage per mostrare/stampare il riepilogo.
 */
router.get("/orders/by-session", async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "Missing session_id" });
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("stripe_session_id", session_id)
      .maybeSingle();
    if (error) throw error;
    return res.json(data || null);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
