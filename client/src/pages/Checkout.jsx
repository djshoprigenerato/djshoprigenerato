// client/src/pages/Checkout.jsx
import { useEffect, useState } from "react"
import { getCart } from "../store/cartStore"
import axios from "axios"
import { supabase } from "../supabaseClient"

// --- helpers di normalizzazione ---
const unitEuro = (item) => {
  // priorità: price (euro) -> price_eur -> price_cents/100 -> 0
  if (typeof item.price === 'number') return item.price
  if (typeof item.price_eur === 'number') return item.price_eur
  if (typeof item.price_cents === 'number') return item.price_cents / 100
  return 0
}
const lineSubtotalEuro = (item) => unitEuro(item) * (item.qty || 1)
const cartTotalEuro = (items) => items.reduce((s, it) => s + lineSubtotalEuro(it), 0)
// ----------------------------------------------------------------

export default function Checkout(){
  const [items, setItems] = useState([])
  const [discountCode, setDiscountCode] = useState('')
  const [discount, setDiscount] = useState(null)
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    shipping: { address:'', city:'', zip:'', country:'IT' },
    user_id: null
  })

  useEffect(()=>{
    setItems(getCart())
    ;(async()=>{
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCustomer(c => ({
          ...c,
          user_id: user.id,
          email: user.email || c.email,
          name: user.user_metadata?.name || c.name
        }))
      }
    })()
  },[])

  const applyDiscount = async () => {
    if(!discountCode.trim()) return
    try{
      const res = await axios.get(`/api/shop/discounts/${encodeURIComponent(discountCode.trim())}`)
      setDiscount(res.data)
    } catch{
      alert('Codice sconto non valido')
      setDiscount(null)
    }
  }

  const pay = async () => {
    try {
      // Payload al server/Stripe: convertiamo in CENTESIMI qui
      const cartPayload = items.map(i => ({
        id: i.id,
        title: i.title,
        qty: i.qty || 1,
        price_cents: Math.round(unitEuro(i) * 100),
        image_url: i.image || i.product_images?.[0]?.url || ''
      }))
      const res = await axios.post('/api/create-checkout-session', {
        cart: cartPayload,
        customer,
        discount
      })
      window.location.href = res.data.url
    } catch (e) {
      console.error(e)
      alert('Errore nel creare la sessione di pagamento')
    }
  }

  // Totali in EURO per UI
  const totalEuro = cartTotalEuro(items)
  const discountedEuro = (() => {
    if (!discount) return totalEuro
    if (discount.percent_off) return Math.max(0, totalEuro * (100 - discount.percent_off) / 100)
    if (discount.amount_off_cents) return Math.max(0, totalEuro - (discount.amount_off_cents / 100))
    return totalEuro
  })()

  return (
    <div className="container">
      <h1>Checkout</h1>
      <div className="card" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        {/* Dati cliente */}
        <div>
          <h3>Dati cliente</h3>
          <label>Nome completo</label>
          <input
            value={customer.name}
            onChange={e=>setCustomer({...customer, name:e.target.value})}
          />
          <label>Email</label>
          <input
            value={customer.email}
            onChange={e=>setCustomer({...customer, email:e.target.value})}
          />
          <div className="form-row">
            <div>
              <label>Indirizzo</label>
              <input
                value={customer.shipping.address}
                onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, address:e.target.value}})}
              />
            </div>
            <div>
              <label>Città</label>
              <input
                value={customer.shipping.city}
                onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, city:e.target.value}})}
              />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label>CAP</label>
              <input
                value={customer.shipping.zip}
                onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, zip:e.target.value}})}
              />
            </div>
            <div>
              <label>Paese</label>
              <input
                value={customer.shipping.country}
                onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, country:e.target.value}})}
              />
            </div>
          </div>

          <h3 style={{marginTop:20}}>Codice sconto</h3>
          <div style={{display:'flex', gap:8}}>
            <input
              placeholder="Inserisci codice"
              value={discountCode}
              onChange={e=>setDiscountCode(e.target.value)}
            />
            <button className="btn ghost" onClick={applyDiscount}>Applica</button>
          </div>
          {discount && (
            <p className="badge">
              Applicato: {discount.code}{' '}
              {discount.percent_off ? `(-${discount.percent_off}%)` : ''}
              {discount.amount_off_cents ? ` (-${(discount.amount_off_cents/100).toFixed(2)}€)` : ''}
            </p>
          )}
        </div>

        {/* Riepilogo */}
        <div>
          <h3>Riepilogo</h3>
          {items.length === 0 ? (
            <p>Carrello vuoto.</p>
          ) : (
            <ul>
              {items.map(i => (
                <li key={i.id}>
                  {i.title} × {i.qty || 1} — {unitEuro(i).toFixed(2)}€
                </li>
              ))}
            </ul>
          )}
          <p>Subtotale: {totalEuro.toFixed(2)}€</p>
          {discount && <p>Sconto: <strong style={{color:'var(--secondary)'}}>applicato</strong></p>}
          <h2>Totale: {discountedEuro.toFixed(2)}€</h2>
          <p className="badge free">Consegna gratuita (SDA/GLS)</p>
          <button className="btn" disabled={items.length===0} onClick={pay}>Paga con Stripe</button>
        </div>
      </div>
    </div>
  )
}
