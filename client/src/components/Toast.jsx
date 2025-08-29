// client/src/components/Toast.jsx
import { useEffect, useState } from "react";

export default function Toast() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const onToast = (e) => {
      setMsg(String(e.detail || ''));
      setTimeout(() => setMsg(''), 1800);
    };
    window.addEventListener('toast', onToast);
    return () => window.removeEventListener('toast', onToast);
  }, []);
  if (!msg) return null;
  return (
    <div style={{
      position:'fixed', right:16, bottom:16, zIndex:9999,
      background:'var(--panel)', border:'1px solid var(--line)',
      borderRadius:'12px', padding:'10px 14px', boxShadow:'var(--shadow)'
    }}>
      {msg}
    </div>
  );
}
