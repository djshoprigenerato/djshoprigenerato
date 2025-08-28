import { useEffect, useState } from "react"
import axios from "axios"

export default function Terms(){
  const [page, setPage] = useState({ title:'Termini e Condizioni', content_html:'<p>Caricamento…</p>' })
  useEffect(()=>{
    (async ()=>{
      try{
        const res = await axios.get('/api/shop/pages/terms')
        if (res.data) setPage(res.data)
      } catch (e){
        setPage(p=>({ ...p, content_html:'<p>Impossibile caricare i termini.</p>' }))
      }
    })()
  },[])
  return (
    <div className="container">
      <h1>{page.title}</h1>
      {/* Il contenuto è HTML controllato dall’admin */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: page.content_html }} />
    </div>
  )
}
