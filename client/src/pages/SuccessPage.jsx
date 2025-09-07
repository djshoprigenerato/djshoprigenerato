// client/src/pages/SuccessPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { clearCart } from "../store/cartStore";

function statusLabel(s) {
  const map = {
    paid: "Pagato",
    processing: "In lavorazione",
    shipped: "Spedito",
    refunded: "Rimborsato",
    cancelled: "Annullato",
  };
  return map[s] || s || "-";
}

export default function SuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | notfound | ready
  const cleared = useRef(false);

  // polling: proviamo per ~60s finché il webhook ha scritto l'ordine
  useEffect(() => {
    let timer;
    let attempts = 0;

    async function fetchOrder() {
      try {
        const { data } = await axios.get(
          `/api/shop/orders/by-session/${encodeURIComponent(sessionId)}`
        );
        setOrder(data);
        setStatus("ready");

        // svuota carrello una sola volta quando l'ordine è confermato
        if (!cleared.current) {
          clearCart();
          cleared.current = true;
        }
      } catch (e) {
        attempts += 1;
        if (e?.response?.status === 404) {
          // non ancora disponibile: ritenta fino a 60s
          if (attempts < 20) {
            timer = setTimeout(fetchOrder, 3000);
          } else {
            setStatus("notfound");
          }
        } else {
          setStatus("notfound");
        }
      }
    }

    if (sessionId) fetchOrder();
    else setStatus("notfound");

    return () => clearTimeout(timer);
  }, [sessionId]);

  const totalEUR = useMemo(() => {
    if (!order) return "0.00";
    return (order.total_cents / 100).toFixed(2);
  }, [order]);

  if (status === "loading") {
    return (
      <div className="container">
        <div className="card">
          <h2>Pagamento ricevuto</h2>
          <p>Stiamo preparando il riepilogo dell’ordine…</p>
        </div>
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="container">
        <div className="card">
          <h2>Pagamento ricevuto</h2>
          <p>
            Non riusciamo a mostrare il riepilogo: ordine non ancora disponibile.
            Riprova tra qualche secondo.
          </p>
          <p>
            Puoi controllarlo in <Link to="/ordini">i miei ordini</Link>.
          </p>
          <Link className="btn" to="/">
            Torna alla home
          </Link>
        </div>
      </div>
    );
  }

  // --- stato READY: riepilogo stampabile
  return (
    <div className="container">
      <div className="card">
        <h2>Grazie per il tuo acquisto!</h2>
        <p>
          Ordine #{order.id} del {new Date(order.created_at).toLocaleString()} —{" "}
          <strong>{statusLabel(order.status)}</strong>
        </p>

        <div style={{ marginTop: 12 }}>
          <strong>Intestatario</strong>
          <br />
          {order.customer_name || "-"}
          <br />
          {order.customer_email || "-"}
        </div>

        {order.shipping_address && (
          <div style={{ marginTop: 12 }}>
            <strong>Indirizzo di spedizione</strong>
            <br />
            {(order.shipping_address.line1 || "") +
              (order.shipping_address.line2 ? " " + order.shipping_address.line2 : "")}
            <br />
            {(order.shipping_address.postal_code || "") +
              " " +
              (order.shipping_address.city || "") +
              (order.shipping_address.state ? " (" + order.shipping_address.state + ")" : "")}
            <br />
            {order.shipping_address.country || ""}
          </div>
        )}

        {/* Spedizione / Tracking */}
        {(order.shipping_carrier || order.tracking_code) && (
          <div style={{ marginTop: 12 }}>
            <strong>Spedizione</strong>
            <div style={{ marginTop: 6 }}>
              <div>
                <span style={{ opacity: 0.8 }}>Corriere:</span>{" "}
                {order.shipping_carrier
                  ? String(order.shipping_carrier).toUpperCase()
                  : "-"}
              </div>
              <div>
                <span style={{ opacity: 0.8 }}>Tracking:</span>{" "}
                {order.tracking_code || "-"}
                {order.shipping_tracking_url && (
                  <>
                    {" "}
                    •{" "}
                    <a
                      href={order.shipping_tracking_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Apri tracking
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <h3 style={{ marginTop: 20 }}>Articoli</h3>
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
            {(order.items || []).map((it, idx) => {
              const unit = (it.price_cents / 100).toFixed(2);
              const sub = ((it.price_cents * it.quantity) / 100).toFixed(2);
              return (
                <tr key={idx}>
                  <td>{it.title}</td>
                  <td>{it.quantity}</td>
                  <td>{unit}€</td>
                  <td>{sub}€</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* lo sconto non è incluso nell'oggetto del recap per sessione,
            quindi evitiamo di mostrarlo qui */}

        <h2 style={{ marginTop: 10 }}>Totale: {totalEUR}€</h2>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn ghost" onClick={() => window.print()}>
            Stampa
          </button>
          <Link className="btn" to="/ordini">
            I miei ordini
          </Link>
          <Link className="btn ghost" to="/">
            Torna alla home
          </Link>
        </div>

        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          Riferimento pagamento: {new URLSearchParams(window.location.search).get("session_id")}
        </p>
      </div>
    </div>
  );
}
