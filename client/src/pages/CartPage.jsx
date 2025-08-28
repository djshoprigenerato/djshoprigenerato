
import { useEffect, useState } from "react"
import { getCart, saveCart, removeFromCart, cartTotalCents } from "../store/cartStore"
import { Link } from "react-router-dom"

export default function CartPage(){
  const [items, setItems] = useState([])

  const load = () => setItems(getCart())
  useEffect(()=>{
    load()
    const h = ()=>load()
    window.addEventListener('cart:updated', h)
    return ()=> window.removeEventListener('cart:updated', h)
  },[])

  const inc = (id, d) => {
    const arr = items.map(i => i.id===id?{...i, qty:Math.max(1, i.qty+d)}:i)
    saveCart(arr)
  }

  const total = cartTotalCents(items)

  return (
    <div className="container">
      <h1>Carrello</h1>
      {items.length===0 ? <p>Il carrello è vuoto.</p> : (
        <div className="card">
          <table className="table">
            <thead><tr><th>Prodotto</th><th>Prezzo</th><th>Q.tà</th><th>Totale</th><th></th></tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td>{i.title}</td>
                  <td>{(i.price_cents/100).toFixed(2)}€</td>
                  <td>
                    <button className="btn ghost" onClick={()=>inc(i.id,-1)}>-</button>
                    <span style={{padding:'0 10px'}}>{i.qty}</span>
                    <button className="btn ghost" onClick={()=>inc(i.id,1)}>+</button>
                  </td>
                  <td>{((i.price_cents*i.qty)/100).toFixed(2)}€</td>
                  <td><button className="btn ghost" onClick={()=>{removeFromCart(i.id)}}>Rimuovi</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <strong>Totale: {(total/100).toFixed(2)}€</strong>
            <Link className="btn" to="/checkout">Procedi al checkout</Link>
          </div>
        </div>
      )}
    </div>
  )
}
