import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  if (method === "GET") {
    const { data, error } = await supabase.from("categories").select("*");
    return error ? res.status(500).json({ error }) : res.status(200).json(data);
  }
  if (method === "POST") {
    const { name } = req.body;
    const { data, error } = await supabase.from("categories").insert([{ name }]);
    return error ? res.status(500).json({ error }) : res.status(201).json(data);
  }
  if (method === "PUT") {
    const { id, name } = req.body;
    const { data, error } = await supabase.from("categories").update({ name }).eq("id", id);
    return error ? res.status(500).json({ error }) : res.status(200).json(data);
  }
  if (method === "DELETE") {
    const { id } = req.query;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    return error ? res.status(500).json({ error }) : res.status(204).end();
  }
  res.setHeader("Allow", ["GET","POST","PUT","DELETE"]);
  res.status(405).end(`Method ${method} Not Allowed`);
}
