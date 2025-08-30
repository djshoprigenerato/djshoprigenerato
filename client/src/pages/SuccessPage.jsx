// client/src/pages/SuccessPage.jsx
import { useEffect, useState, useMemo } from "react"
import { useSearchParams, Link } from "react-router-dom"
import axios from "axios"
import { clearCart } from "../store/cartStore"

export default function SuccessPage(){
  const [params] = useSearchParams()
  const session_id = params.get('session_id')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tries, setTries] = useState(0)

  // Poll dell'ordine finché non esiste (max ~30s)
  useEffect(()=>{
    let timer
    async function tick(){
      try {
        const { data } = await axios.get('/api/shop/orders/by-session', { params: { session_id } })
        if (data && data.id){
          setOrder(data)
          setLoading(false)
          // svuota il carrello una sola volta quando l'ordine è confermato
          clearCart()
          return
        }
      } catch {}
      // riprova fino a 15 volte (ogni 2s)
      setTries(t => t+1)
      timer = setTimeout(tick, 2000)
    }
    if (session_id) tick()
    return () => clearTimeout(timer)
  }, [session_id])

  const totalEUR = useMemo(()=> (order?.total_cents ?? 0) / 100, [order])

  if (!session_id){
    return (
      <div className="container">
        <div className="card"><h2>Pagamento ricevuto</h2>
          <p>Session ID mancante.</p>
          <Link to="/" className="btn">Torna alla home</Link>
        </div>
      </div>
    )
  }

  // Messaggio di attesa finché il webhook non ha scritto l’ordine
  if (loading && !order){
    return (
      <div className="container">
        <div className="card">
          <h2>Pagamento ricevuto</h2>
          <p>Ordine non ancora disponibile. Riprova tra qualche secondo…</p>
          <Link to="/ordini" className="btn ghost">I miei ordini</Link>
          <Link to="/" className="btn" style={{marginLeft:8}}>Torna alla home</Link>
        </div>
      </div>
    )
  }

  // Riepilogo stampabile
  return (
    <div className="container">
      <div className="card">
        <h2>Grazie per il tuo acquisto!</h2>
        <p>Il tuo ordine è stato ricevuto e verrà elaborato a breve.</p>

        <div style={{margin:'16px 0'}}>
          <div className="badge">Ordine #{order.id}</div>{' '}
          <div className="badge">Totale: {totalEUR.toFixed(2)}€</div>{' '}
          <div className="badge">{new Date(order.created_at).toLocaleString()}</div>
        </div>

        <table className="table">
          <thead>
            <tr><th>Prodotto</th><th>Q.tà</th><th>Prezzo</th><th>Subtotale</th></tr>
          </thead>
          <tbody>
            {order.order_items?.map((r, idx) => {
              const eur = (r.price_cents/100).toFixed(2)
              const sub = ((r.price_cents*r.quantity)/100).toFixed(2)
              return (
                <tr key={idx}>
                  <td>{r.title}</td>
                  <td>{r.quantity}</td>
                  <td>{eur}€</td>
                  <td>{sub}€</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div style={{display:'flex', gap:8, marginTop:16}}>
          <button className="btn" onClick={()=>window.print()}>Stampa</button>
          <Link to="/ordini" className="btn ghost">I miei ordini</Link>
          <Link to="/" className="btn" style={{marginLeft:'auto'}}>Torna alla home</Link>
        </div>
      </div>
    </div>
  )
}
