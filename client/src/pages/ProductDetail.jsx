import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import axios from "axios"
import { addToCart } from "../store/cartStore"

export default function ProductDetail(){
  const { id } = useParams()
  const nav = useNavigate()
  const [prod, setProd] = useState(null)
  const [sel, setSel]   = useState(0)
  const [err, setErr]   = useState('')

  useEffect(()=>{
    (async ()=>{
      try{
        const res = await axios.get(`/api/shop/products/${id}`)
        if (res.data?.error) throw new Error(res.data.error)
        // payload coerente con shop.js: product_images[], price_cents
        const p = res.data
        setProd({
          ...p,
          images: Array.isArray(p.product_images) ? p.product_images.map(i => i?.url).filter(Boolean) : [],
          priceEuro: typeof p.price_cents === 'number' ? p.price_cents/100 : (p.price ?? 0)
        })
        setSel(0)
      }catch(e){ setErr(e.message) }
    })()
  },[id])

  if (err) return <div className="container"><div className="card">Errore: {err}</div></div>
  if (!prod) return <div className="container"><div className="card">Caricamento…</div></div>

  const main = prod.images[sel] || ''

  const handleAdd = () => {
    addToCart({
      id: prod.id,
      title: prod.title,
      image: main,
      price: prod.priceEuro, // EURO
    })
    alert('Aggiunto al carrello')
  }

  return (
    <div className="container">
      <div className="card" style={{marginBottom:12}}>
        <Link to="/prodotti" className="btn ghost">← Torna ai prodotti</Link>
      </div>

      <div className="grid" style={{gridTemplateColumns:'minmax(280px, 1.2fr) 1fr', gap:16}}>
        {/* Galleria */}
        <div className="card">
          {main
            ? <img src={main} className="product-img" alt={prod.title} style={{maxHeight:520, width:'100%', objectFit:'cover'}} />
            : <span className="badge">Nessuna immagine</span>}
          {prod.images.length > 1 && (
            <div style={{display:'flex', gap:8, marginTop:10, flexWrap:'wrap'}}>
              {prod.images.map((u, i)=>(
                <img
                  key={u+i}
                  src={u}
                  alt={`thumb-${i}`}
                  onClick={()=>setSel(i)}
                  style={{
                    width:82, height:82, objectFit:'cover', borderRadius:8,
                    border: i===sel ? '2px solid var(--primary)' : '1px solid var(--line)', cursor:'pointer'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Dati */}
        <div className="card">
          <h2 style={{marginTop:0}}>{prod.title}</h2>
          <div className="price" style={{fontSize:22, margin:'6px 0'}}>{prod.priceEuro.toFixed(2)}€</div>
          <p style={{whiteSpace:'pre-wrap', opacity:.9}}>{prod.description || '—'}</p>
          <div style={{display:'flex', gap:8, marginTop:12}}>
            <button className="btn" onClick={handleAdd}>Aggiungi al carrello</button>
            <button className="btn ghost" onClick={()=>nav('/carrello')}>Vai al carrello</button>
          </div>
        </div>
      </div>
    </div>
  )
}
