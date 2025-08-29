// client/src/pages/CancelPage.jsx
import { Link } from "react-router-dom";

export default function CancelPage() {
  return (
    <div className="container">
      <h1>Pagamento annullato</h1>
      <div className="card">
        <p>Nessun addebito è stato effettuato. Puoi riprovare quando vuoi.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Link to="/checkout" className="btn">Torna al Checkout</Link>
          <Link to="/" className="btn ghost">Vai alla Home</Link>
        </div>
      </div>
    </div>
  );
}
