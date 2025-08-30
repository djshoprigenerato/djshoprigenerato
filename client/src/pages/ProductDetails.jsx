import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { addToCart } from "../store/cartStore";

export default function ProductDetails(){
  const { id } = useParams();
  const [p, setP] = useState(null);
  const nav = useNavigate();

  useEffect(()=>{
    let mounted = true;
    (async()=>{
      try {
        const { data } = await axios.get('/api/shop/products', { params: { q: '', category_id: '', id } });
        const prod = Array.isArray(data) ? data.find(i => String(i.id) === String(id)) : data;
        if (mounted) setP(prod || null);
      } catch { if (mounted) setP(null); }
    })();
    return () => { mounted = false; }
  }, [id]);

  if (!p) {
    return (
      <div className="container">
        <div className="card">
          <Link to="/prodotti" className="btn ghost">← Torna ai prodotti</Link>
          <p style={{marginTop:12}}>Prodotto non trovato.</p>
        </div>
      </div>
    );
  }

  const images = Array.isArray(p.product_images) && p.product_images.length ? p.product_images : [{url:'/placeholder.png'}];
  const priceEur = (Number(p.price_cents||0) / 100).toFixed(2);

  return (
    <div className="container">
      <div className="card" style={{marginBottom:12}}>
        <Link to="/prodotti" className="btn ghost">← Torna ai prodotti</Link>
      </div>
      <div className="card" style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16}}>
        <div>
          <div style={{display:'grid', gap:10}}>
            <img src={images[0]?.url} alt={p.title} className="product-img" />
            {images.length > 1 && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(80px,1fr))', gap:8}}>
                {images.slice(1).map((im, idx)=>(
                  <img key={idx} src={im.url} alt="" style={{width:'100%', aspectRatio:'1/1', objectFit:'cover', borderRadius:8, border:'1px solid var(--line)'}} />
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <h2>{p.title}</h2>
          <h3 className="price">{priceEur}€</h3>
          <p style={{whiteSpace:'pre-wrap'}}>{p.description || '-'}</p>
          <div style={{display:'flex', gap:8, marginTop:12}}>
            <button className="btn" onClick={()=> addToCart({ id:p.id, title:p.title, price_cents:p.price_cents, product_images:p.product_images, qty:1 })}>Aggiungi al carrello</button>
            <button className="btn ghost" onClick={()=> nav('/carrello')}>Vai al carrello</button>
          </div>
        </div>
      </div>
    </div>
  );
}