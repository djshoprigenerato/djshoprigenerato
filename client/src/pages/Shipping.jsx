
export default function Shipping(){
  return (
    <div className="container">
      <h1>Spedizione</h1>
      <div className="card">
        <p>La consegna è <strong>sempre gratuita</strong> con i corrieri:</p>
        <ul>
          <li>SDA</li>
          <li>GLS</li>
        </ul>
        <div style={{display:'flex', gap:18}}>
          <img src="/courier-sda.svg" alt="SDA" width="100"/>
          <img src="/courier-gls.svg" alt="GLS" width="100"/>
        </div>
        <p>Tempi di consegna standard: 2–4 giorni lavorativi in Italia.</p>
      </div>
    </div>
  )
}
