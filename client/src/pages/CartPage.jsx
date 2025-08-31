// client/src/pages/CartPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getCart,
  setQty,
  removeFromCart,
  cartTotalCents,
  onCartChanged, // alias di subscribe
} from "../store/cartStore";

export default function CartPage() {
  const [items, setItems] = useState(getCart());
  const nav = useNavigate();

  useEffect(() => {
    // sync in tempo reale con lo store
    const unsub = onCartChanged((next) => setItems(next));
    return () => unsub?.();
  }, []);

  const totalCents = cartTotalCents(items);

  const handleQty = (id, v) => {
    const n = Math.max(0, Number(v) || 0);
    setQty(id, n);
  };

  if (!items.length) {
    return (
      <div className="container">
        <h1>Carrello</h1>
        <div className="card">
          <p>Il carrello è vuoto.</p>
          <Link className="btn" to="/prodotti">Vai ai prodotti</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Carrello</h1>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:80}}>Foto</th>
              <th>Prodotto</th>
              <th style={{width:120}}>Prezzo</th>
              <th style={{width:120}}>Q.tà</th>
              <th style={{width:120}}>Totale</th>
              <th style={{width:90}}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const unitEUR = ((i.price_eur ?? (i.price_cents / 100)) || 0).toFixed(2);
              const rowTotal = (((i.price_cents || 0) * (i.qty || 0)) / 100).toFixed(2);
              const img = i.product_images?.[0]?.url || "/placeholder.png";
              return (
                <tr key={i.id}>
                  <td>
                    <Link to={`/prodotti/${i.id}`} title="Vai al dettaglio">
                      <img
                        src={img}
                        alt={i.title}
                        style={{
                          width: 64,
                          height: 48,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid var(--line)",
                        }}
                      />
                    </Link>
                  </td>
                  <td>
                    {/* Nome prodotto cliccabile verso il dettaglio */}
                    <Link to={`/prodotti/${i.id}`} style={{ color: "var(--text)", textDecoration: "none", fontWeight: 600 }}>
                      {i.title}
                    </Link>
                  </td>
                  <td>{unitEUR}€</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={i.qty}
                      onChange={(e) => handleQty(i.id, e.target.value)}
                      style={{ width: 80 }}
                    />
                  </td>
                  <td>{rowTotal}€</td>
                  <td>
                    <button className="btn ghost" onClick={() => removeFromCart(i.id)}>
                      Rimuovi
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>Subtotale</td>
              <td colSpan={2} style={{ fontWeight: 700 }}>{(totalCents / 100).toFixed(2)}€</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <Link className="btn ghost" to="/prodotti">Continua gli acquisti</Link>
          <button className="btn" onClick={() => nav("/checkout")}>Vai al checkout</button>
        </div>
      </div>
    </div>
  );
}
