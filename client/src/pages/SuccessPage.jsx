import { Link, useSearchParams } from "react-router-dom";

export default function SuccessPage(){
  const [params] = useSearchParams();
  const sessionId = params.get("session_id") || "";
  return (
    <div className="container">
      <div className="card">
        <h1>Grazie per il tuo acquisto!</h1>
        <p>Il tuo ordine è stato ricevuto e verrà elaborato a breve.</p>
        {sessionId && <p className="badge">Riferimento pagamento: {sessionId}</p>}
        <p>Puoi vedere i dettagli in <Link to="/ordini">I miei ordini</Link>.</p>
        <Link to="/" className="btn" style={{marginTop:10}}>Torna alla home</Link>
      </div>
    </div>
  );
}