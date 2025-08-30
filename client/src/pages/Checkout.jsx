import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { getCart, cartTotalCents } from "../store/cartStore";
import { supabase } from "../supabaseClient";

export default function Checkout(){
  const [items, setItems] = useState([]);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [customer, setCustomer] = useState({
    name: '', email: '',
    shipping: { address:'', city:'', zip:'', country:'IT' },
    user_id: null
  });

  useEffect(()=>{
    setItems(getCart());
    (async()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCustomer(c => ({...c, user_id: user.id, email: user.email, name: user.user_metadata?.name || ''}));
    })();
  },[]);

  const total = useMemo(()=> cartTotalCents(items), [items]);

  const applyDiscount = async () => {
    if (!discountCode) return;
    try{
      const { data } = await axios.get(`/api/shop/discounts/${encodeURIComponent(discountCode)}`);
      if (!data || !data.id) {
        setDiscount(null);
        return alert('Codice sconto non valido o non attivo');
      }
      if (data.min_order_cents && total < data.min_order_cents) {
        setDiscount(null);
        return alert(`Ordine minimo di ${(data.min_order_cents/100).toFixed(2)}€ per usare questo codice.`);
      }
      setDiscount(data);
    } catch (e){
      setDiscount(null);
      alert(e?.response?.data?.error || 'Codice sconto non valido');
    }
  };

  const discountedTotalCents = useMemo(()=>{
    if (!discount) return total;
    if (discount.percent_off) {
      const p = Number(discount.percent_off) || 0;
      return Math.max(0, Math.round(total * (100 - p) / 100));
    }
    if (discount.amount_off_cents) {
      return Math.max(0, total - Number(discount.amount_off_cents || 0));
    }
    return total;
  }, [total, discount]);

  const pay = async () => {
    try {
      const cartPayload = items.map(i => ({
        id: i.id,
        title: i.title,
        qty: i.qty,
        price_cents: i.price_cents,
        image_url: i.product_images?.[0]?.url || ''
      }));
      const res = await axios.post('/api/create-checkout-session', {
        cart: cartPayload, customer, discount
      });
      window.location.href = res.data.url;
    } catch {
      alert('Errore nel creare la sessione di pagamento');
    }
  };

  return (
    <div className="container">
      <h1>Checkout</h1>
      <div className="card" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div>
          <h3>Dati cliente</h3>
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
              Applicato: <strong>{discount.code}</strong>{' '}
              {discount.percent_off ? `(-${discount.percent_off}%)` : ''}
              {discount.amount_off_cents ? `(-${(discount.amount_off_cents/100).toFixed(2)}€)` : ''}
            </p>
          )}
        </div>
        <div>
          <h3>Riepilogo</h3>
          <ul>
            {items.map(i => {
              const unitEUR = ((i.price_eur ?? (i.price_cents/100))).toFixed(2);
              return <li key={i.id}>{i.title} × {i.qty} — {unitEUR}€</li>;
            })}
          </ul>
          <p>Subtotale: {(total/100).toFixed(2)}€</p>
          {discount?.percent_off && <p>Sconto: -{discount.percent_off}%</p>}
          {discount?.amount_off_cents && <p>Sconto: -{(discount.amount_off_cents/100).toFixed(2)}€</p>}
          <h2>Totale: {(discountedTotalCents/100).toFixed(2)}€</h2>
          <p className="badge free">Consegna gratuita (SDA/GLS)</p>
          <button className="btn" onClick={pay}>Paga con Stripe</button>
        </div>
      </div>
    </div>
  );
}