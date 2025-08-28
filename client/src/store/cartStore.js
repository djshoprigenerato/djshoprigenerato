const KEY = 'cart'

export function getCart(){
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
export function setCart(cart){ localStorage.setItem(KEY, JSON.stringify(cart)); window.dispatchEvent(new Event('cart:updated')) }
export function addToCart(p, qty = 1){
  const cart = getCart()
  const idx = cart.findIndex(i => i.id === p.id)
  if (idx >= 0) cart[idx].qty += qty
  else cart.push({ id: p.id, title: p.title, qty, price_cents: p.price_cents, product_images: p.product_images || [] })
  setCart(cart)
}
export function removeFromCart(id){
  setCart(getCart().filter(i => i.id !== id))
}
export function clearCart(){ setCart([]) }
export function cartTotalCents(list = getCart()){
  return list.reduce((s,i)=> s + (i.price_cents * i.qty), 0)
}
