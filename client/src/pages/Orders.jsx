import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import axios from "axios"

export default function Orders(){
  const [orders, setOrders] = useState([])

  useEffect(()=>{
    (async()=>{
      const { data: { session } } = await supabase.auth.getSession()
      if(!session?.access_token) return
      const res = await axios.get('/api/shop/my-orders', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      setOrders(res.data || [])
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
