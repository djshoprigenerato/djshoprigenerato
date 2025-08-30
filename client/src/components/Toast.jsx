import { useEffect, useState } from "react";

export default function Toast(){
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);

  useEffect(()=>{
    const handler = (e) => {
      const text = (e?.detail || "").toString();
      if(!text) return;
      setMsg(text);
      setShow(true);
      clearTimeout(window.__toastTO);
      window.__toastTO = setTimeout(()=> setShow(false), 1800);
    };
    window.addEventListener("toast", handler);
    return () => window.removeEventListener("toast", handler);
  }, []);

  return (
    <div style={{
      position:'fixed', right:16, bottom:16, zIndex:9999,
      transition:'transform .2s ease, opacity .2s ease',
      transform: show ? 'translateY(0)' : 'translateY(10px)',
      opacity: show ? 1 : 0
    }}>
      <div className="card" style={{padding:'10px 14px'}}>{msg}</div>
    </div>
  );
}