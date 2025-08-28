import { useEffect, useState } from "react"
import { getCart, cartTotalCents, removeFromCart } from "../store/cartStore"
import { Link } from "react-router-dom"

export default function CartPage(){
  const [items, setItems] = useState([])

  const read = () => getCart()
  const save = (cart) => { localStorage.setItem('cart', JSON.stringify(cart)); window.dispatchEvent(new Event('cart:updated')) }
  const refresh = () => setItems(read())

  useEffect(()=>{ refresh() }, [])

  const inc = (p) => {
    const cart = read(); const idx = cart.findIndex(i => i.id === p.id)
    if (idx>=0){ cart[idx].qty += 1; save(cart); refresh() }
  }
  const dec = (p) => {
    const cart = read(); const idx = cart.findIndex(i => i.id === p.id)
    if (idx>=0){ cart[idx].qty = Math.max(0, cart[idx].qty-1); save(cart.filter(i=>i.qty>0)); refresh() }
  }
  const del = (p) => { removeFromCart(p.id); refresh() }

  const totalCents = cartTotalCents(items)
  const totalEUR = (totalCents/100).toFixed(2)

  return (
    <div className="container">
      <h1>Carrello</h1>
      <div className="card">
        {items.length === 0 ? <p>Il carrello è vuoto.</p> : (<>
          <table className="table">
            <thead><tr><th>Prodotto</th><th>Prezzo</th><th>Q.tà</th><th>Subtotale</th><th></th></tr></thead>
            <tbody>
              {items.map(i => {
                const unitEUR = ((i.price_eur ?? (i.price_cents/100))).toFixed(2)
                const subEUR = ((i.price_cents*i.qty)/100).toFixed(2)
                return (
                  <tr key={i.id}>
                    <td>{i.title}</td>
                    <td>{unitEUR}€</td>
                    <td>
                      <div style={{display:'flex', gap:6, alignItems:'center'}}>
                        <button className="btn ghost" onClick={()=>dec(i)}>-</button>
                        <span>{i.qty}</span>
                        <button className="btn ghost" onClick={()=>inc(i)}>+</button>
                      </div>
                    </td>
                    <td>{subEUR}€</td>
                    <td><button className="btn ghost" onClick={()=>del(i)}>Rimuovi</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{display:'flex', justifyContent:'flex-end', gap:12, alignItems:'center'}}>
            <h2>Totale: {totalEUR}€</h2>
            <Link to="/checkout" className="btn">Procedi al checkout</Link>
          </div>
        </>)}
      </div>
    </div>
  )
}
