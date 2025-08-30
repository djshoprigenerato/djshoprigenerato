// client/src/pages/SuccessPage.jsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { clearCart } from "../store/cartStore";

export default function SuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!sessionId) return;
      try {
        const { data } = await axios.get("/api/orders/by-session", {
          params: { session_id: sessionId }
        });
        if (!mounted) return;
        if (data?.status === "paid") {
          setOrder(data);
          clearCart(); // svuota il carrello SOLO quando l’ordine è effettivamente salvato
        } else {
          setError("Ordine non ancora disponibile. Riprova tra qualche secondo.");
        }
      } catch (e) {
        setError(e?.response?.data?.error || e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="container">
        <div className="card">
          <h2>Pagamento ricevuto</h2>
          <p>Manca l’identificativo della sessione.</p>
          <Link to="/" className="btn">Torna alla home</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Pagamento ricevuto</h2>
          <p>Sto preparando il riepilogo…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container">
        <div className="card">
          <h2>Pagamento ricevuto</h2>
          <p>Non riusciamo a mostrare il riepilogo: {error || "ordine non trovato"}.</p>
          <p>Puoi controllarlo in <Link to="/ordini">i miei ordini</Link>.</p>
          <Link to="/" className="btn">Torna alla home</Link>
        </div>
      </div>
    );
  }

  const total = (order.total_cents / 100).toFixed(2);

  return (
    <div className="container">
      <div className="card">
        <h1>Grazie per il tuo acquisto!</h1>
        <p>Il tuo ordine è stato ricevuto e verrà elaborato a breve.</p>

        <div style={{margin:"12px 0"}}>
          <span className="badge">Riferimento pagamento: {order.stripe_session_id}</span>
        </div>

        <h3>Riepilogo ordine</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Q.tà</th>
              <th>Prezzo</th>
              <th>Subtotale</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((it) => {
              const price = (it.price_cents / 100).toFixed(2);
              const sub = ((it.price_cents * it.quantity) / 100).toFixed(2);
              return (
                <tr key={it.id}>
                  <td>{it.title}</td>
                  <td>{it.quantity}</td>
                  <td>{price}€</td>
                  <td>{sub}€</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h2 style={{textAlign:"right"}}>Totale: {total}€</h2>

        <div style={{display:"flex", gap:8, marginTop:12}}>
          <button className="btn ghost" onClick={()=>window.print()}>Stampa riepilogo</button>
          <Link className="btn" to="/ordini">Vai a “I miei ordini”</Link>
          <Link className="btn ghost" to="/">Torna alla home</Link>
        </div>
      </div>
    </div>
  );
}
