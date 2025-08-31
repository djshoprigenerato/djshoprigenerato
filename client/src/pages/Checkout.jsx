// client/src/pages/Checkout.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { getCart, cartTotalCents } from "../store/cartStore";
import { supabase } from "../supabaseClient";

export default function Checkout(){
  const [items, setItems] = useState([]);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [showErrorsNote, setShowErrorsNote] = useState(false);
  const [errors, setErrors] = useState({});
  const firstErrorRef = useRef(null);

  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '', // nuovo: telefono
    shipping: { address:'', city:'', zip:'', country:'IT' },
    user_id: null
  });

  // carrello e utente
  useEffect(()=>{
    setItems(getCart());
    (async()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCustomer(c => ({
          ...c,
          user_id: user.id,
          email: user.email || c.email,
          name: user.user_metadata?.name || c.name,
        }));
      }
    })();
  },[]);

  const total = useMemo(()=> cartTotalCents(items), [items]);

  /* -------------------- VALIDAZIONE -------------------- */
  const validateCustomer = (c) => {
    const e = {};
    if (!c.name?.trim()) e.name = "Obbligatorio";
    if (!c.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) e.email = "Email non valida";
    if (!c.phone?.trim()) e.phone = "Obbligatorio";
    if (!c.shipping?.address?.trim()) e.address = "Obbligatorio";
    if (!c.shipping?.city?.trim()) e.city = "Obbligatorio";
    if (!c.shipping?.zip?.trim()) e.zip = "Obbligatorio";
    if (!c.shipping?.country?.trim()) e.country = "Obbligatorio";
    return e;
  };

  // helper: imposta errori e mette a fuoco il primo campo errato
  const showErrorsAndFocus = (errs) => {
    setErrors(errs);
    setShowErrorsNote(true);
    // focus/scroll sul primo campo in errore
    requestAnimationFrame(()=>{
      const first = document.querySelector("[data-error='true']");
      if (first) first.focus({ preventScroll:false });
    });
  };

  /* -------------------- SCONTO -------------------- */
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

  /* -------------------- PAY -------------------- */
  const pay = async () => {
    // 1) valida
    const v = validateCustomer(customer);
    if (Object.keys(v).length > 0) {
      showErrorsAndFocus(v);
      return; // blocca il pagamento se ci sono errori
    }
    setShowErrorsNote(false);
    setErrors({});

    try {
      const cartPayload = items.map(i => ({
        id: i.id,
        title: i.title,
        qty: i.qty,
        price_cents: i.price_cents, // sempre centesimi
        image_url: i.product_images?.[0]?.url || ''
      }));

      // invio il telefono e tutti i dati cliente
      const res = await axios.post('/api/create-checkout-session', {
        cart: cartPayload,
        customer,
        discount
      });
      window.location.href = res.data.url;
    } catch {
      alert('Errore nel creare la sessione di pagamento');
    }
  };

  // stile inline per errore (per evitare di toccare il CSS globale)
  const errStyle = (key) => errors[key] ? { borderColor: '#ff4747', boxShadow: '0 0 0 2px rgba(255,71,71,.15)' } : {};

  return (
    <div className="container">
      <h1>Checkout</h1>

      {showErrorsNote && (
        <div className="card" style={{
          borderColor:'#ff6b6b', background:'#1b1212',
          color:'#ffdede', marginBottom: 12
        }}>
          <strong>Attenzione:</strong> compila tutti i campi richiesti evidenziati in rosso.
        </div>
      )}

      <div className="card" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div>
          <h3>Dati cliente</h3>

          <label style={{color: errors.name ? '#ff8080' : undefined}}>Nome completo*</label>
          <input
            data-error={!!errors.name}
            aria-invalid={!!errors.name}
            value={customer.name}
            onChange={e=>{
              setCustomer({...customer, name:e.target.value});
              if (errors.name) setErrors(prev=> ({...prev, name: undefined}));
            }}
            style={errStyle('name')}
            required
          />

          <label style={{color: errors.email ? '#ff8080' : undefined}}>Email*</label>
          <input
            data-error={!!errors.email}
            aria-invalid={!!errors.email}
            value={customer.email}
            onChange={e=>{
              setCustomer({...customer, email:e.target.value});
              if (errors.email) setErrors(prev=> ({...prev, email: undefined}));
            }}
            style={errStyle('email')}
            required
          />

          <label style={{color: errors.phone ? '#ff8080' : undefined}}>Telefono*</label>
          <input
            data-error={!!errors.phone}
            aria-invalid={!!errors.phone}
            value={customer.phone}
            onChange={e=>{
              setCustomer({...customer, phone:e.target.value});
              if (errors.phone) setErrors(prev=> ({...prev, phone: undefined}));
            }}
            style={errStyle('phone')}
            required
          />

          <div className="form-row">
            <div>
              <label style={{color: errors.address ? '#ff8080' : undefined}}>Indirizzo*</label>
              <input
                data-error={!!errors.address}
                aria-invalid={!!errors.address}
                value={customer.shipping.address}
                onChange={e=>{
                  setCustomer({...customer, shipping:{...customer.shipping, address:e.target.value}});
                  if (errors.address) setErrors(prev=> ({...prev, address: undefined}));
                }}
                style={errStyle('address')}
                required
              />
            </div>
            <div>
              <label style={{color: errors.city ? '#ff8080' : undefined}}>Città*</label>
              <input
                data-error={!!errors.city}
                aria-invalid={!!errors.city}
                value={customer.shipping.city}
                onChange={e=>{
                  setCustomer({...customer, shipping:{...customer.shipping, city:e.target.value}});
                  if (errors.city) setErrors(prev=> ({...prev, city: undefined}));
                }}
                style={errStyle('city')}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label style={{color: errors.zip ? '#ff8080' : undefined}}>CAP*</label>
              <input
                data-error={!!errors.zip}
                aria-invalid={!!errors.zip}
                value={customer.shipping.zip}
                onChange={e=>{
                  setCustomer({...customer, shipping:{...customer.shipping, zip:e.target.value}});
                  if (errors.zip) setErrors(prev=> ({...prev, zip: undefined}));
                }}
                style={errStyle('zip')}
                required
              />
            </div>
            <div>
              <label style={{color: errors.country ? '#ff8080' : undefined}}>Paese*</label>
              <input
                data-error={!!errors.country}
                aria-invalid={!!errors.country}
                value={customer.shipping.country}
                onChange={e=>{
                  setCustomer({...customer, shipping:{...customer.shipping, country:e.target.value}});
                  if (errors.country) setErrors(prev=> ({...prev, country: undefined}));
                }}
                style={errStyle('country')}
                required
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

          {/* Nota errori accanto al bottone, per ulteriore visibilità */}
          {showErrorsNote && (
            <p style={{color:'#ff8a8a', marginTop: 6}}>Compila tutti i campi richiesti.</p>
          )}

          <button className="btn" onClick={pay}>Paga con Stripe</button>
        </div>
      </div>
    </div>
  );
}
