// client/src/components/ProductCard.jsx
import { Link } from "react-router-dom"
import { addToCart } from "../store/cartStore"

export default function ProductCard({ p }) {
  const priceEUR = ((p.price_eur ?? (p.price_cents / 100)) || 0).toFixed(2)
  const img = p.product_images?.[0]?.url || '/placeholder.png'

  const add = () => {
    addToCart(p, 1)
    window.dispatchEvent(new CustomEvent('toast', { detail: 'Aggiunto nel carrello' }))
  }

  return (
    <div className="card product-card">
      <img className="product-img" src={img} alt={p.title} />
      <div style={{ fontWeight: 700 }}>{p.title}</div>
      <div className="price">{priceEUR}€</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link className="btn ghost" to={`/prodotti/${p.id}`}>Dettagli</Link>
        <button className="btn" onClick={add}>Aggiungi</button>
      </div>
    </div>
  )
}
