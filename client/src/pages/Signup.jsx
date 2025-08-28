
import { useState } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"

export default function Signup(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const nav = useNavigate()

  const register = async () => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    })
    if (error) return alert(error.message)
    alert('Registrazione effettuata! Controlla la tua email se è abilitata la conferma.')
    nav('/')
  }

  return (
    <div className="container">
      <h1>Registrati</h1>
      <div className="card">
        <label>Nome</label>
        <input value={name} onChange={e=>setName(e.target.value)} />
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn" onClick={register}>Crea account</button>
      </div>
    </div>
  )
}
