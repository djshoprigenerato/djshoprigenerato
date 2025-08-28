import { useState } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate, Link } from "react-router-dom"

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const nav = useNavigate()

  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert(error.message)
      return
    }

    // 🔧 Refresh immediato dello stato utente dopo login
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // salviamo il token/sessione in localStorage (gestito già da Supabase)
      console.log("Login riuscito:", user.email)
    }

    nav('/')
  }

  return (
    <div className="container">
      <h1>Accedi</h1>
      <div className="card">
        <label>Email</label>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button className="btn" onClick={signIn}>Login</button>
        <p>Non hai un account? <Link to="/registrati">Registrati</Link></p>
      </div>
    </div>
  )
}
