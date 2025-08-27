import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  if (method === "GET") {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("id", { ascending: false });
    return error ? res.status(500).json({ error }) : res.status(200).json(data);
  }
  if (method === "POST") {
    const { user_id, items, total } = req.body;
    // imposta id che parte da 456
    const { data: last } = await supabase.from("orders").select("id").order("id", { ascending: false }).limit(1).single();
    const nextId = last ? last.id + 1 : 456;
    const { data, error } = await supabase.from("orders").insert([{ id: nextId, user_id, total }]);
    if (error) return res.status(500).json({ error });
    // inserisci items
    await Promise.all(
      items.map((it: any) =>
        supabase.from("order_items").insert([{ order_id: nextId, product_id: it.id, quantity: it.qty, price: it.price }])
      )
    );
    return res.status(201).json({ orderId: nextId });
  }
  res.setHeader("Allow", ["GET","POST"]);
  res.status(405).end(`Method ${method} Not Allowed`);
}
