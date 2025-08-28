import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import axios from "axios"
import { addToCart } from "../store/cartStore"

export default function ProductDetail(){
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [activeImg, setActiveImg] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async() => {
      try{
        const res = await axios.get(`/api/shop/products/${id}`)
        const p = res.data
        setItem(p)
        const first = (p?.product_images && p.product_images.length) ? p.product_images[0].url : null
        setActiveImg(first)
      } catch(e){
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <div className="container"><div className="card"><p>Caricamento...</p></div></div>
  if (!item) return <div className="container"><div className="card"><p>Prodotto non trovato.</p></div></div>

  const priceEUR = (item.price_eur ?? (item.price_cents/100)).toFixed(2) + "€"

  return (
    <div className="container">
      <div className="card" style={{marginBottom:12}}>
        <Link className="btn ghost" to="/prodotti">← Torna ai prodotti</Link>
      </div>

      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="card">
          {activeImg ? (
            <img src={activeImg} alt={item.title} className="product-img" />
          ) : (<div className="badge">Nessuna immagine</div>)}

          {item.product_images?.length > 1 && (
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:12}}>
              {item.product_images.map((img) => (
                <button
                  key={img.id || img.url}
                  onClick={() => setActiveImg(img.url)}
                  className="btn ghost"
                  style={{padding:0, borderRadius:10, overflow:'hidden'}}
                >
                  <img src={img.url} alt="" style={{width:96, height:72, objectFit:'cover', display:'block'}} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h1>{item.title}</h1>
          <p className="price" style={{marginTop:6, fontSize:'1.25rem'}}>{priceEUR}</p>
          <p style={{marginTop:12}}>{item.description || '—'}</p>
          <div style={{display:'flex', gap:10, marginTop:16}}>
            <button className="btn" onClick={() => addToCart(item)}>Aggiungi al carrello</button>
            <Link className="btn ghost" to="/carrello">Vai al carrello</Link>
          </div>
          {item.category_id && <p style={{marginTop:12}}><span className="badge">Categoria: {item.category_id}</span></p>}
        </div>
      </div>
    </div>
  )
}
