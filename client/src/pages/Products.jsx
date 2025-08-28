
import { useEffect, useState } from "react"
import axios from "axios"
import ProductCard from "../components/ProductCard"

export default function Products(){
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')

  const load = async () => {
    const res = await axios.get('/api/products', { params: q?{q}:{}})
    setItems(res.data)
  }
  useEffect(()=>{ load() },[])

  return (
    <div className="container">
      <h1>Prodotti</h1>
      <div style={{display:'flex', gap:10, margin:'10px 0'}}>
        <input placeholder="Cerca..." value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn" onClick={load}>Cerca</button>
      </div>
      <div className="grid">
        {items.map(p => <ProductCard key={p.id} p={p} />)}
      </div>
    </div>
  )
}
