import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { clearCart } from "../store/cartStore";

export default function SuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!sessionId) {
        setErr("Session id mancante");
        setLoading(false);
        return;
      }
      try {
        const { data } = await axios.get(`/api/shop/orders/by-session/${encodeURIComponent(sessionId)}`);
        if (!cancelled) {
          setOrder(data);
          setLoading(false);

          // Svuota il carrello localmente solo quando l'ordine è confermato lato server
          clearCart(); // (aggiorna anche il badge del carrello con evento)
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.response?.data?.error || "Ordine non trovato");
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; }
  }, [sessionId]);

  const euro = (cents) => ((Number(cents || 0) / 100).toFixed(2) + "€");

  const total = useMemo(() => order?.total_cents ?? 0, [order]);

  if (loading) {
    return (
      <div className="container">
        <div className="card">Elaborazione pagamento…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container">
        <div className="card">
          <h2>Pagamento ricevuto</h2>
          <p>Non riusciamo a mostrare il riepilogo: {err}.</p>
          <p>
            Puoi controllare in <Link to="/ordini">I miei ordini</Link>.
          </p>
          <Link className="btn" to="/">Torna alla home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Grazie per il tuo acquisto!</h2>
        <p>Il tuo ordine è stato ricevuto e verrà elaborato a breve.</p>
        <p className="badge">Riferimento pagamento: {order?.stripe_session_id}</p>

        {/* Riepilogo stampabile */}
        <div style={{marginTop:16}}>
          <h3>Riepilogo ordine</h3>
          <p><strong>Data:</strong> {new Date(order?.created_at).toLocaleString()}</p>
          <p><strong>Email:</strong> {order?.email || "-"}</p>
          {order?.shipping?.name && <p><strong>Nome:</strong> {order.shipping.name}</p>}
          {order?.shipping?.address && (
            <p>
              <strong>Spedizione:</strong>{" "}
              {[
                order.shipping.address.line1,
                order.shipping.address.line2,
                order.shipping.address.postal_code,
                order.shipping.address.city,
                order.shipping.address.state,
                order.shipping.address.country
              ].filter(Boolean).join(", ")}
            </p>
          )}

          <table className="table" style={{marginTop:12}}>
            <thead>
              <tr>
                <th>Prodotto</th>
                <th style={{width:80, textAlign:'right'}}>Q.tà</th>
                <th style={{width:140, textAlign:'right'}}>Importo</th>
              </tr>
            </thead>
            <tbody>
              {(order?.items || []).map((li, i) => (
                <tr key={i}>
                  <td>{li.description}</td>
                  <td style={{textAlign:'right'}}>{li.quantity}</td>
                  <td style={{textAlign:'right'}}>{euro(li.amount_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{textAlign:'right', fontWeight:700}}>Totale</td>
                <td style={{textAlign:'right', fontWeight:700}}>{euro(total)}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{display:'flex', gap:8, marginTop:16}}>
            <button className="btn secondary" onClick={()=>window.print()}>Stampa ricevuta</button>
            <Link className="btn ghost" to="/ordini">I miei ordini</Link>
            <Link className="btn" to="/">Torna alla home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
