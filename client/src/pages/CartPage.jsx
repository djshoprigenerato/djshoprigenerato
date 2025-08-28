import { useEffect, useState } from "react"
import { getCart, setQty, removeFromCart, cartTotalEuro, onCartChanged } from "../store/cartStore"
import { Link } from "react-router-dom"

export default function CartPage(){
  const [items, setItems] = useState(getCart())
  useEffect(()=>{
    const off = onCartChanged(setItems)
    return off
  },[])

  const total = cartTotalEuro()

  return (
    <div className="container">
      <h1>Carrello</h1>
      <div className="card">
        {items.length === 0 ? (
          <p>Nessun articolo nel carrello. <Link to="/prodotti">Vai ai prodotti</Link></p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Prodotto</th>
                <th>Prezzo</th>
                <th>Q.tà</th>
                <th>Subtotale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const price = Number(it.price || 0)
                const sub = price * (it.qty || 1)
                return (
                  <tr key={it.id}>
                    <td>{it.title}</td>
                    <td>{price.toFixed(2)}€</td>
                    <td>
                      <div style={{display:'flex', gap:6, alignItems:'center'}}>
                        <button className="btn ghost" onClick={()=>setQty(it.id, (it.qty||1) - 1)}>-</button>
                        <span style={{minWidth:24, textAlign:'center'}}>{it.qty||1}</span>
                        <button className="btn ghost" onClick={()=>setQty(it.id, (it.qty||1) + 1)}>+</button>
                      </div>
                    </td>
                    <td>{sub.toFixed(2)}€</td>
                    <td><button className="btn ghost" onClick={()=>removeFromCart(it.id)}>Rimuovi</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:12}}>
          <div style={{fontWeight:800, fontSize:18}}>Totale: {total.toFixed(2)}€</div>
          <Link className="btn" to="/checkout">Procedi al checkout</Link>
        </div>
      </div>
    </div>
  )
}
