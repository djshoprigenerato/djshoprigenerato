// client/src/components/Toast.jsx
import { useEffect, useState } from "react"

export default function Toast(){
  const [msg, setMsg] = useState("")

  useEffect(()=>{
    const on = (e) => {
      setMsg(String(e.detail || ""))
      setTimeout(()=> setMsg(""), 2200)
    }
    window.addEventListener('toast', on)
    return () => window.removeEventListener('toast', on)
  }, [])

  if (!msg) return null
  return (
    <div style={{
      position:'fixed', right:16, bottom:16, zIndex:9999,
      background:'var(--panel)', color:'var(--text)', border:'1px solid var(--line)',
      padding:'10px 14px', borderRadius:12, boxShadow:'var(--shadow)'
    }}>{msg}</div>
  )
}
