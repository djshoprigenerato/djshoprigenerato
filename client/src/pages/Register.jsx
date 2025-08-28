import { useState } from "react"
import { supabase } from "../supabaseClient"
import { Link, useNavigate } from "react-router-dom"

export default function Register(){
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const signUp = async () => {
    if (!email || !password) return alert("Inserisci email e password")
    setLoading(true)
    const redirectTo = `${window.location.origin}/`
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: redirectTo }
    })
    setLoading(false)
    if (error) return alert(error.message)
    alert("Registrazione avviata! Controlla la tua email per confermare l'account.")
    nav("/")
  }

  return (
    <div className="container">
      <h1>Registrati</h1>
      <div className="card">
        <label>Nome</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome completo" />
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@dominio.it" />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 6 caratteri" />
        <button className="btn" onClick={signUp} disabled={loading}>{loading ? "Invio..." : "Crea account"}</button>
        <p>Hai già un account? <Link to="/login">Accedi</Link></p>
      </div>
    </div>
  )
}
