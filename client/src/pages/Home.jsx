import { useEffect, useState } from "react"
import axios from "axios"
import { Link } from "react-router-dom"
import ProductCard from "../components/ProductCard"

export default function Home(){
  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')

  const loadCats = async () => {
    const res = await axios.get('/api/shop/categories')
    setCats(res.data)
  }
  const loadProducts = async () => {
    const params = {}
    if (q) params.q = q
    if (cat) params.category_id = cat
    const res = await axios.get('/api/shop/products', { params })
    setItems(res.data)
  }

  useEffect(()=>{ loadCats() },[])
  useEffect(()=>{ loadProducts() },[cat])

  return (
    <div className="container">
      <div className="hero">
        <div>
          <h1>Benvenuto su DJ Shop Rigenerato!</h1>
          <p>Re-mix, re-fix, re-use — strumenti DJ ricondizionati, garantiti e pronti per suonare.</p>
          <div className="hero-actions">
            <Link to="/prodotti" className="btn secondary">Sfoglia tutti i prodotti</Link>
            <Link to="/chi-siamo" className="btn ghost">Chi siamo</Link>
          </div>
        </div>
      </div>

      <div className="filters card">
        <div className="form-row">
          <div>
            <label>Categorie</label>
            <select value={cat} onChange={e=>setCat(e.target.value)}>
              <option value="">— Tutte —</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label>Cerca</label>
            <div style={{display:'flex', gap:8}}>
              <input placeholder="Cerca prodotto..." value={q} onChange={e=>setQ(e.target.value)} />
              <button className="btn" onClick={loadProducts}>Cerca</button>
            </div>
          </div>

          {/* ⬇️  bottone “Vai alla pagina Prodotti” rimosso */}
          {/* (vuoto intenzionale) */}
        </div>
      </div>

      <h2 style={{marginTop:12}}>Prodotti</h2>
      <div className="grid">
        {items.map(p => <ProductCard key={p.id} p={p} />)}
        {items.length===0 && <p>Nessun prodotto trovato.</p>}
      </div>
    </div>
  )
}
