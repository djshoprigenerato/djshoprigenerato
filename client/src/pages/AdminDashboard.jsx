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
        <button className={`btn ${tab==='pages'?'secondary':'ghost'}`} onClick={()=>setTab('pages')}>Pagine</button>
        <button className={`btn ${tab==='products'?'secondary':'ghost'}`} onClick={()=>setTab('products')}>Prodotti</button>
        <button className={`btn ${tab==='categories'?'secondary':'ghost'}`} onClick={()=>setTab('categories')}>Categorie</button>
        <button className={`btn ${tab==='orders'?'secondary':'ghost'}`} onClick={()=>setTab('orders')}>Ordini</button>
        <button className={`btn ${tab==='discounts'?'secondary':'ghost'}`} onClick={()=>setTab('discounts')}>Codici Sconto</button>
      </div>
      {tab==='products' && <ProductsAdmin/>}
      {tab==='categories' && <CategoriesAdmin/>}
      {tab==='orders' && <OrdersAdmin/>}
      {tab==='discounts' && <DiscountsAdmin/>}
      {tab==='pages' && <PagesAdmin/>}
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

/* ======================= PRODOTTI ======================= */
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

/* ======================= CATEGORIE ======================= */
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

/* ========================= ORDINI ========================= */
function OrdersAdmin(){
  const [items, setItems] = useState([])
  const [detail, setDetail] = useState(null)
  const [filters, setFilters] = useState({ name:"", city:"", phone:"", email:"", from:"", to:"" })

  const load = async () => {
    const cfg = await getAuthConfig()
    const res = await axios.get('/api/admin/orders', cfg)
    setItems(res.data || [])
  }
  const open = async (id) => {
    const cfg = await getAuthConfig()
    const res = await axios.get('/api/admin/orders/'+id, cfg)
    setDetail(res.data)
  }
  useEffect(()=>{ load() }, [])

  // filtro client-side
  const filtered = items.filter(o=>{
    const n = (o.customer_name||"").toLowerCase()
    const c = (o.shipping_address?.city||"").toLowerCase()
    const p = (o.customer_phone || o.shipping_phone || "").toLowerCase()
    const e = (o.customer_email||"").toLowerCase()
    const ts = new Date(o.created_at).getTime()
    const {name,city,phone,email,from,to} = filters

    const okName = name ? n.includes(name.toLowerCase()) : true
    const okCity = city ? c.includes(city.toLowerCase()) : true
    const okPhone = phone ? p.includes(phone.toLowerCase()) : true
    const okEmail = email ? e.includes(email.toLowerCase()) : true
    const okFrom = from ? ts >= new Date(from).getTime() : true
    const okTo = to ? ts <= new Date(to).getTime() : true

    return okName && okCity && okPhone && okEmail && okFrom && okTo
  })

  // CSV: una riga per ogni ARTICOLO (così tutti gli articoli sono inclusi)
  const exportCSV = () => {
    const rows = [["OrderID","Data","Stato","Cliente","Email","Telefono","Città","Totale(€)","Articolo","Q.tà","Prezzo(€)"]]
    filtered.forEach(o=>{
      const city = o.shipping_address?.city || ""
      const phone = o.customer_phone || o.shipping_phone || ""
      const created = new Date(o.created_at).toLocaleString()
      const base = [o.id, created, o.status, o.customer_name||"", o.customer_email||"", phone, city, (o.total_cents/100).toFixed(2)]
      const items = (o.order_items||[])
      if (items.length === 0) {
        rows.push([...base, "", "", ""])
      } else {
        items.forEach(it=>{
          rows.push([...base, it.title, it.quantity, (it.price_cents/100).toFixed(2)])
        })
      }
    })
    const csv = rows.map(r=>r.map(v=>`"${(v??"").toString().replace(/"/g,'""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type:"text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "ordini.csv"
    a.click()
  }

  // PDF semplice via finestra di stampa
  const exportPDF = () => {
    const win = window.open("", "_blank")
    if(!win) return
    win.document.write("<h1>Ordini</h1>")
    win.document.write("<table border=1 cellspacing=0 cellpadding=4><tr><th>ID</th><th>Data</th><th>Cliente</th><th>Email</th><th>Telefono</th><th>Città</th><th>Totale</th><th>Articoli</th></tr>")
    filtered.forEach(o=>{
      const items = (o.order_items||[]).map(it=>`${it.title}×${it.quantity} (€${(it.price_cents/100).toFixed(2)})`).join("<br>")
      win.document.write(
        `<tr>
          <td>${o.id}</td>
          <td>${new Date(o.created_at).toLocaleString()}</td>
          <td>${o.customer_name||""}</td>
          <td>${o.customer_email||""}</td>
          <td>${o.customer_phone||o.shipping_phone||""}</td>
          <td>${o.shipping_address?.city||""}</td>
          <td>€${(o.total_cents/100).toFixed(2)}</td>
          <td>${items}</td>
        </tr>`
      )
    })
    win.document.write("</table><script>window.print()</script>")
    win.document.close()
  }

  return (
    <div className="card">
      <h3>Tutti gli ordini</h3>

      {/* FILTRI */}
      <div className="form-row" style={{marginBottom:8}}>
        <input placeholder="Nome" value={filters.name} onChange={e=>setFilters({...filters,name:e.target.value})}/>
        <input placeholder="Città" value={filters.city} onChange={e=>setFilters({...filters,city:e.target.value})}/>
      </div>
      <div className="form-row" style={{marginBottom:8}}>
        <input placeholder="Telefono" value={filters.phone} onChange={e=>setFilters({...filters,phone:e.target.value})}/>
        <input placeholder="Email" value={filters.email} onChange={e=>setFilters({...filters,email:e.target.value})}/>
      </div>
      <div className="form-row" style={{marginBottom:8}}>
        <div>
          <label>Dal</label>
          <input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/>
        </div>
        <div>
          <label>Al</label>
          <input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/>
        </div>
      </div>
      <div style={{margin:"10px 0", display:"flex", gap:8}}>
        <button className="btn" onClick={exportCSV}>Esporta CSV</button>
        <button className="btn ghost" onClick={exportPDF}>Esporta PDF</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th><th>Data</th><th>Stato</th>
            <th>Cliente</th><th>Email</th><th>Telefono</th><th>Totale</th><th></th>
          </tr>
        </thead>
        <tbody>{filtered.map(o=>(
          <tr key={o.id}>
            <td>#{o.id}</td>
            <td>{new Date(o.created_at).toLocaleString()}</td>
            <td>{o.status}</td>
            <td>{o.customer_name}</td>
            <td>{o.customer_email}</td>
            <td>{o.customer_phone||o.shipping_phone||""}</td>
            <td>{(o.total_cents/100).toFixed(2)}€</td>
            <td><button className="btn ghost" onClick={()=>open(o.id)}>Dettagli</button></td>
          </tr>
        ))}</tbody>
      </table>

      {detail && (
        <div style={{marginTop:16}} className="card">
          <h3>Dettaglio ordine #{detail.id}</h3>
          <p>
            <strong>Cliente:</strong> {detail.customer_name} ({detail.customer_email})<br/>
            <strong>Telefono:</strong> {detail.customer_phone||detail.shipping_phone||"-"}
          </p>
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(detail.shipping_address, null, 2)}</pre>
          <table className="table">
            <thead><tr><th>Articolo</th><th>Q.tà</th><th>Prezzo</th></tr></thead>
            <tbody>{(detail.order_items||[]).map((it,idx) => (
              <tr key={idx}><td>{it.title}</td><td>{it.quantity}</td><td>{(it.price_cents/100).toFixed(2)}€</td></tr>
            ))}</tbody>
          </table>
          <div style={{marginTop:10}}>
            <button className="btn ghost" onClick={()=>window.print()}>Stampa</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==================== CODICI SCONTO ==================== */
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

/* ======================== PAGINE ======================== */
function PagesAdmin(){
  const [title, setTitle] = useState('Termini e Condizioni')
  const [html, setHtml] = useState('')

  const load = async () => {
    try{
      const cfg = await getAuthConfig()
      const res = await axios.get('/api/admin/pages/terms', cfg)
      setTitle(res.data?.title || 'Termini e Condizioni')
      setHtml(res.data?.content_html || '')
    }catch(e){ alert('Errore caricamento termini: ' + (e?.response?.data?.error || e.message)) }
  }
  useEffect(()=>{ load() }, [])

  const save = async () => {
    try{
      const cfg = await getAuthConfig()
      await axios.put('/api/admin/pages/terms', { title, content_html: html }, cfg)
      alert('Termini salvati.')
    }catch(e){ alert('Errore salvataggio: ' + (e?.response?.data?.error || e.message)) }
  }

  return (
    <div className="card">
      <h3>Termini e Condizioni</h3>
      <label>Titolo</label>
      <input value={title} onChange={e=>setTitle(e.target.value)} />
      <label>Contenuto (HTML)</label>
      <textarea rows="16" value={html} onChange={e=>setHtml(e.target.value)} placeholder="<h2>1. Oggetto</h2>..." />
      <div style={{display:'flex', gap:8, marginTop:10}}>
        <button className="btn" onClick={save}>Salva</button>
        <a className="btn ghost" href="/termini" target="_blank" rel="noreferrer">Vedi pagina</a>
      </div>
    </div>
  )
}
