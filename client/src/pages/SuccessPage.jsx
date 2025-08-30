// client/src/pages/SuccessPage.jsx
import { useEffect, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import axios from "axios"
import { clearCart } from "../store/cartStore"

export default function SuccessPage(){
  const [params] = useSearchParams()
  const sessionId = params.get("session_id")
  const [order, setOrder] = useState(null)
  const [error, setError] = useState("")

  useEffect(()=>{
    // Svuota il carrello (l'ordine è completato)
    clearCart()
    window.dispatchEvent(new CustomEvent('toast', { detail: 'Pagamento riuscito: carrello svuotato' }))

    if (!sessionId) return
    ;(async ()=>{
      try{
        const { data } = await axios.get(`/api/orders/by-session/${encodeURIComponent(sessionId)}`)
        setOrder(data)
      } catch(e){
        setError(e?.response?.data?.error || e.message)
      }
    })()
  },[sessionId])

  if (!sessionId){
    return (
      <div className="container">
        <div className="card"><h2>Manca il riferimento del pagamento</h2></div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Pagamento ricevuto</h2>
        {order ? (
          <>
            <p>ID ordine: <code>#{order.id}</code></p>
            <p>Importo pagato: <strong>{(order.total_cents/100).toFixed(2)}€</strong></p>
            <p>Intestato a: {order.customer_name || '-'} &lt;{order.customer_email || '-'}&gt;</p>
            <p>Pagamento: <code>{order.stripe_payment_intent}</code></p>

            {order.order_items?.length > 0 && (
              <table className="table" style={{marginTop: 12}}>
                <thead>
                  <tr><th>Prodotto</th><th>Q.tà</th><th>Prezzo</th></tr>
                </thead>
                <tbody>
                  {order.order_items.map((it, idx)=>(
                    <tr key={idx}>
                      <td>{it.title}</td>
                      <td>{it.quantity}</td>
                      <td>{(it.price_cents/100).toFixed(2)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{display:'flex', gap:8, marginTop:12}}>
              <button className="btn" onClick={()=>window.print()}>Stampa</button>
              <Link className="btn ghost" to="/ordini">I miei ordini</Link>
            </div>
          </>
        ) : (
          <>
            <p>Non riusciamo a mostrare il riepilogo: <code>{error || 'in attesa di conferma'}</code>.</p>
            <p>Puoi controllarlo tra poco in <Link to="/ordini">i miei ordini</Link>.</p>
          </>
        )}
      </div>
    </div>
  )
}
