import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  if (method === "GET") {
    const { data, error } = await supabase.from("coupons").select("*");
    return error ? res.status(500).json({ error }) : res.status(200).json(data);
  }
  if (method === "POST") {
    const { code, discount, expires_at } = req.body;
    const { data, error } = await supabase.from("coupons").insert([{ code, discount, expires_at }]);
    return error ? res.status(500).json({ error }) : res.status(201).json(data);
  }
  res.setHeader("Allow", ["GET","POST"]);
  res.status(405).end(`Method ${method} Not Allowed`);
}
