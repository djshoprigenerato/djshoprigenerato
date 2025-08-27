import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  if (method === "GET") {
    const { data, error } = await supabase.from("products").select("*");
    return error ? res.status(500).json({ error }) : res.status(200).json(data);
  }
  if (method === "POST") {
    const { name, price, category_id, image_url } = req.body;
    const { data, error } = await supabase.from("products").insert([{ name, price, category_id, image_url }]);
    return error ? res.status(500).json({ error }) : res.status(201).json(data);
  }
  if (method === "PUT") {
    const { id, ...fields } = req.body;
    const { data, error } = await supabase.from("products").update(fields).eq("id", id);
    return error ? res.status(500).json({ error }) : res.status(200).json(data);
  }
  if (method === "DELETE") {
    const { id } = req.query;
    // prima elimini l'immagine dallo storage
    const { data: prod } = await supabase.from("products").select("image_url").eq("id", id).single();
    if (prod?.image_url) {
      await supabase.storage.from("images").remove([prod.image_url]);
    }
    const { error } = await supabase.from("products").delete().eq("id", id);
    return error ? res.status(500).json({ error }) : res.status(204).end();
  }
  res.setHeader("Allow", ["GET","POST","PUT","DELETE"]);
  res.status(405).end(`Method ${method} Not Allowed`);
}
