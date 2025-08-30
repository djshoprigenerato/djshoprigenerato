const KEY = 'djshop_cart';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); dispatch(); }

let subs = [];
function dispatch(){ subs.forEach(fn => fn()); }

export function subscribeCart(fn){
  subs.push(fn);
  return () => { subs = subs.filter(s => s !== fn); };
}

export function getCart(){ return read(); }
export function cartCount(){ return read().reduce((a,b)=> a + (Number(b.qty)||0), 0); }
export function cartTotalCents(items = read()){
  return items.reduce((sum, i)=> sum + (Number(i.price_cents||0) * Number(i.qty||0)), 0);
}

export function addToCart(item){
  const cart = read();
  const idx = cart.findIndex(i => i.id === item.id);
  if (idx >= 0) cart[idx].qty += (item.qty || 1);
  else cart.push({...item, qty: item.qty || 1});
  write(cart);
  try { window.dispatchEvent(new CustomEvent('toast', { detail: 'Aggiunto al carrello' })); } catch {}
}
export function setQty(id, qty){
  const cart = read();
  const idx = cart.findIndex(i => i.id === id);
  if (idx >= 0) { cart[idx].qty = Math.max(1, Number(qty)||1); write(cart); }
}
export function removeFromCart(id){
  write(read().filter(i => i.id !== id));
}
export function clearCart(){ write([]); }
