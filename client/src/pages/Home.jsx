import { useEffect, useState } from "react"
import axios from "axios"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import ProductCard from "../components/ProductCard"

export default function Home(){
  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')

  // carica categorie
  const loadCats = async () => {
    const res = await axios.get('/api/shop/categories')
    setCats(res.data || [])
  }

  // carica prodotti in base a query e categoria
  const loadProducts = async () => {
    const params = {}
    if (q) params.q = q
    if (cat) params.category_id = cat
    const res = await axios.get('/api/shop/products', { params })
    setItems(res.data || [])
  }

  useEffect(()=>{ loadCats() },[])
  // ricarica prodotti quando cambia categoria o query
  useEffect(()=>{ loadProducts() },[cat, q]) // <— aggiunto q

  // JSON-LD: WebSite con SearchAction
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "DJ Shop Rigenerato",
    "url": "https://djshoprigenerato.eu/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://djshoprigenerato.eu/prodotti?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }

  // JSON-LD: FAQ
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Che differenza c’è tra usato e rigenerato?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "L’usato viene venduto così com’è; il rigenerato viene testato, ripristinato nelle parti soggette a usura e garantito da DJ Shop Rigenerato."
        }
      },
      {
        "@type": "Question",
        "name": "Quanto dura la garanzia sui prodotti rigenerati?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Offriamo garanzia commerciale sui prodotti rigenerati (la durata è indicata nella scheda prodotto). In caso di problemi, assistenza e sostituzione secondo condizioni."
        }
      },
      {
        "@type": "Question",
        "name": "L’attrezzatura rigenerata è adatta a DJ professionisti?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sì. Selezioniamo e testiamo mixer, console, giradischi e casse per assicurare performance affidabili in studio e dal vivo."
        }
      },
      {
        "@type": "Question",
        "name": "Posso permutare il mio usato?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sì, valuteremo il tuo usato e potrai permutarlo con attrezzatura rigenerata. Contattaci dalla pagina Contatti per una quotazione."
        }
      }
    ]
  }

  return (
    <div className="container">
      {/* META SEO */}
      <Helmet>
        <title>DJ Shop Rigenerato | Attrezzatura DJ rigenerata e garantita</title>
        <meta
          name="description"
          content="Mixer, console, giradischi e casse professionali rigenerati e garantiti. Attrezzatura DJ usata revisionata, testata e pronta per suonare."
        />
        <link rel="canonical" href="https://djshoprigenerato.eu/" />

        {/* Open Graph / Twitter */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="DJ Shop Rigenerato | Attrezzatura DJ rigenerata e garantita" />
        <meta property="og:description" content="Mixer, console, giradischi e casse rigenerati e garantiti. Usato revisionato, testato e pronto per suonare." />
        <meta property="og:url" content="https://djshoprigenerato.eu/" />
        {/* Inserisci un'anteprima se hai un’immagine:
        <meta property="og:image" content="https://djshoprigenerato.eu/og-cover.jpg" /> */}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="DJ Shop Rigenerato | Attrezzatura DJ rigenerata e garantita" />
        <meta name="twitter:description" content="Mixer, console, giradischi e casse rigenerati e garantiti." />
        {/* <meta name="twitter:image" content="https://djshoprigenerato.eu/og-cover.jpg" /> */}

        {/* JSON-LD */}
        <script type="application/ld+json">{JSON.stringify(websiteLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>

      {/* HERO */}
      <div className="hero">
        <div style={{ textAlign: "center" }}>
          <img
            src="/djshop.png"
            alt="DJ Shop Rigenerato - logo"
            style={{ maxWidth: "220px", width: "100%", height: "auto", marginBottom: 20 }}
          />
          <h1>DJ Shop Rigenerato – Attrezzatura DJ rigenerata e garantita</h1>
          <p>
            Re-mix, re-fix, re-use: <strong>mixer</strong>, <strong>console</strong>, <strong>giradischi</strong> e
            <strong> casse</strong> professionali <strong>rigenerati</strong>, <strong>testati</strong> e{" "}
            <strong>coperti da garanzia</strong>. Qualità pro, prezzo smart.
          </p>
          <div className="hero-actions">
            <Link to="/prodotti" className="btn secondary">Sfoglia tutti i prodotti</Link>
            <Link to="/chi-siamo" className="btn ghost">Chi siamo</Link>
          </div>
        </div>
      </div>

      {/* FILTRI */}
      <div className="filters card">
        <div className="form-row">
          <div>
            <label>Categorie</label>
            <select value={cat} onChange={e=>setCat(e.target.value)}>
              <option value="">— Tutte —</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label>Cerca</label>
            <div style={{display:'flex', gap:8}}>
              <input
                placeholder="Cerca prodotto (es. mixer Pioneer)..."
                value={q}
                onChange={e=>setQ(e.target.value)}
                aria-label="Cerca prodotti"
              />
              <button className="btn" onClick={loadProducts}>Cerca</button>
            </div>
          </div>
        </div>
      </div>

      {/* LINK RAPIDI A CATEGORIE POPOLARI (internal linking) */}
      {cats.length > 0 && (
        <div className="card" style={{marginTop:12}}>
          <strong>Scorciatoie:</strong>{" "}
          {cats.slice(0,6).map((c) => (
            <button
              key={c.id}
              className="btn ghost"
              style={{marginRight:8, marginTop:8}}
              onClick={()=> setCat(c.id)}
              aria-label={`Vai alla categoria ${c.name}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* INTRO SEO */}
      <section className="card" style={{marginTop:12}}>
        <h2>Attrezzatura DJ rigenerata: qualità professionale, prezzo accessibile</h2>
        <p>
          Su <strong>DJ Shop Rigenerato</strong> trovi attrezzatura <strong>DJ rigenerata</strong> e
          <strong> garantita</strong>: <strong>mixer</strong>, <strong>console</strong>, <strong>giradischi</strong>,
          <strong> casse</strong> e <strong>accessori</strong> dei migliori marchi (Pioneer, Technics, Denon, Numark e altri).
          Ogni articolo è <strong>revisionato</strong> e <strong>testato</strong> dai nostri tecnici per offrirti
          affidabilità in studio e nei live set.
        </p>
      </section>

      <h2 style={{marginTop:12}}>Prodotti</h2>
      <div className="grid">
        {items.map(p => <ProductCard key={p.id} p={p} />)}
        {items.length===0 && <p>Nessun prodotto trovato.</p>}
      </div>

      {/* FAQ visibili (matchano il JSON-LD) */}
      <section className="card" style={{marginTop:24}}>
        <h2>FAQ</h2>
        <details>
          <summary><strong>Che differenza c’è tra usato e rigenerato?</strong></summary>
          <p>L’usato viene venduto così com’è; il rigenerato è testato, ripristinato nelle parti soggette a usura e coperto da garanzia.</p>
        </details>
        <details>
          <summary><strong>Quanto dura la garanzia sui prodotti rigenerati?</strong></summary>
          <p>La durata è di 12 mesi. In caso di problemi, assistenza e sostituzione secondo condizioni.</p>
        </details>
        <details>
          <summary><strong>L’attrezzatura rigenerata è adatta a DJ professionisti?</strong></summary>
          <p>Sì, selezioniamo modelli adatti a performance in studio e dal vivo.</p>
        </details>
        <details>
          <summary><strong>Posso permutare il mio usato?</strong></summary>
          <p>Sì, contattaci per una valutazione e proposta di permuta.</p>
        </details>
      </section>
    </div>
  )
}
