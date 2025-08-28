
export default function Footer() {
  return (
    <footer className="footer">
      <img src="/logo.jpg" alt="Logo" style={{width:54, height:54, borderRadius:10, marginBottom:8}}/>
      <p><strong>DJ Shop Rigenerato!</strong> — <em>Re-mix, re-fix, re-use</em></p>
      <p className="badge">Consegna sempre gratuita con SDA e GLS</p>
      <div style={{display:'flex', gap:18, justifyContent:'center', marginTop:10}}>
        <img src="/courier-sda.svg" alt="SDA" width="70"/>
        <img src="/courier-gls.svg" alt="GLS" width="70"/>
      </div>
      <p style={{marginTop:16, fontSize:13}}>© {new Date().getFullYear()} DJ Shop Rigenerato! — Tutti i diritti riservati.</p>
    </footer>
  )
}
