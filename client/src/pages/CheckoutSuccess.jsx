
import { useEffect } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { clearCart } from "../store/cartStore"

export default function CheckoutSuccess(){
  const [params] = useSearchParams()
  useEffect(()=>{ clearCart() },[])
  return (
    <div className="container">
      <div className="card">
        <h1>Pagamento riuscito 🎉</h1>
        <p>Grazie per l'ordine! ID ordine: <strong>#{params.get('order_id')}</strong></p>
        <Link className="btn" to="/ordini">Vedi i miei ordini</Link>
      </div>
    </div>
  )
}
