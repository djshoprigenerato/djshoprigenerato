// client/src/store/cartStore.js
const STORAGE_KEY = 'cart_v1'

let cart = []
let listeners = new Set()

function notify() {
  for (const cb of listeners) {
    try { cb(getCart()) } catch {}
  }
}

function loadCart() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    cart = raw ? JSON.parse(raw) : []
  } catch {
    cart = []
  }
}
function saveCart() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  } catch {}
  notify()
}

export function getCart() {
  if (!cart.length && typeof window !== 'undefined') loadCart()
  return [...cart]
}

export function addToCart(product, qty = 1) {
  if (!product || !product.id) return

  if (!cart.length && typeof window !== 'undefined') loadCart()

  let price_cents = 0
  if (typeof product.price_cents === 'number') price_cents = product.price_cents
  else if (typeof product.price_eur === 'number') price_cents = Math.round(product.price_eur * 100)

  const idx = cart.findIndex(i => i.id === product.id)
  if (idx >= 0) {
    cart[idx].qty += qty
  } else {
    cart.push({
      id: product.id,
      title: product.title || '',
      qty: qty,
      price_cents,
      price_eur: price_cents / 100,
      product_images: product.product_images || [],
    })
  }
  saveCart()
}

export function setQty(id, qty) {
  if (!cart.length && typeof window !== 'undefined') loadCart()
  const idx = cart.findIndex(i => i.id === id)
  if (idx < 0) return
  if (qty <= 0) {
    cart.splice(idx, 1)
  } else {
    cart[idx].qty = qty
  }
  saveCart()
}

export function removeFromCart(id) {
  if (!cart.length && typeof window !== 'undefined') loadCart()
  cart = cart.filter(i => i.id !== id)
  saveCart()
}

export function clearCart() {
  cart = []
  saveCart()
}

export function cartCount() {
  if (!cart.length && typeof window !== 'undefined') loadCart()
  return cart.reduce((n, i) => n + (i.qty || 0), 0)
}

export function cartTotalCents(items) {
  const arr = Array.isArray(items) ? items : getCart()
  return arr.reduce((sum, i) => {
    const cents = typeof i.price_cents === 'number'
      ? i.price_cents
      : Math.round((i.price_eur || 0) * 100)
    return sum + (cents * (i.qty || 0))
  }, 0)
}

export function cartTotalEuro(items) {
  return cartTotalCents(items) / 100
}

export function subscribe(listener) {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  try { listener(getCart()) } catch {}
  return () => listeners.delete(listener)
}
export const onCartChanged = subscribe

if (typeof window !== 'undefined') {
  loadCart()
}
