import { Link } from "react-router-dom";

export default function CancelPage(){
  return (
    <div className="container">
      <div className="card">
        <h1>Pagamento annullato</h1>
        <p>Nessun addebito è stato effettuato. Puoi riprovare quando vuoi.</p>
        <Link to="/carrello" className="btn" style={{marginTop:10}}>Torna al carrello</Link>
      </div>
    </div>
  );
}