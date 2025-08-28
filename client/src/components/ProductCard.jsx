import { addToCart } from "../store/cartStore"
import { Link } from "react-router-dom"

export default function ProductCard({ p }){
  const img = p?.product_images?.[0]?.url || ''
  // API espone price_cents -> converti in euro per UI+carrello
  const priceEuro = typeof p.price_cents === 'number' ? p.price_cents / 100 : (p.price ?? 0)

  const handleAdd = () => {
    addToCart({
      id: p.id,
      title: p.title,
      image: img,
      price: priceEuro, // EURO!
    })
    alert('Aggiunto al carrello')
  }

  return (
    <div className="card product-card">
      <img src={img || '/placeholder.png'} className="product-img" alt={p.title} />
      <div style={{fontWeight:700}}>{p.title}</div>
      <div className="price">{priceEuro.toFixed(2)}€</div>
      <div style={{display:'flex', gap:8}}>
        <Link className="btn ghost" to={`/prodotti/${p.id}`}>Dettagli</Link>
        <button className="btn" onClick={handleAdd}>Aggiungi</button>
      </div>
    </div>
  )
}
