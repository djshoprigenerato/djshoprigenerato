import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import axios from "axios"
import { addToCart } from "../store/cartStore"

function normalizeProduct(payload) {
  // L'API può rispondere in vari modi: {product}, {data}, array, oggetto diretto
  let p = payload?.product ?? payload?.data ?? (Array.isArray(payload) ? payload[0] : payload) ?? null
  if (!p) return null

  // campi con alias diversi
  const images =
    p.product_images ?? p.images ?? p.photos ?? []
  const title =
    p.title ?? p.name ?? p.nome ?? ''
  const description =
    p.description ?? p.descrizione ?? ''
  const category_id =
    p.category_id ?? p.category ?? null

  // prezzo: preferisci euro se già presente, altrimenti converti i centesimi
  let priceEuro = null
  if (typeof p.price === 'number') priceEuro = p.price
  else if (typeof p.price_eur === 'number') priceEuro = p.price_eur
  else if (typeof p.price_cents === 'number') priceEuro = p.price_cents / 100

  return {
    ...p,
    title,
    description,
    category_id,
    images,
    priceEuro
  }
}

export default function ProductDetail(){
  const { id } = useParams()
  const nav = useNavigate()
  const [prod, setProd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(()=>{
    (async ()=>{
      try{
        setLoading(true)
        const res = await axios.get(`/api/shop/products/${id}`)
        if (res?.data?.error) throw new Error(res.data.error)
        const n = normalizeProduct(res.data)
        if (!n) throw new Error('Prodotto non trovato')
        setProd(n)
      }catch(e){
        setError(e?.response?.data?.error || e.message)
      }finally{
        setLoading(false)
      }
    })()
  },[id])

  const firstImg = prod?.images?.[0]?.url || prod?.images?.[0]?.publicUrl || prod?.images?.[0] || null
  const priceLabel = prod?.priceEuro != null ? `${prod.priceEuro.toFixed(2)}€` : '—'

  const handleAdd = () => {
    if (!prod) return
    addToCart({
      id: prod.id,
      title: prod.title,
      price: prod.priceEuro ?? 0,
      image: firstImg || ''
    })
    alert('Aggiunto al carrello')
  }

  if (loading) return <div className="container"><div className="card">Caricamento…</div></div>
  if (error)   return <div className="container"><div className="card">Errore: {error}</div></div>
  if (!prod)   return <div className="container"><div className="card">Prodotto non disponibile</div></div>

  return (
    <div className="container">
      <div className="card" style={{marginBottom:12}}>
        <Link to="/prodotti" className="btn ghost">← Torna ai prodotti</Link>
      </div>

      <div className="grid" style={{gridTemplateColumns:'minmax(280px, 1.2fr) 1fr', gap:16}}>
        <div className="card" style={{minHeight:240, display:'flex', alignItems:'center', justifyContent:'center'}}>
          {firstImg
            ? <img src={firstImg} alt={prod.title} className="product-img" style={{maxHeight:420, width:'100%', objectFit:'cover'}} />
            : <span className="badge">Nessuna immagine</span>}
        </div>
        <div className="card">
          <h2 style={{marginTop:0}}>{prod.title || '—'}</h2>
          <div className="price" style={{fontSize:22, margin:'6px 0'}}>{priceLabel}</div>
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
