import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import axios from "axios"

export default function Orders(){
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    (async()=>{
      try{
        const { data: { session } } = await supabase.auth.getSession()
        if(!session?.access_token){
          setOrders([])
          setLoading(false)
          return
        }
        const res = await axios.get('/api/shop/my-orders', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        // Garantiamo sempre i prezzi in € lato UI
        const rows = (res.data || []).map(o => ({
          ...o,
          total_eur: o.total_eur ?? ((o.total_cents || 0) / 100)
        }))
        setOrders(rows)
      } catch(e){
        console.error(e)
        setOrders([])
      } finally {
        setLoading(false)
      }
    })()
  },[])

  if (loading) return <div className="container"><p>Caricamento...</p></div>

  return (
    <div className="container">
      <h1>I miei ordini</h1>
      <div className="card">
        {orders.length === 0 ? (
          <p>Nessun ordine trovato.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Data</th><th>Stato</th><th>Totale</th></tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{new Date(o.created_at).toLocaleString()}</td>
                  <td>{o.status}</td>
                  <td>{o.total_eur.toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
