import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import { addToCart } from "../store/cartStore"

export default function ProductDetail(){
  const { id } = useParams()
  const [p, setP] = useState(null)

  useEffect(()=>{
    (async()=>{
      const res = await axios.get(`/api/shop/products/${id}`)
      setP(res.data)
    })()
  },[id])

  if(!p) return <div className="container"><p>Caricamento...</p></div>
  return (
    <div className="container">
      <div className="card" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div>
          {(p.product_images||[]).map(img => (
            <img key={img.id} className="product-img" src={img.url} style={{height:320, marginBottom:8}}/>
          ))}
          {(!p.product_images || p.product_images.length===0) && <div className="badge">Nessuna immagine</div>}
        </div>
        <div>
          <h2>{p.title}</h2>
          <p style={{color:'var(--color-muted)'}}>{p.description}</p>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <strong style={{color:'var(--color-primary)', fontSize:22}}>{(p.price_cents/100).toFixed(2)}€</strong>
            <button className="btn" onClick={()=>addToCart(p,1)}>Aggiungi al carrello</button>
          </div>
        </div>
      </div>
    </div>
  )
}
