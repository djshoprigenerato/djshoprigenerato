// client/src/pages/Orders.jsx
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";

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

function AddressBlock({ addr }) {
  if (!addr) return <span>-</span>;
  const line1 = addr.line1 || "";
  const line2 = addr.line2 ? ` ${addr.line2}` : "";
  const cap = addr.postal_code || "";
  const city = addr.city || "";
  const state = addr.state ? ` (${addr.state})` : "";
  const country = addr.country || "";
  return (
    <div style={{ whiteSpace: "pre-wrap" }}>
      {`${line1}${line2}`}
      <br />
      {`${cap} ${city}${state}`}
      <br />
      {country}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setOrders([]);
          setLoading(false);
          return;
        }
        const res = await axios.get("/api/shop/my-orders", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        // normalizzo totale in EUR per comodità di stampa
        setOrders((res.data || []).map(o => ({
          ...o,
          total_eur: (o.total_cents || 0) / 100,
        })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const list = useMemo(
    () =>
      (orders || []).map(o => ({
        ...o,
        created_local: new Date(o.created_at).toLocaleString(),
      })),
    [orders]
  );

  if (loading)
    return (
      <div className="container">
        <p>Caricamento...</p>
      </div>
    );

  return (
    <div className="container">
      <h1>I miei ordini</h1>
      <div className="card">
        {list.length === 0 ? (
          <p>Nessun ordine trovato.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Stato</th>
                <th>Totale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.created_local}</td>
                  <td>{statusLabel(o.status)}</td>
                  <td>{o.total_eur.toFixed(2)}€</td>
                  <td>
                    <button className="btn ghost" onClick={() => setDetail(o)}>
                      Dettagli
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {detail && (
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Dettaglio ordine #{detail.id}</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginTop: 8,
              }}
            >
              {/* Colonna sinistra: riepilogo */}
              <div>
                <p>
                  <strong>Stato:</strong> {statusLabel(detail.status)}
                  <br />
                  <strong>Data:</strong>{" "}
                  {new Date(detail.created_at).toLocaleString()}
                  <br />
                  <strong>Totale:</strong>{" "}
                  {((detail.total_cents || 0) / 100).toFixed(2)}€
                </p>
                <p>
                  <strong>Nome:</strong> {detail.customer_name || "-"}
                  <br />
                  <strong>Email:</strong> {detail.customer_email || "-"}
                  <br />
                  <strong>Telefono:</strong> {detail.customer_phone || "-"}
                </p>
              </div>

              {/* Colonna destra: spedizione */}
              <div>
                <strong>Spedizione</strong>
                <div style={{ marginTop: 6 }}>
                  <div>
                    <span style={{ opacity: 0.8 }}>Corriere:</span>{" "}
                    {detail.shipping_carrier
                      ? String(detail.shipping_carrier).toUpperCase()
                      : "-"}
                  </div>
                  <div>
                    <span style={{ opacity: 0.8 }}>Tracking:</span>{" "}
                    {detail.tracking_code || "-"}
                    {detail.shipping_tracking && (
                      <>
                        {" "}
                        •{" "}
                        <a
                          href={detail.shipping_tracking}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Apri tracking
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <span style={{ opacity: 0.8 }}>Indirizzo:</span>
                  <div style={{ marginTop: 4 }}>
                    <AddressBlock addr={detail.shipping_address} />
                  </div>
                </div>
              </div>
            </div>

            <h4 style={{ marginTop: 16 }}>Articoli</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Articolo</th>
                  <th>Q.tà</th>
                  <th>Prezzo</th>
                </tr>
              </thead>
              <tbody>
                {(detail.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td>{it.title}</td>
                    <td>{it.quantity}</td>
                    <td>{(it.price_cents / 100).toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button className="btn ghost" onClick={() => window.print()}>
                Stampa
              </button>
              <button className="btn ghost" onClick={() => setDetail(null)}>
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
