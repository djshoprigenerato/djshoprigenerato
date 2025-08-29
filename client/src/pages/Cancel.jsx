import { Link } from "react-router-dom"

export default function Cancel(){
  return (
    <div className="container">
      <div className="card">
        <h1>Pagamento annullato</h1>
        <p>Il pagamento è stato annullato. Il carrello è ancora disponibile se vuoi riprovare.</p>
        <div style={{marginTop:12}}>
          <Link className="btn" to="/carrello">Vai al carrello</Link>{' '}
          <Link className="btn ghost" to="/">Torna alla home</Link>
        </div>
      </div>
    </div>
  )
}
