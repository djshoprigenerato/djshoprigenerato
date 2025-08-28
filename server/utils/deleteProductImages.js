import { supabaseAdmin } from '../supabase.js';

export async function deleteImagesForProduct(productId) {
  const bucket = process.env.UPLOADS_BUCKET || 'uploads';
  const { data: imgs, error } = await supabaseAdmin
    .from('product_images')
    .select('id, path')
    .eq('product_id', productId);
  if (error) throw error;
  if (!imgs || imgs.length === 0) return;
  const paths = imgs.map(i => i.path);
  await supabaseAdmin.storage.from(bucket).remove(paths);
  await supabaseAdmin.from('product_images').delete().in('id', imgs.map(i => i.id));
}
