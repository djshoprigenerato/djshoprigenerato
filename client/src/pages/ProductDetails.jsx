// client/src/pages/ProductDetails.jsx
import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import axios from "axios"
import { addToCart } from "../store/cartStore"

export default function ProductDetails(){
  const { id } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState(null)
  const [activeImg, setActiveImg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let stop = false
    setLoading(true)
    setError("")
    axios.get(`/api/shop/products/${id}`)
      .then(res => {
        if (stop) return
        const prod = res.data
        setP(prod)
        const first = prod?.product_images?.[0]?.url || null
        setActiveImg(first)
      })
      .catch(err => {
        if (stop) return
        setError(err?.response?.data?.error || "Impossibile caricare il prodotto")
      })
      .finally(() => !stop && setLoading(false))
    return () => { stop = true }
  }, [id])

  const priceEUR = p ? (p.price_cents/100).toFixed(2) : "0.00"

  const handleAdd = () => {
    if (!p) return
    addToCart({
      id: p.id,
      title: p.title,
      price_cents: p.price_cents,
      product_images: p.product_images || []
    })
    // piccolo feedback
    window.dispatchEvent(new CustomEvent("toast", { detail: "Aggiunto al carrello" }))
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card">Caricamento…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <p style={{color:'#ff6b6b'}}>{error}</p>
          <button className="btn ghost" onClick={() => nav(-1)}>← Torna indietro</button>
        </div>
      </div>
    )
  }

  if (!p) {
    return (
      <div className="container">
        <div className="card">
          <p>Prodotto non trovato.</p>
          <Link className="btn ghost" to="/prodotti">Torna ai prodotti</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card" style={{marginBottom:12}}>
        <button className="btn ghost" onClick={() => nav('/prodotti')}>← Torna ai prodotti</button>
      </div>

      <div className="card" style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16}}>
        {/* Galleria */}
        <div>
          <div style={{marginBottom:10}}>
            {activeImg
              ? <img src={activeImg} alt={p.title} className="product-img" style={{aspectRatio:'4/3', width:'100%'}} />
              : <span className="badge">Nessuna immagine</span>
            }
          </div>
          {p.product_images?.length > 1 && (
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              {p.product_images.map(img => (
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  onClick={()=>setActiveImg(img.url)}
                  style={{
                    width:88, height:66, objectFit:'cover',
                    borderRadius:8, border: `2px solid ${activeImg===img.url?'var(--primary)':'var(--line)'}`,
                    cursor:'pointer'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Dati */}
        <div>
          <h2 style={{marginTop:0}}>{p.title}</h2>
          <div className="price" style={{fontSize:20, marginBottom:8}}>{priceEUR}€</div>
          <div style={{whiteSpace:'pre-wrap', opacity:.95, lineHeight:1.5}}>
            {p.description || '—'}
          </div>

          <div style={{display:'flex', gap:8, marginTop:16}}>
            <button className="btn" onClick={handleAdd}>Aggiungi al carrello</button>
            <Link className="btn ghost" to="/carrello">Vai al carrello</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
