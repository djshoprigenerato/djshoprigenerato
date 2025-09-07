import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import axios from "axios"

export default function Orders(){
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null) // ordine selezionato dal listato

  useEffect(()=>{
    (async()=>{
      try{
        const { data: { session} } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token){ setOrders([]); setLoading(false); return }
        const res = await axios.get('/api/shop/my-orders', {
          headers: { Authorization: `Bearer ${token}` }
        })
        // aggiungo total_eur e normalizzo date
        const list = (res.data||[]).map(o => ({
          ...o,
          total_eur: Number(o.total_cents||0)/100,
        }))
        setOrders(list)
      }catch(e){
        console.error(e)
        setOrders([])
      }finally{
        setLoading(false)
      }
    })()
  },[])

  const openDetail = (o) => setDetail(o)
  const closeDetail = () => setDetail(null)

  if (loading) return <div className="container"><p>Caricamento...</p></div>

  return (
    <div className="container">
      <h1>I miei ordini</h1>
      <div className="card">
        {orders.length === 0 ? <p>Nessun ordine trovato.</p> : (
          <table className="table">
            <thead><tr><th>ID</th><th>Data</th><th>Stato</th><th>Totale</th><th></th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                  <td>{o.status}</td>
                  <td>{o.total_eur.toFixed(2)}€</td>
                  <td><button className="btn ghost" onClick={()=>openDetail(o)}>Dettagli</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail && (
        <div style={{marginTop:16}} className="card">
          <h3>Dettaglio ordine #{detail.id}</h3>

          <div className="form-row">
            <div>
              <p><strong>Stato:</strong> {detail.status}</p>
              <p><strong>Data:</strong> {detail.created_at ? new Date(detail.created_at).toLocaleString() : '-'}</p>
              <p><strong>Totale:</strong> {detail.total_eur.toFixed(2)}€</p>
            </div>
            <div>
              <p><strong>Nome:</strong> {detail.customer_name || '-'}</p>
              <p><strong>Email:</strong> {detail.customer_email || '-'}</p>
              <p><strong>Telefono:</strong> {detail.customer_phone || '-'}</p>
            </div>
          </div>

          <h4>Articoli</h4>
          <table className="table">
            <thead><tr><th>Articolo</th><th>Q.tà</th><th>Prezzo</th></tr></thead>
            <tbody>
              {(detail.items || []).map((it, idx) => (
                <tr key={idx}>
                  <td>{it.title}</td>
                  <td>{it.quantity}</td>
                  <td>{(Number(it.price_cents||0)/100).toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4>Spedizione</h4>
          <p>
            <strong>Corriere:</strong> {detail.shipping_carrier || '-'}<br/>
            <strong>Tracking:</strong>{" "}
            {detail.tracking_code ? (
              <a
                href={
                  detail.shipping_carrier === 'GLS'
                    ? `https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni/?match=${encodeURIComponent(detail.tracking_code)}&type=NAT`
                    : detail.shipping_carrier === 'SDA'
                      ? `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${encodeURIComponent(detail.tracking_code)}`
                      : '#'
                }
                target="_blank" rel="noreferrer"
              >
                {detail.tracking_code}
              </a>
            ) : ('-')}
          </p>

          {detail.shipping_address && (
            <>
              <h4>Indirizzo</h4>
              <pre style={{whiteSpace:'pre-wrap', marginTop:6}}>
                {JSON.stringify(detail.shipping_address, null, 2)}
              </pre>
            </>
          )}

          <div style={{marginTop:10, display:'flex', gap:8}}>
            <button className="btn ghost" onClick={()=>window.print()}>Stampa</button>
            <button className="btn" onClick={closeDetail}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )
}
