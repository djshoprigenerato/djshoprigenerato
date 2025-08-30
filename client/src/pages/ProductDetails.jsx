import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { addToCart } from "../store/cartStore";

export default function ProductDetails() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/shop/products/${id}`);
        if (alive) setP(data);
      } catch (e) {
        if (alive) setErr(e?.response?.data?.error || e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false };
  }, [id]);

  if (loading) return (
    <div className="container"><div className="card">Caricamento…</div></div>
  );

  if (err) return (
    <div className="container"><div className="card">Errore: {String(err)}</div></div>
  );

  if (!p) return (
    <div className="container"><div className="card">Prodotto non trovato.</div></div>
  );

  const images = Array.isArray(p.product_images) ? p.product_images : [];
  const main = images[0]?.url || "/placeholder.png";
  const thumbs = images.slice(1);
  const priceEUR = ((p.price_eur ?? (p.price_cents / 100)) || 0).toFixed(2);

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 12 }}>
        <Link to="/prodotti" className="btn ghost">← Torna ai prodotti</Link>
      </div>

      <div className="card" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <div>
          <img src={main} alt={p.title} className="product-img" />
          {!!thumbs.length && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {thumbs.map(t => (
                <img
                  key={t.id}
                  src={t.url}
                  alt=""
                  style={{
                    width: 110, height: 82, objectFit: "cover",
                    borderRadius: 10, border: "1px solid var(--line)"
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 style={{ margin: 0 }}>{p.title}</h2>
          <div className="price" style={{ fontSize: 22 }}>{priceEUR}€</div>
          <div style={{ margin: "10px 0", opacity: .9, whiteSpace: "pre-line" }}>
            {p.description || "—"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              onClick={() => {
                addToCart(p, 1);
                window.dispatchEvent(new CustomEvent('toast', { detail: 'Aggiunto nel carrello' }));
              }}
            >
              Aggiungi al carrello
            </button>
            <Link className="btn ghost" to="/carrello">Vai al carrello</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
