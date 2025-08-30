// client/src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { cartCount, onCartChanged } from "../store/cartStore";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(() => cartCount());
  const nav = useNavigate();

  // handler riutilizzabile per aggiornare il contatore
  const refreshCount = useCallback(() => setCount(cartCount()), []);

  useEffect(() => {
    // auth state
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: authSub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user || null)
    );

    // cart state via store (retrocompatibile)
    const unsubscribeStore = onCartChanged(refreshCount);

    // fallback: ascolta anche l’evento browser (se qualche codice emette solo quello)
    const onCartEvent = (e) => setCount(e.detail?.count ?? cartCount());
    window.addEventListener("cart:changed", onCartEvent);

    // stato iniziale
    refreshCount();

    return () => {
      authSub?.subscription?.unsubscribe?.();
      unsubscribeStore?.();
      window.removeEventListener("cart:changed", onCartEvent);
    };
  }, [refreshCount]);

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/");
  };

  return (
    <nav className="navbar">
      <div className="left logo">
        <img src="/logo.png" alt="DJ Shop Rigenerato!" />
        <Link to="/">DJ Shop Rigenerato!</Link>
      </div>

      <div className="right" style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Link to="/prodotti">Prodotti</Link>
        <Link to="/carrello">
          Carrello {count > 0 && <span>({count})</span>}
        </Link>

        {user ? (
          <>
            <Link to="/ordini">I miei ordini</Link>
            <button className="btn ghost" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Accedi</Link>
            <Link to="/registrati">Registrati</Link>
            <Link to="/termini">Termini</Link>
          </>
        )}

        {/* Admin solo se role=admin */}
        {user?.app_metadata?.role === "admin" && <Link to="/admin">Admin</Link>}
      </div>
    </nav>
  );
}
