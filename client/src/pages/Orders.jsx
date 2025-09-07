// client/src/pages/Orders.jsx
import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import axios from "axios"

function statoIt(status) {
  if (!status) return "-"
  const s = String(status).toLowerCase()
  if (s === "paid") return "Pagato"
  if (s === "pending") return "In attesa"
  if (s === "canceled" || s === "cancelled") return "Annullato"
  if (s === "refunded") return "Rimborsato"
  if (s === "shipped") return "Spedito"     // 👈 traduzione richiesta
  if (s === "delivered") return "Consegnato"
  return status
}

function linkTracking(carrier, code) {
  if (!carrier || !code) return null
  const c = carrier.toLowerCase()
  if (c === "gls") {
    return `https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni/?match=${encodeURIComponent(code)}&type=NAT`
  }
  if (c === "sda") {
    return `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${encodeURIComponent(code)}`
  }
  // default: nessun link noto
  return null
}

export default function Orders(){
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)

  useEffect(()=>{
    (async()=>{
      try{
        const { data: { session } } = await supabase.auth.getSession()
        if(!session?.access_token){ setOrders([]); setLoading(false); return }
        const res = await axios.get('/api/shop/my-orders', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        const list = (res.data||[]).map(o => ({
          ...o,
          total_eur: (o.total_cents ?? 0) / 100
        }))
        setOrders(list)
      } finally { setLoading(false) }
    })()
  },[])

  if (loading) return <div className="container"><p>Caricamento...</p></div>

  return (
    <div className="container">
      <h1>I miei ordini</h1>
      <div className="card">
        {orders.length === 0 ? <p>Nessun ordine trovato.</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Data</th><th>Stato</th>
                <th>Totale</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleString() : "-"}</td>
                  <td>{statoIt(o.status)}</td>
                  <td>{o.total_eur.toFixed(2)}€</td>
                  <td>
                    <button className="btn ghost" onClick={()=>setDetail(o)}>Dettagli</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail && (
        <div className="card" style={{marginTop:16}}>
          <h3>Dettaglio ordine #{detail.id}</h3>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <div>
              <p><strong>Stato:</strong> {statoIt(detail.status)}</p>
              <p><strong>Data:</strong> {detail.created_at ? new Date(detail.created_at).toLocaleString() : "-"}</p>
              <p><strong>Totale:</strong> {(detail.total_cents/100).toFixed(2)}€</p>
              <p><strong>Nome:</strong> {detail.customer_name || "-"}</p>
              <p><strong>Email:</strong> {detail.customer_email || "-"}</p>
              <p><strong>Telefono:</strong> {detail.customer_phone || "-"}</p>
            </div>
            <div>
              <h4>Spedizione</h4>
              <p><strong>Corriere:</strong> {detail.shipping_carrier || "-"}</p>
              <p>
                <strong>Tracking:</strong>{" "}
                {detail.tracking_code ? (
                  (() => {
                    const url = linkTracking(detail.shipping_carrier, detail.tracking_code)
                    return url
                      ? <a href={url} target="_blank" rel="noreferrer">{detail.tracking_code}</a>
                      : <span>{detail.tracking_code}</span>
                  })()
                ) : "—"}
              </p>
              {detail.shipping_address && (
                <pre style={{whiteSpace:'pre-wrap', marginTop:8}}>
                  {JSON.stringify(detail.shipping_address, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <h4 style={{marginTop:16}}>Articoli</h4>
          <table className="table">
            <thead><tr><th>Articolo</th><th>Q.tà</th><th>Prezzo</th></tr></thead>
            <tbody>
              {(detail.items||[]).map((it, idx) => (
                <tr key={idx}>
                  <td>{it.title}</td>
                  <td>{it.quantity}</td>
                  <td>{(it.price_cents/100).toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{marginTop:10, display:'flex', gap:8}}>
            <button className="btn ghost" onClick={()=>window.print()}>Stampa</button>
            <button className="btn" onClick={()=>setDetail(null)}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )
}
