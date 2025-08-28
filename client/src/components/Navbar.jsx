import { Link } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useEffect, useState } from "react"

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    // carica utente all'avvio
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    })()

    // 🔔 ascolta i cambiamenti di autenticazione (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // aggiorna badge carrello
    const handler = () => {
      const raw = localStorage.getItem('cart') || '[]'
      setCartCount(JSON.parse(raw).reduce((n,i)=>n+i.qty,0))
    }
    handler()
    window.addEventListener('cart:updated', handler)

    return () => {
      sub.subscription.unsubscribe()
      window.removeEventListener('cart:updated', handler)
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <nav className="navbar">
      <div className="brand">
        <img src="/logo.jpg" className="logo" alt="Logo" />
        <Link to="/"><span style={{color:'var(--color-primary)'}}>DJ Shop</span> Rigenerato!</Link>
      </div>
      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        <Link to="/prodotti">Prodotti</Link>
        <Link to="/chi-siamo">Chi Siamo</Link>
        <Link to="/carrello">Carrello ({cartCount})</Link>
        {user ? (
          <>
            <Link to="/ordini">I miei ordini</Link>
            <button className="btn ghost" onClick={logout}>Logout</button>
            {(user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin') && (
              <Link to="/admin" className="btn">Admin</Link>
            )}
          </>
        ) : (
          <Link to="/login" className="btn">Accedi</Link>
        )}
      </div>
    </nav>
  )
}
