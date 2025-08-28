
import { Link } from "react-router-dom"
export default function CheckoutCancelled(){
  return (
    <div className="container">
      <div className="card">
        <h1>Pagamento annullato</h1>
        <p>Il pagamento è stato annullato. Puoi riprovare quando vuoi.</p>
        <Link className="btn" to="/carrello">Torna al carrello</Link>
      </div>
    </div>
  )
}
