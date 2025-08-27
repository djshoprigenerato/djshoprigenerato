import { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "../../lib/stripeClient";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { items, couponCode, orderId } = req.body;

  // retrieve coupon from Supabase
  let discount = 0;
  if (couponCode) {
    const { data: coupons } = await supabase.from("coupons").select("discount").eq("code", couponCode).single();
    discount = coupons?.discount || 0;
  }

  const line_items = items.map((it: any) => ({
    price_data: {
      currency: "eur",
      product_data: { name: it.name },
      unit_amount: Math.round(it.price * 100)
    },
    quantity: it.qty
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    discounts: discount
      ? [{ coupon: await stripe.coupons.create({ percent_off: discount, duration: "once" }).then(c=>c.id) }]
      : [],
    mode: "payment",
    success_url: `${req.headers.origin}/checkout?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
    cancel_url: `${req.headers.origin}/cart`
  });

  return res.status(200).json({ url: session.url });
}
