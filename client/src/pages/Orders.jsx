// client/src/pages/Orders.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";

export default function Orders(){
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // ordine aperto

  // helper auth
  const getAuthConfig = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token
      ? { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      : { headers: { 'Content-Type': 'application/json' } };
  };

  useEffect(()=>{
    (async()=>{
      try{
        const cfg = await getAuthConfig();
        const res = await axios.get('/api/shop/my-orders', cfg);
        const list = (res.data||[]).map(o => ({
          ...o,
          total_eur: o.total_eur ?? (o.total_cents/100)
        }));
        setOrders(list);
      } finally { setLoading(false) }
    })();
  },[]);

  const openDetail = async (id) => {
    try{
      const cfg = await getAuthConfig();
      const res = await axios.get(`/api/shop/orders/${id}`, cfg);
      setDetail(res.data);
    }catch(e){
      // fallback: se la rotta non esistesse ancora, prova a ricostruire con i dati base
      const base = orders.find(o => o.id === id);
      if (!base) return;
      setDetail({
        ...base,
        items: base.order_items || [], // se l'API li include già
      });
    }
  };

  const closeDetail = () => setDetail(null);

  const buildTrackingUrl = (carrier, code) => {
    if (!carrier || !code) return null;
    const c = String(carrier).toLowerCase();
    if (c === 'gls') return `https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni/?match=${encodeURIComponent(code)}&type=NAT`;
    if (c === 'sda') return `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${encodeURIComponent(code)}`;
    return null;
  };

  if (loading) return <div className="container"><p>Caricamento...</p></div>;

  return (
    <div className="container">
      <h1>I miei ordini</h1>
      <div className="card">
        {orders.length === 0 ? (
          <p>Nessun ordine trovato.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Data</th><th>Stato</th><th>Totale</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{new Date(o.created_at).toLocaleString()}</td>
                  <td>{o.status}</td>
                  <td>{(o.total_eur).toFixed(2)}€</td>
                  <td>
                    <button className="btn ghost" onClick={()=>openDetail(o.id)}>Dettagli</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail && (
        <div style={{marginTop:16}} className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0}}>Dettaglio ordine #{detail.id}</h3>
            <div style={{display:'flex', gap:8}}>
              <button className="btn ghost" onClick={()=>window.print()}>Stampa</button>
              <button className="btn ghost" onClick={closeDetail}>Chiudi</button>
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:8}}>
            <div>
              <p style={{margin:'4px 0'}}><strong>Stato:</strong> {detail.status}</p>
              <p style={{margin:'4px 0'}}><strong>Data:</strong> {new Date(detail.created_at).toLocaleString()}</p>
              <p style={{margin:'4px 0'}}><strong>Totale:</strong> {(detail.total_cents/100).toFixed(2)}€</p>
            </div>
            <div>
              <p style={{margin:'4px 0'}}><strong>Nome:</strong> {detail.customer_name || '-'}</p>
              <p style={{margin:'4px 0'}}><strong>Email:</strong> {detail.customer_email || '-'}</p>
              <p style={{margin:'4px 0'}}><strong>Telefono:</strong> {detail.customer_phone || detail.shipping_phone || '-'}</p>
            </div>
          </div>

          {/* Indirizzo */}
          {detail.shipping_address && (
            <>
              <h4 style={{marginTop:12}}>Indirizzo di spedizione</h4>
              <pre style={{whiteSpace:'pre-wrap', margin:0}}>
                {JSON.stringify(detail.shipping_address, null, 2)}
              </pre>
            </>
          )}

          {/* Articoli */}
          <h4 style={{marginTop:12}}>Articoli</h4>
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

          {/* Spedizione / Tracking */}
          <h4 style={{marginTop:12}}>Spedizione</h4>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div><strong>Corriere:</strong> {(detail.shipping_carrier || '').toUpperCase() || '-'}</div>
            <div><strong>Tracking:</strong> {detail.tracking_code || '-'}</div>
          </div>
          <div style={{marginTop:8}}>
            {(() => {
              const url = detail.shipping_tracking_url ||
                          buildTrackingUrl(detail.shipping_carrier, detail.tracking_code);
              return url ? (
                <a href={url} className="btn ghost" target="_blank" rel="noreferrer">
                  Apri tracking
                </a>
              ) : (
                <p style={{opacity:.8}}>Il tracking non è ancora disponibile.</p>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
