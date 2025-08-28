import { useEffect, useState } from "react"
import axios from "axios"
import ProductCard from "../components/ProductCard"

export default function Products(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cats, setCats] = useState([])
  const [categoryId, setCategoryId] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const params = {}
      if (q.trim()) params.q = q.trim()
      if (categoryId) params.category_id = categoryId
      const res = await axios.get('/api/shop/products', { params })
      setItems(res.data || [])
    } catch (e) {
      console.error(e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    (async()=>{
      try{
        const resC = await axios.get('/api/shop/categories')
        setCats(resC.data || [])
      } catch(e){ /* ignore */ }
      await load()
    })()
  }, [])

  const onKeyDown = (e) => {
    if (e.key === 'Enter') load()
  }

  return (
    <div className="container">
      <h1>Prodotti</h1>

      {/* Barra filtri */}
      <div className="card" style={{marginTop:12}}>
        <div className="form-row">
          <div>
            <label>Ricerca</label>
            <input
              placeholder="Cerca prodotti..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
          <div>
            <label>Categoria</label>
            <select value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
              <option value="">Tutte</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="stack" style={{justifyContent:'flex-end', marginTop:12}}>
          <button className="btn ghost" onClick={()=>{ setQ(''); setCategoryId(''); load() }}>Reset</button>
          <button className="btn" onClick={load}>Cerca</button>
        </div>
      </div>

      {/* Lista prodotti */}
      {loading ? (
        <div className="card" style={{marginTop:16}}><p>Caricamento...</p></div>
      ) : items.length === 0 ? (
        <div className="card" style={{marginTop:16}}><p>Nessun prodotto trovato.</p></div>
      ) : (
        <div className="grid products-grid" style={{marginTop:16}}>
          {items.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}
