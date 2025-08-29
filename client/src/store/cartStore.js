// client/src/store/cartStore.js
const KEY = 'cart_v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function write(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  emit();
}

export function getCart() { return read(); }

export function getCartCount(cart = read()) {
  return cart.reduce((s, i) => s + Number(i.qty || 0), 0);
}

export function cartTotalCents(cart = read()) {
  return cart.reduce((s, i) => s + (Number(i.price_cents || 0) * Number(i.qty || 0)), 0);
}

export function addToCart(item, qty = 1) {
  const cart = read();
  const idx = cart.findIndex(x => x.id === item.id);
  if (idx >= 0) cart[idx].qty = Number(cart[idx].qty || 0) + qty;
  else cart.push({
    id: item.id,
    title: item.title,
    price_cents: Number(item.price_cents || 0),
    qty,
    image_url: item.image_url || item.product_images?.[0]?.url || ''
  });
  write(cart);
}

export function setQty(id, qty) {
  const cart = read().map(i => i.id === id ? { ...i, qty: Math.max(1, Number(qty)||1) } : i);
  write(cart);
}

export function removeFromCart(id) {
  const cart = read().filter(i => i.id !== id);
  write(cart);
}

function emit() {
  const cart = read();
  const detail = { cart, count: getCartCount(cart), totalCents: cartTotalCents(cart) };
  window.dispatchEvent(new CustomEvent('cart:changed', { detail }));
}

export function onCartChanged(cb) {
  const h = (e) => cb(e.detail);
  window.addEventListener('cart:changed', h);
  // subito un primo push con lo stato attuale
  h({ cart: read(), count: getCartCount(), totalCents: cartTotalCents() });
  return () => window.removeEventListener('cart:changed', h);
}
