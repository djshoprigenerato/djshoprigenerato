// client/src/pages/ProductDetails.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { addToCart } from "../store/cartStore";

export default function ProductDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        // 1) endpoint REST pulito: /api/shop/products/:id
        const a = await axios.get(`/api/shop/products/${id}`);
        if (alive && a?.data?.id) {
          setP(normalize(a.data));
          setLoading(false);
          return;
        }
      } catch (e) {
        // continua: tentiamo il fallback
      }

      try {
        // 2) fallback legacy: /api/shop/products?id=…
        const b = await axios.get(`/api/shop/products`, { params: { id } });
        const item = Array.isArray(b?.data) ? b.data[0] : null;
        if (alive && item?.id) {
          setP(normalize(item));
          setLoading(false);
          return;
        }
        if (alive) {
          setErr("Prodotto non trovato.");
          setLoading(false);
        }
      } catch (e2) {
        if (alive) {
          setErr(e2?.response?.data?.error || "Errore nel caricamento.");
          setLoading(false);
        }
      }
    }

    load();
    return () => { alive = false; };
  }, [id]);

  function normalize(item) {
    return {
      id: item.id,
      title: item.title || "",
      description: item.description || "",
      price_cents: Number(item.price_cents) || 0,
      images: Array.isArray(item.product_images) ? item.product_images : [],
    };
  }

  const add = () => {
    addToCart({
      id: p.id,
      title: p.title,
      price_cents: p.price_cents,
      product_images: p.images
    });
    alert("Aggiunto al carrello");
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">Caricamento…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container">
        <div className="card">
          <p style={{ color: '#ff8c1a' }}>{err}</p>
          <button className="btn ghost" onClick={() => nav(-1)}>← Torna indietro</button>
        </div>
      </div>
    );
  }

  if (!p) return null;

  const priceEUR = (p.price_cents / 100).toFixed(2);

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 12 }}>
        <button className="btn ghost" onClick={() => nav(-1)}>← Torna ai prodotti</button>
      </div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* Gallery */}
        <div>
          {p.images?.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <img
                src={p.images[0].url}
                alt={p.title}
                className="product-img"
                style={{ width: '100%', borderRadius: 12 }}
              />
              {p.images.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: 8 }}>
                  {p.images.slice(1).map(img => (
                    <img key={img.id} src={img.url} alt="" className="product-img" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="badge">Nessuna immagine</div>
          )}
        </div>

        {/* Info */}
        <div>
          <h2 style={{ marginTop: 0 }}>{p.title}</h2>
          <h3 className="price" style={{ marginTop: 0 }}>{priceEUR}€</h3>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {p.description || "—"}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn" onClick={add}>Aggiungi al carrello</button>
            <Link to="/carrello" className="btn ghost">Vai al carrello</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
