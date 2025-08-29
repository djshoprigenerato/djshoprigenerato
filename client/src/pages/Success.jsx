import { Link, useLocation } from "react-router-dom"

export default function Success(){
  const qs = new URLSearchParams(useLocation().search)
  const orderId = qs.get("order_id") || qs.get("o") || null

  return (
    <div className="container">
      <div className="card">
        <h1>Grazie per il tuo acquisto!</h1>
        <p>Il tuo ordine è stato ricevuto correttamente. Riceverai un’email di conferma.</p>
        {orderId && (
          <p>Numero ordine: <strong>#{orderId}</strong></p>
        )}
        <div style={{marginTop:12}}>
          <Link className="btn" to="/ordini">Vai ai miei ordini</Link>{' '}
          <Link className="btn ghost" to="/">Torna alla home</Link>
        </div>
      </div>
    </div>
  )
}
