import { Link } from "react-router-dom"
import { addToCart } from "../store/cartStore"

export default function ProductCard({ p }){
  const img = (p.product_images && p.product_images[0]?.url) || "/placeholder.png"
  const price = (p.price_eur ?? ((p.price_cents||0)/100)).toFixed(2)
  return (
    <div className="card product-card">
      <img src={img} alt={p.title} className="product-img" />
      <h3>{p.title}</h3>
      <div className="meta">
        <span className="price">{price}€</span>
        <div style={{display:'flex', gap:8}}>
          <Link className="btn ghost" to={`/prodotti/${p.id}`}>Dettagli</Link>
          <button className="btn" onClick={()=>addToCart(p,1)}>Aggiungi</button>
        </div>
      </div>
    </div>
  )
}
