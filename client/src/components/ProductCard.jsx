// client/src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import { addToCart } from "../store/cartStore";

export default function ProductCard({ p }) {
  // prezzo in centesimi sempre consistente
  const price_cents =
    Number(p?.price_cents) ||
    (Number(p?.price_eur) ? Math.round(Number(p.price_eur) * 100) : 0);

  const priceEUR = (price_cents / 100).toFixed(2);

  const img = p?.product_images?.[0]?.url || "/placeholder.png";
  const title = p?.title || "—";

  const handleAdd = () => {
    // payload che il carrello si aspetta
    addToCart(
      {
        id: p.id,
        title,
        price_cents,
        product_images: Array.isArray(p?.product_images) ? p.product_images : [],
      },
      1
    );
    // toast globale
    window.dispatchEvent(
      new CustomEvent("toast", { detail: "Aggiunto nel carrello" })
    );
  };

  return (
    <div className="card product-card">
      <img className="product-img" src={img} alt={title} />
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div className="price">{priceEUR}€</div>

      <div style={{ display: "flex", gap: 8 }}>
        <Link className="btn ghost" to={`/prodotti/${p.id}`}>
          Dettagli
        </Link>
        <button className="btn" onClick={handleAdd}>
          Aggiungi
        </button>
      </div>
    </div>
  );
}
