
import { useEffect, useState } from "react"
import axios from "axios"
import { supabase } from "../supabaseClient"

export default function AdminDashboard(){
  const [tab, setTab] = useState('products')
  return (
    <div className="container">
      <h1>Admin</h1>
      <div style={{display:'flex', gap:8, marginBottom:12}}>
        <button className={`btn ${tab==='products'?'secondary':'ghost'}`} onClick={()=>setTab('products')}>Prodotti</button>
        <button className={`btn ${tab==='categories'?'secondary':'ghost'}`} onClick={()=>setTab('categories')}>Categorie</button>
        <button className={`btn ${tab==='orders'?'secondary':'ghost'}`} onClick={()=>setTab('orders')}>Ordini</button>
        <button className={`btn ${tab==='discounts'?'secondary':'ghost'}`} onClick={()=>setTab('discounts')}>Codici Sconto</button>
      </div>
      {tab==='products' && <ProductsAdmin/>}
      {tab==='categories' && <CategoriesAdmin/>}
      {tab==='orders' && <OrdersAdmin/>}
      {tab==='discounts' && <DiscountsAdmin/>}
    </div>
  )
}

function useAuthHeader(){
  const [hdr, setHdr] = useState({})
  useEffect(()=>{
    (async()=>{
      const { data: { session } } = await supabase.auth.getSession()
      if(session?.access_token) setHdr({ headers: { Authorization: `Bearer ${session.access_token}` } })
    })()
  },[])
  return hdr
}

