
import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import axios from "axios"
import { Link } from "react-router-dom"

export default function Orders(){
  const [orders, setOrders] = useState([])

  useEffect(()=>{
    (async()=>{
      const { data: { user } } = await supabase.auth.getUser()
      if(!user) return
      // Use RLS: read only own orders via Supabase REST? For simplicity, we call server? We'll fetch via Supabase directly:
      const { data, error } = await supabase.from('orders').select('id, created_at, status, total_cents').eq('user_id', user.id).order('id', {ascending:false})
      if(!error) setOrders(data || [])
    })()
  },[])

  return (
    <div className="container">
      <h1>I miei ordini</h1>
      <div className="card">
        <table className="table">
          <thead><tr><th>ID</th><th>Data</th><th>Stato</th><th>Totale</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
                <td>{o.status}</td>
                <td>{(o.total_cents/100).toFixed(2)}€</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
