// client/src/pages/CancelPage.jsx
import { Link } from "react-router-dom";

export default function CancelPage(){
  return (
    <div className="container">
      <div className="card">
        <h1>Ordine annullato</h1>
        <p>Il pagamento è stato annullato. Il carrello è ancora disponibile.</p>
        <Link className="btn" to="/carrello">Vai al carrello</Link>
      </div>
    </div>
  )
}