function ProductsAdmin(){
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ title:'', description:'', price_cents:0, stock:0, is_active:true, category_id:null })
  const hdr = useAuthHeader()

  const load = async () => {
    const res = await axios.get('/api/admin/products', hdr)
    setItems(res.data)
  }
  useEffect(()=>{ load() }, [])

  const create = async () => {
    const res = await axios.post('/api/admin/products', form, hdr)
    setForm({ title:'', description:'', price_cents:0, stock:0, is_active:true, category_id:null })
    await load()
    alert('Prodotto creato. Ora carica le immagini.')
  }

  const uploadImages = async (p) => {
    const bucket = 'uploads'
    const files = await pickFiles()
    for (const file of files) {
      const path = `${p.id}/${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage.from(bucket).upload(path, file)
      if(!error) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
        await axios.post(`/api/admin/products/${p.id}/images`, { path, url: pub.publicUrl }, hdr)
      }
    }
    await load()
  }

  const del = async (id) => {
    if(!confirm('Eliminare il prodotto e le sue immagini?')) return
    await axios.delete(`/api/admin/products/${id}`, hdr)
    await load()
  }

  return (
    <div className="card">
      <h3>Nuovo prodotto</h3>
      <div className="form-row">
        <div>
          <label>Titolo</label>
          <input value={form.title} onChange={e=>setForm({...form, title:e.target.value})}/>
        </div>
        <div>
          <label>Prezzo (cent)</label>
          <input type="number" value={form.price_cents} onChange={e=>setForm({...form, price_cents:Number(e.target.value)})}/>
        </div>
      </div>
      <label>Descrizione</label>
      <textarea rows="3" value={form.description} onChange={e=>setForm({...form, description:e.target.value})}></textarea>
      <div className="form-row">
        <div>
          <label>Stock</label>
          <input type="number" value={form.stock} onChange={e=>setForm({...form, stock:Number(e.target.value)})}/>
        </div>
        <div>
          <label>Attivo</label>
          <select value={form.is_active} onChange={e=>setForm({...form, is_active:e.target.value==='true'})}>
            <option value="true">Sì</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>
      <button className="btn" onClick={create}>Crea</button>

      <h3 style={{marginTop:20}}>Lista prodotti</h3>
      <table className="table">
        <thead><tr><th>ID</th><th>Titolo</th><th>Prezzo</th><th>Immagini</th><th></th></tr></thead>
        <tbody>
          {items.map(p => (
            <tr key={p.id}>
              <td>#{p.id}</td>
              <td>{p.title}</td>
              <td>{(p.price_cents/100).toFixed(2)}€</td>
              <td>{p.product_images?.length||0}</td>
              <td style={{display:'flex', gap:8}}>
                <button className="btn ghost" onClick={()=>uploadImages(p)}>Carica immagini</button>
                <button className="btn ghost" onClick={()=>del(p.id)}>Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CategoriesAdmin(){
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const hdr = useAuthHeader()

  const load = async () => {
    const res = await axios.get('/api/admin/categories', hdr)
    setItems(res.data)
  }
  useEffect(()=>{ load() }, [])

  const add = async () => {
    await axios.post('/api/admin/categories', { name }, hdr)
    setName('')
    await load()
  }
  const del = async (id) => {
    await axios.delete(`/api/admin/categories/${id}`, hdr)
    await load()
  }

  return (
    <div className="card">
      <h3>Nuova categoria</h3>
      <div style={{display:'flex', gap:8}}>
        <input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} />
        <button className="btn" onClick={add}>Crea</button>
      </div>
      <h3 style={{marginTop:20}}>Categorie</h3>
      <ul>
        {(items||[]).map(c => <li key={c.id} style={{display:'flex', justifyContent:'space-between'}}>
          <span>#{c.id} {c.name}</span>
          <button className="btn ghost" onClick={()=>del(c.id)}>Elimina</button>
        </li>)}
      </ul>
    </div>
  )
}


function OrdersAdmin(){
  const [items, setItems] = useState([])
  const [detail, setDetail] = useState(null)
  const hdr = useAuthHeader()
  const load = async () => {
    const res = await axios.get('/api/admin/orders', hdr)
    setItems(res.data)
  }
  const open = async (id) => {
    const res = await axios.get('/api/admin/orders/'+id, hdr)
    setDetail(res.data)
  }
  useEffect(()=>{ load() }, [])

  return (
    <div className="card">
      <h3>Tutti gli ordini</h3>
      <table className="table">
        <thead><tr><th>ID</th><th>Data</th><th>Stato</th><th>Cliente</th><th>Totale</th><th></th></tr></thead>
        <tbody>
          {items.map(o => (
            <tr key={o.id}>
              <td>#{o.id}</td>
              <td>{new Date(o.created_at).toLocaleString()}</td>
              <td>{o.status}</td>
              <td>{o.customer_name || o.customer_email}</td>
              <td>{(o.total_cents/100).toFixed(2)}€</td>
              <td><button className="btn ghost" onClick={()=>open(o.id)}>Dettagli</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {detail && (
        <div style={{marginTop:16}} className="card">
          <h3>Dettaglio ordine #{detail.id}</h3>
          <p><strong>Cliente:</strong> {detail.customer_name} ({detail.customer_email})</p>
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(detail.shipping_address, null, 2)}</pre>
          <table className="table">
            <thead><tr><th>Articolo</th><th>Q.tà</th><th>Prezzo</th></tr></thead>
            <tbody>
              {(detail.order_items||[]).map(it => (
                <tr key={it.id}><td>{it.title}</td><td>{it.quantity}</td><td>{(it.price_cents/100).toFixed(2)}€</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


function DiscountsAdmin(){
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ code:'', percent_off:'', amount_off_cents:'', active:true })
  const hdr = useAuthHeader()
  const load = async () => {
    const res = await axios.get('/api/admin/discounts', hdr)
    setItems(res.data)
  }
  useEffect(()=>{ load() }, [])

  const add = async () => {
    const payload = { ...form }
    payload.percent_off = form.percent_off ? Number(form.percent_off) : null
    payload.amount_off_cents = form.amount_off_cents ? Number(form.amount_off_cents) : null
    await axios.post('/api/admin/discounts', payload, hdr)
    setForm({ code:'', percent_off:'', amount_off_cents:'', active:true })
    await load()
  }

  const toggle = async (d) => {
    await axios.put(`/api/admin/discounts/${d.id}`, { active: !d.active }, hdr)
    await load()
  }
  const del = async (d) => {
    await axios.delete(`/api/admin/discounts/${d.id}`, hdr)
    await load()
  }

  return (
    <div className="card">
      <h3>Nuovo codice</h3>
      <div className="form-row">
        <div><label>Codice</label><input value={form.code} onChange={e=>setForm({...form, code:e.target.value})} /></div>
        <div><label>% sconto</label><input value={form.percent_off} onChange={e=>setForm({...form, percent_off:e.target.value})} /></div>
      </div>
      <div className="form-row">
        <div><label>Importo fisso (cent)</label><input value={form.amount_off_cents} onChange={e=>setForm({...form, amount_off_cents:e.target.value})} /></div>
        <div><label>Attivo</label>
          <select value={form.active} onChange={e=>setForm({...form, active:e.target.value==='true'})}>
            <option value="true">Sì</option>
            <option value="false">No</option>
          </select></div>
      </div>
      <button className="btn" onClick={add}>Crea</button>

      <h3 style={{marginTop:20}}>Elenco</h3>
      <table className="table">
        <thead><tr><th>ID</th><th>Codice</th><th>%</th><th>Fisso</th><th>Attivo</th><th></th></tr></thead>
        <tbody>
          {items.map(d => (
            <tr key={d.id}>
              <td>#{d.id}</td>
              <td>{d.code}</td>
              <td>{d.percent_off||'-'}</td>
              <td>{d.amount_off_cents? (d.amount_off_cents/100).toFixed(2)+'€' : '-'}</td>
              <td>{d.active?'Sì':'No'}</td>
              <td style={{display:'flex', gap:6}}>
                <button className="btn ghost" onClick={()=>toggle(d)}>{d.active?'Disattiva':'Attiva'}</button>
                <button className="btn ghost" onClick={()=>del(d)}>Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

async function pickFiles() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => resolve(Array.from(input.files));
    input.click();
  });
}
