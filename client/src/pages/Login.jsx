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
    await supabase.auth.getUser() // forza refresh stato
    nav('/')
  }

  return (
    <div className="container">
      <h1>Accedi</h1>
      <div className="card">
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn" onClick={signIn}>Login</button>
        <p>Non hai un account? <Link to="/registrati">Registrati</Link></p>
      </div>
    </div>
  )
}
