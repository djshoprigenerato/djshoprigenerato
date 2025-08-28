// client/src/pages/ProductDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { addToCart } from "../store/cartStore";

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await axios.get(`/api/shop/products`, { params: { id } });
      // Se l'endpoint non prevede ?id, fai una specifica GET /api/shop/products/:id
      const item = Array.isArray(data) ? data.find(x => String(x.id) === String(id)) : data;
      setP(item || null);
    })();
  }, [id]);

  if (!p) {
    return (
      <div className="container">
        <button className="btn ghost" onClick={() => nav(-1)}>← Torna indietro</button>
        <div className="card" style={{ marginTop: 12 }}>Caricamento…</div>
      </div>
    );
  }

  const images = p.product_images?.length ? p.product_images : [{ url: '/placeholder.png' }];
  const priceEUR = ((p.price_eur ?? (p.price_cents / 100)) || 0).toFixed(2);

  return (
    <div className="container">
      <Link className="btn ghost" to="/prodotti">← Torna ai prodotti</Link>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginTop: 12 }}>
        {/* Galleria immagini semplice */}
        <div>
          <div className="card" style={{ background: '#0b0f14' }}>
            <img
              className="product-img"
              style={{ width: '100%', height: 'auto' }}
              src={images[0].url}
              alt={p.title}
            />
          </div>
          {images.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginTop: 8 }}>
              {images.slice(1).map(img => (
                <img key={img.id || img.url} src={img.url} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
              ))}
            </div>
          )}
        </div>

        {/* Dettagli */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{p.title}</h2>
          <div className="price" style={{ fontSize: 20, marginBottom: 8 }}>{priceEUR}€</div>
          <div style={{ whiteSpace: 'pre-wrap', opacity: .9 }}>{p.description || '—'}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => addToCart(p, 1)}>Aggiungi al carrello</button>
            <Link className="btn ghost" to="/carrello">Vai al carrello</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
