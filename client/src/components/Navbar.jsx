import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { cartCount, subscribeCart } from "../store/cartStore";

export default function Navbar(){
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(cartCount());
  const nav = useNavigate();

  useEffect(()=>{
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session)=> setUser(session?.user || null));
    const unsub = subscribeCart(() => setCount(cartCount()));
    return () => { sub?.subscription?.unsubscribe?.(); unsub?.(); }
  }, []);

  const logout = async () => { await supabase.auth.signOut(); nav('/'); }

  return (
    <nav className="navbar">
      <div className="left logo">
        <img src="/logo.png" alt="DJ Shop Rigenerato!" />
        <Link to="/">DJ Shop Rigenerato!</Link>
      </div>
      <div className="right" style={{gap: '14px', display:'flex', alignItems:'center'}}>
        <Link to="/prodotti">Prodotti</Link>
        <Link to="/carrello">Carrello {count>0 && <span className="badge">{count}</span>}</Link>
        {user ? (<>
          <Link to="/ordini">I miei ordini</Link>
          {user?.app_metadata?.role === 'admin' && <Link to="/admin">Admin</Link>}
          <button className="btn ghost" onClick={logout}>Logout</button>
          </>) : (<>
          <Link to="/login">Accedi</Link>
          <Link to="/registrati">Registrati</Link>
          <Link to="/termini">Termini</Link>
        </>)}
      </div>
    </nav>
  );
}