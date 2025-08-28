// client/src/store/cartStore.js

const KEY = 'djshop_cart_v1';

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function save(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  return cart;
}

export function setCart(cart) {
  return save(cart);
}

export function clearCart() {
  return save([]);
}

export function addToCart(product, qty = 1) {
  const cart = getCart();

  // Normalizziamo sempre il prezzo in centesimi
  const price_cents =
    product.price_cents != null
      ? Number(product.price_cents)
      : Math.round(Number(product.price_eur || 0) * 100);

  const itemBase = {
    id: product.id,
    title: product.title,
    price_cents,
    // opzionale: salviamo anche il valore in euro per comodità UI
    price_eur: price_cents / 100,
    product_images: product.product_images || [],
    qty: 0,
  };

  const i = cart.findIndex((x) => x.id === product.id);
  if (i >= 0) {
    cart[i].qty += qty;
  } else {
    cart.push({ ...itemBase, qty });
  }

  return save(cart);
}

export function updateQty(id, qty) {
  const q = Math.max(1, Number(qty) || 1);
  const cart = getCart().map((i) => (i.id === id ? { ...i, qty: q } : i));
  return save(cart);
}

export function removeFromCart(id) {
  const cart = getCart().filter((i) => i.id !== id);
  return save(cart);
}

/**
 * Totale in centesimi
 * Se un item ha solo price_eur, lo converte.
 */
export function cartTotalCents(items = getCart()) {
  return items.reduce((sum, i) => {
    const price_cents =
      i.price_cents != null
        ? Number(i.price_cents)
        : Math.round(Number(i.price_eur || 0) * 100);
    const qty = Number(i.qty || 1);
    return sum + price_cents * qty;
  }, 0);
}
