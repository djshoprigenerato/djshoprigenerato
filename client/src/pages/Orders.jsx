// client/src/pages/Orders.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [detail, setDetail] = useState(null); // ordine aperto nel riquadro
  const detailRef = useRef(null);

  useEffect(() => {
    (async () => {
      // prendo il bearer da supabase
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get("/api/shop/my-orders", cfg);
      setOrders(data || []);
    })().catch(() => setOrders([]));
  }, []);

  // ordini ordinati dal più recente
  const sorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [orders]
  );

  const open = (o) => setDetail(o);
  const close = () => setDetail(null);

  // costruisce l’URL di tracking
  function trackingUrl(carrier, code) {
    if (!carrier || !code) return null;
    const c = String(carrier).toLowerCase();
    if (c === "gls") {
      return `https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni/?match=${encodeURIComponent(code)}&type=NAT`;
    }
    if (c === "sda") {
      return `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${encodeURIComponent(code)}`;
    }
    return null;
  }

  // stampa SOLO il riquadro dei dettagli - versione affidabile via iframe
  const printDetail = () => {
    const box = detailRef.current;
    if (!box) return;

    const content = box.outerHTML;

    const styles = `
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body {
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        background: #fff;
        color: #111;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        margin: 0;
        padding: 0;
      }
      .print-card {
        border: 1px solid #ddd;
        border-radius: 10px;
        padding: 18px;
        margin: 0;
      }
      h2 { margin: 0 0 10px; }
      h3 { margin: 16px 0 8px; }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .muted { opacity: .7; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { padding: 8px 10px; border-bottom: 1px solid #e6e6e6; text-align: left; }
      th { font-weight: 600; }
      .right { text-align: right; }
      .badge { display:inline-block; padding:2px 8px; border-radius: 999px; background:#f1f5f9; }
      .small { font-size: 12px; }
      @media print { html, body { height: auto; } }
    `;

    // Crea iframe invisibile
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ordine #${detail?.id ?? ""}</title>
          <style>${styles}</style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    doc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 500);
      }
    };

    if (doc.readyState === "complete") {
      setTimeout(doPrint, 100);
    } else {
      iframe.onload = () => setTimeout(doPrint, 100);
    }
  };

  return (
    <div className="container">
      <h1>I miei ordini</h1>

      {/* LISTA ORDINI */}
      <div className="card">
        {sorted.length === 0 ? (
          <p className="muted">Nessun ordine trovato.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Data</th>
                <th>Stato</th>
                <th className="right">Totale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{new Date(o.created_at).toLocaleString()}</td>
                  <td>{o.status === "shipped" ? "Spedito" : o.status === "paid" ? "Pagato" : o.status}</td>
                  <td className="right">{(o.total_cents/100).toFixed(2)}€</td>
                  <td><button className="btn ghost" onClick={() => open(o)}>Dettagli</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* DETTAGLIO ORDINE */}
      {detail && (
        <div className="card" style={{ marginTop: 16 }}>
          {/* Il contenuto da stampare è dentro .print-card */}
          <div ref={detailRef} className="print-card">
            <h2>Dettaglio ordine #{detail.id}</h2>

            <div className="grid">
              <div>
                <p><strong>Stato:</strong> {detail.status === "shipped" ? "Spedito" : detail.status === "paid" ? "Pagato" : detail.status}</p>
                <p><strong>Data:</strong> {new Date(detail.created_at).toLocaleString()}</p>
                <p><strong>Totale:</strong> {(detail.total_cents/100).toFixed(2)}€</p>

                <p style={{ marginTop: 10 }}>
                  <strong>Nome:</strong> {detail.customer_name || "-"}<br />
                  <strong>Email:</strong> {detail.customer_email || "-"}<br />
                  <strong>Telefono:</strong> {detail.customer_phone || "-"}
                </p>
              </div>

              <div>
                <h3>Spedizione</h3>
                <p><strong>Corriere:</strong> {(detail.shipping_carrier || "-").toUpperCase()}</p>
                <p>
                  <strong>Tracking:</strong>{" "}
                  {detail.tracking_code ? (
                    (() => {
                      const url = trackingUrl(detail.shipping_carrier, detail.tracking_code);
                      return url ? (
                        <a href={url} target="_blank" rel="noreferrer">{detail.tracking_code}</a>
                      ) : (
                        detail.tracking_code
                      );
                    })()
                  ) : "-"}
                </p>

                {detail.shipping_address && (
                  <>
                    <h3 style={{ marginTop: 12 }}>Indirizzo:</h3>
                    <address className="small" style={{ fontStyle: "normal", lineHeight: 1.35 }}>
                      {detail.shipping_address.line1 || ""}{detail.shipping_address.line2 ? `, ${detail.shipping_address.line2}` : ""}<br />
                      {detail.shipping_address.postal_code || ""}{" "}
                      {detail.shipping_address.city || ""}{" "}
                      {detail.shipping_address.state ? `(${detail.shipping_address.state})` : ""}<br />
                      {detail.shipping_address.country || ""}
                    </address>
                  </>
                )}
              </div>
            </div>

            <h3 style={{ marginTop: 18 }}>Articoli</h3>
            <table>
              <thead>
                <tr>
                  <th>Articolo</th>
                  <th className="right">Q.tà</th>
                  <th className="right">Prezzo</th>
                </tr>
              </thead>
              <tbody>
                {(detail.items || []).map((it, i) => (
                  <tr key={i}>
                    <td>{it.title}</td>
                    <td className="right">{it.quantity}</td>
                    <td className="right">{(it.price_cents/100).toFixed(2)}€</td>
                  </tr>
                ))}
                {(!detail.items || detail.items.length === 0) && (
                  <tr><td colSpan={3} className="muted">Nessun articolo disponibile.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn ghost" onClick={printDetail}>Stampa</button>
            <button className="btn ghost" onClick={close}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}
