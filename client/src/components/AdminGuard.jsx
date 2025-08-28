
import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import { Navigate } from "react-router-dom"

export default function AdminGuard({children}){
  const [loading, setLoading] = useState(true)
  const [ok, setOk] = useState(false)
  useEffect(()=>{
    (async()=>{
      const { data: { user } } = await supabase.auth.getUser()
      const role = user?.app_metadata?.role || user?.user_metadata?.role
      if (role === 'admin') setOk(true)
      setLoading(false)
    })()
  },[])
  if (loading) return <div className="container"><p>Controllo permessi...</p></div>
  if (!ok) return <Navigate to="/" replace />
  return children
}
