// client/src/pages/AdminDashboard.jsx
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

async function getAuthConfig(maxTries = 10, delayMs = 100) {
  for (let i = 0; i < maxTries; i++) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (token) return { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
    await new Promise(r => setTimeout(r, delayMs))
  }
  return { headers: { 'Content-Type': 'application/json' } }
}

function ProductsAdmin(){
  const [items, setItems] = useState([])
  const [cats, setCats] = useState([])
  const [form, setForm] = useState({ title:'', description:'', price_eur:'', stock:0, is_active:true, category_id:'' })

  const load = async () => {
    try {
      const cfg = await getAuthConfig()
      const [resP, resC] = await Promise.all([
        axios.get('/api/admin/products', cfg),
        axios.get('/api/admin/categories', cfg)
      ])
      setItems(resP.data); setCats(resC.data)
    } catch (e) { alert('Errore caricamento: ' + (e?.response?.data?.error || e.message)) }
  }
  useEffect(()=>{ load() }, [])

  const create = async () => {
    try {
      if (!form.title) return alert('Titolo obbligatorio')
      const cfg = await getAuthConfig()
      const payload = { ...form, price_eur: Number(form.price_eur || 0) }
      payload.category_id = form.category_id ? Number(form.category_id) : null
      await axios.post('/api/admin/products', payload, cfg)
      setForm({ title:'', description:'', price_eur:'', stock:0, is_active:true, category_id:'' })
      await load(); alert('Prodotto creato. Ora carica le immagini.')
    } catch (e) { alert('Errore creazione prodotto: ' + (e?.response?.data?.error || e.message)) }
  }

  const pickFiles = () => new Promise((resolve)=>{ const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.multiple=true; input.onchange=()=>resolve(Array.from(input.files)); input.click() })

  const uploadImages = async (p) => {
    try {
      const cfg = await getAuthConfig()
      const bucket = 'uploads'
      const files = await pickFiles()
      for (const file of files) {
        const path = `${p.id}/${Date.now()}-${file.name}`
        const { data, error } = await supabase.storage.from(bucket).upload(path, file)
        if(!error) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
          await axios.post(`/api/admin/products/${p.id}/images`, { path, url: pub.publicUrl }, cfg)
        } else { alert('Errore upload immagine: ' + error.message) }
      }
      await load()
    } catch (e) { alert('Errore caricamento immagini: ' + (e?.response?.data?.error || e.message)) }
  }

  const del = async (id) => {
    if(!confirm('Eliminare il prodotto e le sue immagini?')) return
    const cfg = await getAuthConfig()
    await axios.delete(`/api/admin/products/${id}`, cfg)
    await load()
  }

  return (
    <div className="card">
      <h3>Nuovo prodotto</h3>
      <div className="form-row">
        <div><label>Titolo</label><input value={form.title} onChange={e=>setForm({...form, title:e.target.value})}/></div>
        <div><label>Prezzo (€)</label><input type="number" step="0.01" value={form.price_eur} onChange={e=>setForm({...form, price_eur:e.target.value})}/></div>
      </div>
      <label>Descrizione</label>
      <textarea rows="3" value={form.description} onChange={e=>setForm({...form, description:e.target.value})}></textarea>
      <div className="form-row">
        <div><label>Stock</label><input type="number" value={form.stock} onChange={e=>setForm({...form, stock:Number(e.target.value)})}/></div>
        <div><label>Attivo</label>
          <select value={form.is_active} onChange={e=>setForm({...form, is_active:e.target.value==='true'})}>
            <option value="true">Sì</option><option value="false">No</option>
          </select>
        </div>
      </div>
      <label>Categoria</label>
      <select value={form.category_id} onChange={e=>setForm({...form, category_id:e.target.value})}>
        <option value="">— Seleziona categoria —</option>
        {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button className="btn" style={{marginTop:10}} onClick={create}>Crea</button>

      <h3 style={{marginTop:20}}>Lista prodotti</h3>
      <table className="table">
        <thead><tr><th>ID</th><th>Titolo</th><th>Prezzo</th><th>Categoria</th><th>Immagini</th><th></th></tr></thead>
        <tbody>
          {items.map(p => (
            <tr key={p.id}>
              <td>#{p.id}</td><td>{p.title}</td><td>{(p.price_cents/100).toFixed(2)}€</td><td>{p.category_id || '-'}</td><td>{p.product_images?.length||0}</td>
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
  const [description, setDescription] = useState('')

  const load = async () => {
    try {
      const cfg = await getAuthConfig()
      const res = await axios.get('/api/admin/categories', cfg)
      setItems(res.data)
    } catch (e) { alert('Errore caricamento categorie: ' + (e?.response?.data?.error || e.message)) }
  }
  useEffect(()=>{ load() }, [])

  const add = async () => {
    try {
      const cfg = await getAuthConfig()
      await axios.post('/api/admin/categories', { name, description }, cfg)
      setName(''); setDescription(''); await load()
    } catch (e) { alert('Errore creazione categoria: ' + (e?.response?.data?.error || e.message)) }
  }

  const del = async (id) => {
    try {
      const cfg = await getAuthConfig()
      await axios.delete(`/api/admin/categories/${id}`, cfg)
      await load()
    } catch (e) {
      alert('Errore eliminazione categoria: ' + (e?.response?.data?.error || e.message))
    }
  }

  return (
    <div className="card">
      <h3>Nuova categoria</h3>
      <div className="form-row">
        <div><label>Nome</label><input value={name} onChange={e=>setName(e.target.value)} /></div>
        <div><label>Descrizione</label><input value={description} onChange={e=>setDescription(e.target.value)} /></div>
      </div>
      <button className="btn" onClick={add}>Crea</button>

      <h3 style={{marginTop:20}}>Categorie</h3>
      <ul>
        {(items||[]).map(c => <li key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0'}}>
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
  const load = async () => { const cfg = await getAuthConfig(); const res = await axios.get('/api/admin/orders', cfg); setItems(res.data) }
  const open = async (id) => { const cfg = await getAuthConfig(); const res = await axios.get('/api/admin/orders/'+id, cfg); setDetail(res.data) }
  useEffect(()=>{ load() }, [])

  return (
    <div className="card">
      <h3>Tutti gli ordini</h3>
      <table className="table">
        <thead><tr><th>ID</th><th>Data</th><th>Stato</th><th>Cliente</th><th>Totale</th><th></th></tr></thead>
        <tbody>{items.map(o => (
          <tr key={o.id}>
            <td>#{o.id}</td><td>{new Date(o.created_at).toLocaleString()}</td><td>{o.status}</td>
            <td>{o.customer_name || o.customer_email}</td><td>{(o.total_cents/100).toFixed(2)}€</td>
            <td><button className="btn ghost" onClick={()=>open(o.id)}>Dettagli</button></td>
          </tr>
        ))}</tbody>
      </table>
      {detail && (
        <div style={{marginTop:16}} className="card">
          <h3>Dettaglio ordine #{detail.id}</h3>
          <p><strong>Cliente:</strong> {detail.customer_name} ({detail.customer_email})</p>
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(detail.shipping_address, null, 2)}</pre>
          <table className="table">
            <thead><tr><th>Articolo</th><th>Q.tà</th><th>Prezzo</th></tr></thead>
            <tbody>{(detail.order_items||[]).map(it => (
              <tr key={it.id}><td>{it.title}</td><td>{it.quantity}</td><td>{(it.price_cents/100).toFixed(2)}€</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DiscountsAdmin(){
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ code:'', percent_off:'', amount_off_cents:'', active:true })

  const load = async () => { const cfg = await getAuthConfig(); const res = await axios.get('/api/admin/discounts', cfg); setItems(res.data) }
  useEffect(()=>{ load() }, [])

  const add = async () => {
    const cfg = await getAuthConfig()
    const payload = { ...form }
    payload.percent_off = form.percent_off ? Number(form.percent_off) : null
    payload.amount_off_cents = form.amount_off_cents ? Number(form.amount_off_cents) : null
    await axios.post('/api/admin/discounts', payload, cfg)
    setForm({ code:'', percent_off:'', amount_off_cents:'', active:true })
    await load()
  }
  const toggle = async (d) => { const cfg = await getAuthConfig(); await axios.put(`/api/admin/discounts/${d.id}`, { active: !d.active }, cfg); await load() }
  const del = async (d) => { const cfg = await getAuthConfig(); await axios.delete(`/api/admin/discounts/${d.id}`, cfg); await load() }

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
            <option value="true">Sì</option><option value="false">No</option>
          </select>
        </div>
      </div>
      <button className="btn" onClick={add}>Crea</button>

      <h3 style={{marginTop:20}}>Elenco</h3>
      <table className="table">
        <thead><tr><th>ID</th><th>Codice</th><th>%</th><th>Fisso</th><th>Attivo</th><th></th></tr></thead>
        <tbody>{items.map(d => (
          <tr key={d.id}>
            <td>#{d.id}</td><td>{d.code}</td><td>{d.percent_off||'-'}</td>
            <td>{d.amount_off_cents? (d.amount_off_cents/100).toFixed(2)+'€' : '-'}</td>
            <td>{d.active?'Sì':'No'}</td>
            <td style={{display:'flex', gap:6}}>
              <button className="btn ghost" onClick={()=>toggle(d)}>{d.active?'Disattiva':'Attiva'}</button>
              <button className="btn ghost" onClick={()=>del(d)}>Elimina</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}
