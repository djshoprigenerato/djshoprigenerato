// client/src/store/cartStore.js
const KEY = 'djcart:v1';
const listeners = [];

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}
function write(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  listeners.forEach(fn => fn(cart));
}

export function onCartChanged(fn) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function getCart() {
  return read();
}

export function addToCart(product, qty = 1) {
  const cart = read();

  // Normalizza il prezzo: sempre in centesimi (intero)
  const price_cents = Number.isFinite(product?.price_cents)
    ? Number(product.price_cents)
    : Math.round(Number(product?.price_eur ?? 0) * 100);

  const image_url = product?.product_images?.[0]?.url || product?.image_url || '';

  const idx = cart.findIndex(i => i.id === product.id);
  if (idx >= 0) {
    const current = cart[idx];
    cart[idx] = {
      ...current,
      qty: current.qty + qty,
      // tieni allineato il prezzo se è cambiato lato admin
      price_cents
    };
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      qty,
      price_cents,
      product_images: product.product_images || [],
      image_url
    });
  }
  write(cart);
}

export function setQty(id, qty) {
  const q = Math.max(1, Number(qty) || 1);
  const cart = read().map(i => i.id === id ? { ...i, qty: q } : i);
  write(cart);
}

export function removeFromCart(id) {
  write(read().filter(i => i.id !== id));
}

export function clearCart() {
  write([]);
}

export function cartTotalCents(cart = read()) {
  return (cart || []).reduce((sum, i) => {
    const p = Number(i.price_cents) || 0;
    const q = Number(i.qty) || 1;
    return sum + p * q;
  }, 0);
}

export function cartTotalEuro(cart = read()) {
  return (cartTotalCents(cart) / 100);
}
