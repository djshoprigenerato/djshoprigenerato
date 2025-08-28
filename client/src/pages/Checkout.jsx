import { useEffect, useState } from "react"
import { getCart, cartTotalCents, clearCart } from "../store/cartStore"
import axios from "axios"
import { supabase } from "../supabaseClient"

export default function Checkout(){
  const [items, setItems] = useState([])
  const [discountCode, setDiscountCode] = useState('')
  const [discount, setDiscount] = useState(null)
  const [customer, setCustomer] = useState({ name: '', email: '', shipping: { address:'', city:'', zip:'', country:'IT' }, user_id:null })

  useEffect(()=>{
    const cart = getCart()
    setItems(cart)
    ;(async()=>{
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCustomer(c => ({...c, user_id: user.id, email: user.email, name: user.user_metadata?.name || ''}))
      }
    })()
  },[])

  const applyDiscount = async () => {
    if(!discountCode) return
    try{
      const res = await axios.get(`/api/shop/discounts/${encodeURIComponent(discountCode)}`)
      setDiscount(res.data)
    } catch(e){
      alert('Codice sconto non valido')
      setDiscount(null)
    }
  }

  const pay = async () => {
    try {
      const cartPayload = items.map(i => ({
        id: i.id,
        title: i.title,
        qty: i.qty,
        price_cents: i.price_cents,      // Stripe vuole centesimi lato server
        image_url: i.product_images?.[0]?.url || i.image_url || ''
      }))
      const res = await axios.post('/api/create-checkout-session', { cart: cartPayload, customer, discount })
      window.location.href = res.data.url
    } catch (e) {
      alert('Errore nel creare la sessione di pagamento')
    }
  }

  const total = cartTotalCents(items)
  let discounted = total
  if (discount) {
    if (discount.percent_off) discounted = Math.max(0, Math.round(total * (100 - discount.percent_off)/100))
    else if (discount.amount_off_cents) discounted = Math.max(0, total - discount.amount_off_cents)
  }

  return (
    <div className="container">
      <h1>Checkout</h1>
      <div className="card" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div>
          <h3>Dati cliente (guest o registrato)</h3>
          <label>Nome completo</label>
          <input value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} />
          <label>Email</label>
          <input value={customer.email} onChange={e=>setCustomer({...customer, email:e.target.value})} />
          <div className="form-row">
            <div>
              <label>Indirizzo</label>
              <input value={customer.shipping.address} onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, address:e.target.value}})} />
            </div>
            <div>
              <label>Città</label>
              <input value={customer.shipping.city} onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, city:e.target.value}})} />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label>CAP</label>
              <input value={customer.shipping.zip} onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, zip:e.target.value}})} />
            </div>
            <div>
              <label>Paese</label>
              <input value={customer.shipping.country} onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, country:e.target.value}})} />
            </div>
          </div>

          <h3 style={{marginTop:20}}>Codice sconto</h3>
          <div style={{display:'flex', gap:8}}>
            <input placeholder="Inserisci codice" value={discountCode} onChange={e=>setDiscountCode(e.target.value)} />
            <button className="btn ghost" onClick={applyDiscount}>Applica</button>
          </div>
          {discount && (
            <p className="badge">
              Applicato: {discount.code} {discount.percent_off?`(-${discount.percent_off}%)`:''}
              {discount.amount_off_eur?`(-${discount.amount_off_eur.toFixed(2)}€)`:''}
            </p>
          )}
        </div>
        <div>
          <h3>Riepilogo</h3>
          <ul>
            {items.map(i => {
              const unitEUR = ((i.price_eur ?? (i.price_cents/100))).toFixed(2)
              return <li key={i.id}>{i.title} × {i.qty} — {unitEUR}€</li>
            })}
          </ul>
          <p>Subtotale: {(total/100).toFixed(2)}€</p>
          {discount && <p>Sconto: <strong style={{color:'var(--color-secondary)'}}>applicato</strong></p>}
          <h2>Totale: {(discounted/100).toFixed(2)}€</h2>
          <p className="badge free">Consegna gratuita (SDA/GLS)</p>
          <button className="btn" onClick={pay}>Paga con Stripe</button>
        </div>
      </div>
    </div>
  )
}
