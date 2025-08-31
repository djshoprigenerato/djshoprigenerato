// client/src/pages/Orders.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";

function euro(cents) {
  const n = typeof cents === "number" ? cents / 100 : 0;
  return `${n.toFixed(2)}€`;
}

function formatAddress(addr) {
  if (!addr || typeof addr !== "object") return "—";
  const { line1, line2, city, postal_code, state, country } = addr;
  return [
    line1,
    line2,
    [postal_code, city].filter(Boolean).join(" "),
    state,
    country,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState({}); // id -> boolean per mostrare i dettagli
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setOrders([]);
          setLoading(false);
          return;
        }
        const res = await axios.get("/api/shop/my-orders", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = Array.isArray(res.data) ? res.data : [];
        setOrders(
          data.map((o) => ({
            ...o,
            total_eur: o.total_cents / 100,
          }))
        );
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.error || "Errore nel caricare gli ordini");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="container">
        <p>Caricamento…</p>
      </div>
    );

  return (
    <div className="container">
      <h1>I miei ordini</h1>

      {err && <p className="badge danger">{err}</p>}

      <div className="card">
        {orders.length === 0 ? (
          <p>Nessun ordine trovato.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>ID</th>
                <th>Data</th>
                <th>Stato</th>
                <th>Cliente</th>
                <th>Contatti</th>
                <th>Spedizione</th>
                <th style={{ textAlign: "right", width: 120 }}>Totale</th>
                <th style={{ width: 120 }} />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <>
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                    <td>{o.status}</td>
                    <td>{o.customer_name || "—"}</td>
                    <td>
                      <div>{o.customer_email || "—"}</div>
                      <div style={{ opacity: 0.8 }}>
                        {o.customer_phone || "—"}
                      </div>
                    </td>
                    <td>{formatAddress(o.shipping_address)}</td>
                    <td style={{ textAlign: "right" }}>
                      {euro(o.total_cents)}
                    </td>
                    <td>
                      <button
                        className="btn ghost"
                        onClick={() =>
                          setOpen((s) => ({ ...s, [o.id]: !s[o.id] }))
                        }
                      >
                        {open[o.id] ? "Nascondi" : "Dettagli"}
                      </button>
                    </td>
                  </tr>

                  {open[o.id] && (
                    <tr>
                      <td colSpan={8} style={{ background: "var(--card-bg)" }}>
                        {Array.isArray(o.items) && o.items.length ? (
                          <table className="table" style={{ margin: 0 }}>
                            <thead>
                              <tr>
                                <th>Articolo</th>
                                <th style={{ width: 80 }}>Q.tà</th>
                                <th style={{ width: 120 }}>Prezzo</th>
                                <th style={{ width: 120 }}>Subtotale</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.items.map((it, idx) => (
                                <tr key={`${o.id}-${idx}`}>
                                  <td>
                                    {it.title || `Prodotto #${it.product_id}`}
                                  </td>
                                  <td>{it.quantity}</td>
                                  <td>{euro(it.price_cents)}</td>
                                  <td>
                                    {euro((it.price_cents || 0) * (it.quantity || 0))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p style={{ margin: 8 }}>Nessun articolo.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
