// client/src/pages/Checkout.jsx
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { getCart, cartTotalCents } from "../store/cartStore";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

export default function Checkout(){
  const [items, setItems] = useState([]);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [acceptTC, setAcceptTC] = useState(false);        // 👈 nuova spunta T&C
  const [touched, setTouched] = useState({});             // per evidenziare i campi mancanti

  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    shipping: { address:'', city:'', zip:'', country:'IT' },
    user_id: null
  });

  useEffect(()=>{
    setItems(getCart());
    (async()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCustomer(c => ({
          ...c,
          user_id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || ''
        }));
      }
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

  // --- VALIDAZIONE -----------------------------------------------------------
  const required = {
    name: customer.name?.trim(),
    email: customer.email?.trim(),
    phone: customer.phone?.trim(),
    address: customer.shipping.address?.trim(),
    city: customer.shipping.city?.trim(),
    zip: customer.shipping.zip?.trim(),
    country: customer.shipping.country?.trim(),
  };
  const missingKeys = Object.entries(required)
    .filter(([, val]) => !val)
    .map(([key]) => key);

  const isInvalid = (key) => touched[key] && !required[key];
  const markAllTouched = () => {
    setTouched({
      name:true, email:true, phone:true,
      address:true, city:true, zip:true, country:true,
      tc:true
    });
  };

  const pay = async () => {
    // Se manca qualcosa, evidenzia e blocca
    if (missingKeys.length > 0 || !acceptTC) {
      markAllTouched();
      if (!acceptTC) {
        alert("Devi accettare i Termini e Condizioni per procedere.");
      } else {
        alert("Compila tutti i campi obbligatori.");
      }
      return;
    }

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

  // stile bordo rosso per campi invalidi
  const invalidStyle = (flag) => flag ? { borderColor: '#ff4d4f', outlineColor: '#ff4d4f' } : {};

  return (
    <div className="container">
      <h1>Checkout</h1>
      <div className="card" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div>
          <h3>Dati cliente</h3>

          <label>Nome completo</label>
          <input
            value={customer.name}
            onChange={e=>setCustomer({...customer, name:e.target.value})}
            onBlur={()=>setTouched(t=>({...t, name:true}))}
            style={invalidStyle(isInvalid('name'))}
            placeholder="Nome e cognome"
          />

          <label>Email</label>
          <input
            value={customer.email}
            onChange={e=>setCustomer({...customer, email:e.target.value})}
            onBlur={()=>setTouched(t=>({...t, email:true}))}
            style={invalidStyle(isInvalid('email'))}
            type="email"
            placeholder="email@esempio.com"
          />

          <label>Telefono</label>
          <input
            value={customer.phone}
            onChange={e=>setCustomer({...customer, phone:e.target.value})}
            onBlur={()=>setTouched(t=>({...t, phone:true}))}
            style={invalidStyle(isInvalid('phone'))}
            placeholder="+39 ..."
          />

          <div className="form-row">
            <div>
              <label>Indirizzo</label>
              <input
                value={customer.shipping.address}
                onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, address:e.target.value}})}
                onBlur={()=>setTouched(t=>({...t, address:true}))}
                style={invalidStyle(isInvalid('address'))}
                placeholder="Via, civico, interno"
              />
            </div>
            <div>
              <label>Città</label>
              <input
                value={customer.shipping.city}
                onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, city:e.target.value}})}
                onBlur={()=>setTouched(t=>({...t, city:true}))}
                style={invalidStyle(isInvalid('city'))}
                placeholder="Città"
              />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label>CAP</label>
              <input
                value={customer.shipping.zip}
                onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, zip:e.target.value}})}
                onBlur={()=>setTouched(t=>({...t, zip:true}))}
                style={invalidStyle(isInvalid('zip'))}
                placeholder="CAP"
              />
            </div>
            <div>
              <label>Paese</label>
              <input
                value={customer.shipping.country}
                onChange={e=>setCustomer({...customer, shipping:{...customer.shipping, country:e.target.value}})}
                onBlur={()=>setTouched(t=>({...t, country:true}))}
                style={invalidStyle(isInvalid('country'))}
                placeholder="IT"
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
              Applicato: <strong>{discount.code}</strong>{' '}
              {discount.percent_off ? `(-${discount.percent_off}%)` : ''}
              {discount.amount_off_cents ? `(-${(discount.amount_off_cents/100).toFixed(2)}€)` : ''}
            </p>
          )}

          {/* Checkbox Termini & Condizioni */}
          <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px dashed #333' }}>
            <label style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
              <input
                type="checkbox"
                checked={acceptTC}
                onChange={e => setAcceptTC(e.target.checked)}
                onBlur={()=>setTouched(t=>({...t, tc:true}))}
                style={touched.tc && !acceptTC ? { outline: '2px solid #ff4d4f' } : {}}
              />
              <span>
                Procedendo all’acquisto <strong>accetti</strong> tutti i{' '}
                <Link to="/termini" target="_blank" rel="noreferrer">Termini e Condizioni</Link>.
              </span>
            </label>
            {touched.tc && !acceptTC && (
              <div style={{ color:'#ff4d4f', marginTop:6, fontSize:13 }}>
                Devi accettare i Termini e Condizioni per continuare.
              </div>
            )}
          </div>
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

          <button
            className="btn"
            onClick={pay}
          >
            Paga con Stripe
          </button>
          {/* Se preferisci, puoi disabilitare il bottone finché non è tutto ok: */}
          {/* disabled={missingKeys.length>0 || !acceptTC} */}
        </div>
      </div>
    </div>
  );
}
