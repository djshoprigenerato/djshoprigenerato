
import { Link } from "react-router-dom"

export default function Home(){
  return (
    <div className="container">
      <div className="hero card">
        <img src="/logo.jpg" alt="Logo"/>
        <div>
          <h1>DJ Shop Rigenerato!</h1>
          <p style={{opacity:0.9}}><strong>Slogan:</strong> <em>Re-mix, re-fix, re-use</em></p>
          <p>Rigeneriamo e rimettiamo in circolo attrezzature e accessori: qualità controllata, prezzi sostenibili, impatto verde.</p>
          <div style={{display:'flex', gap:10}}>
            <Link to="/prodotti" className="btn">Sfoglia Prodotti</Link>
            <Link to="/pagamenti" className="btn ghost">Pagamenti</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
