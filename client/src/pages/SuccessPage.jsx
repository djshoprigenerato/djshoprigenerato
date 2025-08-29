import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";

export default function Success(){
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      try{
        const { data } = await axios.get(`/api/shop/order-by-session/${encodeURIComponent(sessionId)}`);
        setOrder(data || null);
      } finally { setLoading(false); }
    })();
  }, [sessionId]);

  if (loading) return <div className="container"><h1>Grazie!</h1><p>Stiamo recuperando i dettagli dell’ordine…</p></div>;

  return (
    <div className="container">
      <h1>Grazie per il tuo acquisto!</h1>
      <p>Il tuo ordine è stato ricevuto correttamente. A breve riceverai un’email di conferma.</p>

      {order ? (
        <div className="card">
          <h3>Dettaglio ordine</h3>
          <p><strong>Ordine #</strong>{order.id}</p>
          <p><strong>Data:</strong> {new Date(order.created_at).toLocaleString()}</p>
          <p><strong>Totale:</strong> {(order.total_cents/100).toFixed(2)}€</p>
          <h4>Articoli</h4>
          <ul>
            {order.items?.map(it => (
              <li key={it.id}>
                {it.title} × {it.qty} — {((it.price_cents)/100).toFixed(2)}€
              </li>
            ))}
          </ul>
          <button className="btn" onClick={()=>window.print()}>Stampa</button>
          <Link to="/" className="btn ghost" style={{marginLeft:8}}>Torna alla Home</Link>
        </div>
      ) : (
        <div className="card">
          <p>Ordine registrato. Se non vedi i dettagli, prova a ricaricare tra qualche secondo.</p>
          <Link to="/" className="btn">Torna alla Home</Link>
        </div>
      )}
    </div>
  );
}
