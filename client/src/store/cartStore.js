
export function getCart() {
  const raw = localStorage.getItem('cart') || '[]'
  return JSON.parse(raw)
}
export function saveCart(items) {
  localStorage.setItem('cart', JSON.stringify(items))
  window.dispatchEvent(new Event('cart:updated'))
}
export function addToCart(product, qty = 1) {
  const cart = getCart()
  const existing = cart.find(i => i.id === product.id)
  if (existing) existing.qty += qty
  else cart.push({
    id: product.id,
    title: product.title,
    price_cents: product.price_cents,
    image_url: product.product_images?.[0]?.url || '',
    qty
  })
  saveCart(cart)
}
export function removeFromCart(id) {
  saveCart(getCart().filter(i => i.id !== id))
}
export function clearCart() {
  saveCart([])
}
export function cartTotalCents(cart = getCart()) {
  return cart.reduce((sum, i) => sum + i.price_cents * i.qty, 0)
}
