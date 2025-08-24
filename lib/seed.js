import { query } from './db.js';

async function run() {
  const cats = [
    ['Mixer', 'mixer', 'Mixer DJ rigenerati e testati'],
    ['Giradischi', 'giradischi', 'Giradischi rigenerati e calibrati'],
    ['Casse', 'casse', 'Diffusori e monitor rigenerati']
  ];
  for (const c of cats) {
    try { await query('insert into categories(name,slug,description) values($1,$2,$3)', c); } catch {}
  }
  const rows = await query('select id, slug from categories');
  const bySlug = Object.fromEntries(rows.rows.map(r=>[r.slug, r.id]));
  const products = [
    [bySlug['mixer'], 'Pioneer DJM-450 (Rigenerato)', 'pioneer-djm-450-rigenerato', 'Mixer rigenerato con garanzia. Test audio completo, potenziometri puliti.', 49900, '', '', true],
    [bySlug['giradischi'], 'Technics SL-1200 MK2 (Rigenerato)', 'technics-sl-1200-mk2-rigenerato', 'Giradischi rigenerato, braccio allineato, pitch tarato.', 79900, '', '', true],
    [bySlug['casse'], 'Cassa Attiva 12" (Rigenerata)', 'cassa-attiva-12-rigenerata', 'Woofer e driver ricondizionati, cabinet sanificato.', 25900, '', '', true]
  ];
  for (const p of products) {
    try { await query('insert into products(category_id,title,slug,description,price_cents,image,video_url,is_active) values($1,$2,$3,$4,$5,$6,$7,$8)', p); } catch {}
  }
  console.log('Seed done.');
}
run().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
