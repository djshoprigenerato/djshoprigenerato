
import { Link } from "react-router-dom"
import { addToCart } from "../store/cartStore"

export default function ProductCard({p}){
  const img = p.product_images?.[0]?.url || 'https://placehold.co/600x400?text=DJ+Shop'
  return (
    <div className="card">
      <img className="product-img" src={img} alt={p.title}/>
      <h3>{p.title}</h3>
      <p style={{color:'var(--color-muted)'}}>{p.description?.slice(0,120) || ''}</p>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span style={{color:'var(--color-primary)', fontWeight:800}}>{(p.price_cents/100).toFixed(2)}€</span>
        <div style={{display:'flex', gap:8}}>
          <button className="btn ghost" onClick={()=>addToCart(p,1)}>Aggiungi</button>
          <Link className="btn secondary" to={`/prodotto/${p.id}`}>Vedi</Link>
        </div>
      </div>
    </div>
  )
}
