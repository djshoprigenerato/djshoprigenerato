// cartStore.js – prezzi SEMPRE in EURO (Number)
const LS_KEY = 'djshop_cart_v1'

// Helpers
const read = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr))

export const getCart = () => read()

export const addToCart = (item) => {
  // item: { id, title, price, image, qty? }
  const cart = read()
  const idx = cart.findIndex(x => x.id === item.id)
  const price = typeof item.price === 'number' ? item.price : Number(item.price || 0)
  if (idx >= 0) {
    cart[idx].qty = (cart[idx].qty || 1) + (item.qty || 1)
  } else {
    cart.push({ id: item.id, title: item.title, price, image: item.image || '', qty: item.qty || 1 })
  }
  write(cart)
  window.dispatchEvent(new Event('cart:changed'))
}

export const removeFromCart = (id) => {
  const cart = read().filter(x => x.id !== id)
  write(cart)
  window.dispatchEvent(new Event('cart:changed'))
}

export const setQty = (id, qty) => {
  const cart = read().map(x => x.id === id ? { ...x, qty: Math.max(1, qty|0) } : x)
  write(cart)
  window.dispatchEvent(new Event('cart:changed'))
}

export const cartTotalEuro = () => {
  const cart = read()
  return cart.reduce((sum, x) => sum + (Number(x.price) * (x.qty || 1)), 0)
}

// opzionale: listener per trigger UI
export const onCartChanged = (cb) => {
  const fn = () => cb(read())
  window.addEventListener('cart:changed', fn)
  return () => window.removeEventListener('cart:changed', fn)
}
