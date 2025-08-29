export default function Footer() {
  return (
    <footer style={{padding:'20px 0', textAlign:'center', opacity:.9}}>
      <div className="badge free">Consegna sempre gratuita con SDA e GLS</div>
      <p style={{marginTop:8}}>© {new Date().getFullYear()} DJ Shop Rigenerato! — Re-mix, re-fix, re-use</p>
    </footer>
  );
}
