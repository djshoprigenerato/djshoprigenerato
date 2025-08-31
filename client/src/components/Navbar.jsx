import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import { cartCount, onCartChanged } from "../store/cartStore"

export default function Navbar(){
  const [user, setUser] = useState(null)
  const [count, setCount] = useState(cartCount())
  const nav = useNavigate()

  useEffect(()=>{
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session)=> setUser(session?.user || null))
    const unsub = onCartChanged(() => setCount(cartCount()))
    return () => { sub?.subscription?.unsubscribe?.(); unsub?.() }
  }, [])

  const logout = async () => { await supabase.auth.signOut(); nav('/') }

  return (
    <nav className="navbar">
      <div className="left logo">
        <img src="/logo.png" alt="DJ Shop Rigenerato!" />
        <Link to="/">DJ Shop Rigenerato!</Link>
      </div>

      {/* Aggiunto layout con gap */}
      <div className="right" style={{ display:'flex', alignItems:'center', gap:14 }}>
        <Link to="/prodotti">Prodotti</Link>
        <Link to="/carrello">Carrello {count > 0 && <span>({count})</span>}</Link>

        {user ? (
          <>
            <Link to="/ordini">I miei ordini</Link>
            <button className="btn ghost" onClick={logout}>Logout</button>
            {user?.app_metadata?.role === 'admin' && <Link to="/admin">Admin</Link>}
          </>
        ) : (
          <>
            <Link to="/login">Accedi</Link>
            <Link to="/registrati">Registrati</Link>
          </>
        )}
      </div>
    </nav>
  )
}
