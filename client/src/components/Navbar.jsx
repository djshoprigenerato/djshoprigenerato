// client/src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { supabase } from "../supabaseClient"
import { cartCount, onCartChanged } from "../store/cartStore"

export default function Navbar(){
  const [user, setUser] = useState(null)
  const [count, setCount] = useState(cartCount())
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const menuRef = useRef(null)

  useEffect(()=>{
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session)=> setUser(session?.user || null))
    const unsub = onCartChanged(() => setCount(cartCount()))
    return () => { sub?.subscription?.unsubscribe?.(); unsub?.() }
  }, [])

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setOpen(false)
    nav('/')
  }

  const isAdmin = user?.app_metadata?.role === 'admin'

  return (
    <nav className="navbar">
      <div className="left logo">
        <img src="/logo.png" alt="DJ Shop Rigenerato!" />
        <Link to="/">DJ Shop Rigenerato!</Link>
      </div>

      <div className="right" style={{ display:'flex', alignItems:'center', gap:14 }}>
        <Link to="/prodotti">Prodotti</Link>
        <Link to="/carrello">Carrello {count > 0 && <span>({count})</span>}</Link>

        {user ? (
          <div ref={menuRef} style={{ position:'relative' }}>
            <button
              className="btn ghost"
              type="button"
              aria-haspopup="menu"
              aria-expanded={open ? "true" : "false"}
              onClick={()=>setOpen(o=>!o)}
              onKeyDown={(e)=>{ if(e.key==='Escape') setOpen(false) }}
              style={{ display:'flex', alignItems:'center', gap:6 }}
            >
              Il mio account
              <span style={{ fontSize:10, opacity:.8, transform: open?'rotate(180deg)':'none', transition:'transform .15s' }}>▾</span>
            </button>

            {open && (
              <div
                role="menu"
                tabIndex={-1}
                className="dropdown"
                style={{
                  position:'absolute', right:0, top:'calc(100% + 6px)',
                  minWidth:190, background:'#0f172a', border:'1px solid #334155',
                  borderRadius:10, boxShadow:'0 10px 30px rgba(0,0,0,.35)', overflow:'hidden', zIndex:999
                }}
              >
                <MenuItem onClick={()=>{ setOpen(false); nav('/ordini') }}>
                  I miei ordini
                </MenuItem>

                {isAdmin && (
                  <MenuItem onClick={()=>{ setOpen(false); nav('/admin') }}>
                    Admin
                  </MenuItem>
                )}

                <hr style={{ border:'none', borderTop:'1px solid #334155', margin:'6px 0' }} />

                <MenuItem onClick={logout}>
                  Logout
                </MenuItem>
              </div>
            )}
          </div>
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

function MenuItem({ children, onClick }){
  return (
    <button
      role="menuitem"
      className="dropdown-item"
      onClick={onClick}
      style={{
        width:'100%', textAlign:'left', padding:'10px 12px',
        background:'transparent', border:'none', color:'#e5e7eb',
        cursor:'pointer'
      }}
      onMouseEnter={(e)=> e.currentTarget.style.background = '#0b1220'}
      onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </button>
  )
}
