// client/src/pages/ProductDetails.jsx
import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import axios from "axios"
import { addToCart } from "../store/cartStore"

export default function ProductDetails(){
  const { id } = useParams()
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(()=>{
    setLoading(true); setErr(""); setP(null)
    ;(async()=>{
      try{
        const { data } = await axios.get('/api/shop/products', { params: { id } })
        setP(data?.[0] || null)
      }catch(e){ setErr(e?.response?.data?.error || e.message) }
      finally{ setLoading(false) }
    })()
  }, [id])

  if (loading) return <div className="container"><div className="card">Caricamento…</div></div>
  if (err) return <div className="container"><div className="card">Errore: {err}</div></div>
  if (!p) return <div className="container"><div className="card">Prodotto non trovato.</div></div>

  const price = ((p.price_eur ?? (p.price_cents/100)) || 0).toFixed(2)
  const images = (p.product_images || []).map(i => i.url).filter(Boolean)
  const cover = images[0] || '/placeholder.png'

  return (
    <div className="container">
      <Link className="btn ghost" to="/prodotti">← Torna ai prodotti</Link>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:16, marginTop:12}}>
        <div className="card">
          <img className="product-img" src={cover} alt={p.title} />
          {images.length > 1 && (
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
              {images.slice(1).map((u, idx)=>(
                <img key={idx} src={u} alt={`img-${idx}`} style={{width:90, height:90, objectFit:'cover', borderRadius:8, border:'1px solid var(--line)'}} />
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3>{p.title}</h3>
          <div className="price" style={{fontSize:20}}>{price}€</div>
          <p style={{whiteSpace:'pre-wrap'}}>{p.description || '-'}</p>
          <div style={{display:'flex', gap:8}}>
            <button className="btn" onClick={()=>{
              addToCart(p, 1)
              window.dispatchEvent(new CustomEvent('toast', { detail: 'Aggiunto nel carrello' }))
            }}>Aggiungi al carrello</button>
            <Link className="btn ghost" to="/carrello">Vai al carrello</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
