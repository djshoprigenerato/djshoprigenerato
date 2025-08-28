// client/src/pages/CartPage.jsx
import { useEffect, useState } from "react";
import { getCart, setQty, removeFromCart, cartTotalCents, onCartChanged } from "../store/cartStore";
import { Link, useNavigate } from "react-router-dom";

export default function CartPage() {
  const nav = useNavigate();
  const [items, setItems] = useState(getCart());

  useEffect(() => {
    setItems(getCart());
    const off = onCartChanged(setItems);
    return off;
  }, []);

  const totalCents = cartTotalCents(items);

  return (
    <div className="container">
      <h1>Carrello</h1>
      <div className="card">
        {items.length === 0 ? (
          <p>Il carrello è vuoto. <Link to="/prodotti">Sfoglia i prodotti</Link></p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Prodotto</th>
                <th>Prezzo</th>
                <th>Q.tà</th>
                <th>Subtotale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const unitEUR = ((Number(i.price_cents) || 0) / 100).toFixed(2);
                const subEUR = (((Number(i.price_cents) || 0) * (i.qty || 1)) / 100).toFixed(2);
                return (
                  <tr key={i.id}>
                    <td>{i.title}</td>
                    <td>{unitEUR}€</td>
                    <td>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <button className="btn ghost" onClick={() => setQty(i.id, i.qty - 1)}>-</button>
                        <span>{i.qty}</span>
                        <button className="btn ghost" onClick={() => setQty(i.id, i.qty + 1)}>+</button>
                      </div>
                    </td>
                    <td>{subEUR}€</td>
                    <td><button className="btn ghost" onClick={() => removeFromCart(i.id)}>Rimuovi</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 18, marginTop: 10 }}>
          Totale: {(totalCents / 100).toFixed(2)}€
        </div>
        <div style={{ textAlign: 'right', marginTop: 10 }}>
          <button disabled={!items.length} className="btn" onClick={() => nav('/checkout')}>
            Procedi al checkout
          </button>
        </div>
      </div>
    </div>
  );
}
