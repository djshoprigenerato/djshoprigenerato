// client/src/pages/ProductDetails.jsx
import { useEffect, useState, useCallback } from "react"
import { useParams, Link } from "react-router-dom"
import axios from "axios"
import { addToCart } from "../store/cartStore"

export default function ProductDetails(){
  const { id } = useParams()
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  // gallery state
  const [idx, setIdx] = useState(0)           // indice immagine attuale (card)
  const [lightbox, setLightbox] = useState(false) // overlay aperto?

  useEffect(()=>{
    setLoading(true); setErr(""); setP(null); setIdx(0); setLightbox(false)
    ;(async()=>{
      try{
        const { data } = await axios.get('/api/shop/products', { params: { id } })
        setP(data?.[0] || null)
      }catch(e){ setErr(e?.response?.data?.error || e.message) }
      finally{ setLoading(false) }
    })()
  }, [id])

  const next = useCallback((total)=> setIdx(i => (i + 1) % total), [])
  const prev = useCallback((total)=> setIdx(i => (i - 1 + total) % total), [])

  // tasti freccia / esc in lightbox
  useEffect(()=>{
    if(!lightbox) return
    const onKey = (e)=>{
      if(e.key === 'Escape') setLightbox(false)
      if(e.key === 'ArrowRight') next(images.length)
      if(e.key === 'ArrowLeft')  prev(images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="container"><div className="card">Caricamento…</div></div>
  if (err) return <div className="container"><div className="card">Errore: {err}</div></div>
  if (!p) return <div className="container"><div className="card">Prodotto non trovato.</div></div>

  const price = ((p.price_eur ?? (p.price_cents/100)) || 0).toFixed(2)
  const images = (p.product_images || []).map(i => i.url).filter(Boolean)
  const hasImages = images.length > 0
  const cover = hasImages ? images[idx] : '/placeholder.png'

  return (
    <div className="container">
      <Link className="btn ghost" to="/prodotti">← Torna ai prodotti</Link>

      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:16, marginTop:12}}>
        <div className="card">
          {/* main image with nav controls */}
          <div style={{position:'relative'}}>
            <img
              className="product-img"
              src={cover}
              alt={p.title}
              style={{cursor: hasImages ? 'zoom-in' : 'default'}}
              onClick={()=> hasImages && setLightbox(true)}
            />
            {hasImages && images.length > 1 && (
              <>
                <button
                  aria-label="Immagine precedente"
                  className="nav-btn left"
                  onClick={()=>prev(images.length)}
                  style={navBtnStyle('left')}
                >‹</button>
                <button
                  aria-label="Immagine successiva"
                  className="nav-btn right"
                  onClick={()=>next(images.length)}
                  style={navBtnStyle('right')}
                >›</button>
              </>
            )}
          </div>

          {/* thumbnails */}
          {hasImages && images.length > 1 && (
            <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
              {images.map((u, i)=>(
                <button
                  key={i}
                  onClick={()=>setIdx(i)}
                  title={`Immagine ${i+1}`}
                  style={{
                    padding:0, border:'1px solid var(--line)', borderRadius:8,
                    outline: i===idx ? '2px solid orange' : 'none', lineHeight:0, background:'transparent',
                    cursor:'pointer'
                  }}
                >
                  <img src={u} alt={`img-${i}`} style={{width:90, height:90, objectFit:'cover', borderRadius:8}}/>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>{p.title}</h3>
          <div className="price" style={{fontSize:20}}>{price}€</div>
          <p style={{whiteSpace:'pre-wrap'}}>{p.description || '-'}</p>
          <div style={{display:'flex', gap:8}}>
            <button className="btn" onClick={()=>{
              addToCart(p, 1)
              window.dispatchEvent(new CustomEvent('toast', { detail: 'Aggiunto nel carrello' }))
            }}>Aggiungi al carrello</button>
            <Link className="btn ghost" to="/carrello">Vai al carrello</Link>
          </div>
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightbox && hasImages && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={()=>setLightbox(false)}
          style={lightboxStyles.backdrop}
        >
          <div
            style={lightboxStyles.inner}
            onClick={(e)=>e.stopPropagation()}
          >
            <img
              src={images[idx]}
              alt={`${p.title} - ${idx+1}/${images.length}`}
              style={lightboxStyles.image}
              onClick={()=>next(images.length)}
              title="Click per andare avanti"
            />
            <button
              aria-label="Chiudi"
              onClick={()=>setLightbox(false)}
              style={closeBtnStyle}
            >✕</button>
            {images.length > 1 && (
              <>
                <button
                  aria-label="Precedente"
                  onClick={()=>prev(images.length)}
                  style={lbArrowStyle('left')}
                >‹</button>
                <button
                  aria-label="Successiva"
                  onClick={()=>next(images.length)}
                  style={lbArrowStyle('right')}
                >›</button>
              </>
            )}
            {/* pager */}
            <div style={pagerStyle}>{idx+1} / {images.length}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- styles helpers (inline, senza CSS esterno) ---------------- */

function navBtnStyle(side){
  return ({
    position:'absolute',
    top:'50%', transform:'translateY(-50%)',
    [side]:8,
    width:36, height:36, borderRadius:'50%', border:'1px solid var(--line)',
    background:'rgba(0,0,0,.5)', color:'#fff',
    display:'grid', placeItems:'center', cursor:'pointer'
  })
}

const lightboxStyles = {
  backdrop: {
    position:'fixed', inset:0, background:'rgba(0,0,0,.8)',
    display:'grid', placeItems:'center', zIndex:1000, padding:16
  },
  inner: {
    position:'relative', maxWidth:'min(96vw, 1200px)', width:'100%', height:'min(90vh, 900px)',
    display:'grid', placeItems:'center'
  },
  image: {
    maxWidth:'100%', maxHeight:'100%', borderRadius:12, boxShadow:'0 10px 40px rgba(0,0,0,.5)', cursor:'pointer'
  }
}

const closeBtnStyle = {
  position:'absolute', top:8, right:8, width:40, height:40, borderRadius:'50%',
  border:'1px solid rgba(255,255,255,.3)', background:'rgba(0,0,0,.5)', color:'#fff',
  display:'grid', placeItems:'center', cursor:'pointer', fontSize:18
}

function lbArrowStyle(side){
  return ({
    position:'absolute', top:'50%', transform:'translateY(-50%)',
    [side]:8, width:48, height:48, borderRadius:'50%',
    border:'1px solid rgba(255,255,255,.3)', background:'rgba(0,0,0,.5)', color:'#fff',
    display:'grid', placeItems:'center', cursor:'pointer', fontSize:28
  })
}

const pagerStyle = {
  position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)',
  color:'#fff', fontSize:14, background:'rgba(0,0,0,.5)', padding:'4px 10px', borderRadius:999
}
