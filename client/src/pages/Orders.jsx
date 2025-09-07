// client/src/pages/Orders.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";

function statusLabel(s){
  const map = { paid:"Pagato", processing:"In lavorazione", shipped:"Spedito", refunded:"Rimborsato", cancelled:"Annullato" };
  return map[s] || s || "-";
}

function AddressBlock({ addr }){
  if(!addr) return <span>-</span>;
  const line1 = addr.line1 || "";
  const line2 = addr.line2 ? ` ${addr.line2}` : "";
  const cap = addr.postal_code || "";
  const city = addr.city || "";
  const state = addr.state ? ` (${addr.state})` : "";
  const country = addr.country || "";
  return (
    <div>
      {`${line1}${line2}`}<br/>
      {`${cap} ${city}${state}`}<br/>
      {country}
    </div>
  );
}

// costruisce l'URL ufficiale del tracking se possibile
function buildTrackingUrl(carrier, code){
  if(!carrier || !code) return null;
  const c = String(carrier).toLowerCase();
  if (c === "gls") return `https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni/?match=${encodeURIComponent(code)}&type=NAT`;
  if (c === "sda") return `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${encodeURIComponent(code)}`;
  return null;
}

// compat layer per nomi di campi diversi
function getCarrier(o){ return o?.shipping_carrier || o?.courier || o?.carrier || null; }
function getTrackingCode(o){ return o?.tracking_code || o?.shipping_tracking || o?.tracking || null; }
function getTrackingUrl(o){
  return o?.shipping_tracking_url || buildTrackingUrl(getCarrier(o), getTrackingCode(o));
}

export default function OrdersPage(){
  const [orders, setOrders] = useState([]);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    (async () => {
      try{
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const { data } = await axios.get("/api/shop/my-orders", cfg);
        setOrders(data || []);
      }catch(e){
        console.error("Errore caricamento ordini:", e);
        setOrders([]);
      }
    })();
  }, []);

  return (
    <div className="container">
      <h1>I miei ordini</h1>

      {orders.length === 0 && (
        <div className="card"><p>Nessun ordine trovato.</p></div>
      )}

      {orders.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>#</th><th>Data</th><th>Stato</th><th>Totale</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{new Date(o.created_at).toLocaleString()}</td>
                  <td>{statusLabel(o.status)}</td>
                  <td>{(o.total_cents/100).toFixed(2)}€</td>
                  <td><button className="btn ghost" onClick={()=>setDetail(o)}>Dettagli</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="card" style={{marginTop:16}}>
          <h3>Dettaglio ordine #{detail.id}</h3>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
            <div>
              <p><strong>Stato:</strong> {statusLabel(detail.status)}</p>
              <p><strong>Data:</strong> {new Date(detail.created_at).toLocaleString()}</p>
              <p><strong>Totale:</strong> {(detail.total_cents/100).toFixed(2)}€</p>
              <p><strong>Nome:</strong> {detail.customer_name || "-"}</p>
              <p><strong>Email:</strong> {detail.customer_email || "-"}</p>
              <p><strong>Telefono:</strong> {detail.customer_phone || "-"}</p>
            </div>

            <div>
              <p><strong>Spedizione</strong></p>
              <p><strong>Corriere:</strong> {(getCarrier(detail) || "-")?.toString().toUpperCase()}</p>
              <p>
                <strong>Tracking:</strong>{" "}
                {getTrackingCode(detail) ? (
                  getTrackingUrl(detail) ? (
                    <a href={getTrackingUrl(detail)} target="_blank" rel="noreferrer">
                      {getTrackingCode(detail)}
                    </a>
                  ) : (
                    getTrackingCode(detail)
                  )
                ) : "-"}
              </p>
              <p><strong>Indirizzo:</strong></p>
              <AddressBlock addr={detail.shipping_address} />
            </div>
          </div>

          <h4 style={{marginTop:16}}>Articoli</h4>
          <table className="table">
            <thead><tr><th>Articolo</th><th>Q.tà</th><th>Prezzo</th></tr></thead>
            <tbody>
              {(detail.items || detail.order_items || []).map((it, idx) => (
                <tr key={idx}>
                  <td>{it.title}</td>
                  <td>{it.quantity}</td>
                  <td>{(it.price_cents/100).toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{marginTop:10, display:"flex", gap:8}}>
            <button className="btn ghost" onClick={()=>window.print()}>Stampa</button>
            <button className="btn ghost" onClick={()=>setDetail(null)}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}
