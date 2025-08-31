// client/src/pages/About.jsx
export default function About() {
  return (
    <div className="container">
      <h1>Chi siamo</h1>

      <div className="card">
        <p>
          DJ Shop Rigenerato nasce da una passione condivisa da <strong>sette DJ</strong> uniti da un’unica missione: 
          dare nuova vita alle attrezzature che ci accompagnano da sempre dietro la console.
        </p>

        <p>
          Tra noi ci sono veterani con oltre <strong>35 anni di esperienza</strong>, che hanno calcato palchi e locali storici, 
          e giovani talenti che hanno iniziato da poco il loro percorso musicale. Questa diversità ci arricchisce, 
          unendo l’esperienza dei più esperti con l’entusiasmo delle nuove generazioni.
        </p>

        <p>
          La nostra avventura è cominciata in modo semplice: riparando un <em>mixer</em> personale ormai destinato al pensionamento. 
          Quella prima sfida ci ha fatto scoprire una nuova passione: <strong>ricondizionare e rigenerare strumenti DJ</strong>. 
          Da lì è stato un crescendo: prima le riparazioni per gli amici, poi per altri DJ della zona, fino a diventare un punto 
          di riferimento in tutta la regione.
        </p>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>La nostra missione</h2>
        <p>
          Crediamo che ogni attrezzatura abbia una seconda possibilità. Rigenerare significa 
          <strong> risparmiare, rispettare l’ambiente e garantire qualità</strong> senza compromessi.  
          Ogni prodotto che passa tra le nostre mani viene testato, revisionato e riportato a nuova vita, pronto a regalare ancora emozioni a chi lo utilizza.
        </p>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Perché scegliere noi</h2>
        <ul>
          <li><strong>Esperienza diretta sul campo</strong>: siamo prima di tutto DJ, conosciamo le esigenze di chi suona.</li>
          <li><strong>Passione e competenza tecnica</strong>: ogni ricondizionamento è fatto con cura maniacale.</li>
          <li><strong>Garanzia di affidabilità</strong>: non vendiamo nulla che non useremmo noi stessi in una serata.</li>
          <li><strong>Sostenibilità</strong>: ridiamo vita alle attrezzature evitando sprechi e riducendo rifiuti elettronici.</li>
        </ul>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Il nostro futuro</h2>
        <p>
          DJ Shop Rigenerato non è solo un e-commerce, ma un progetto di <strong>comunità per DJ e appassionati</strong>.  
          Vogliamo che ogni cliente si senta parte del nostro percorso: dal principiante che acquista il suo primo controller 
          al professionista che cerca un ricambio raro.
        </p>

        <p>
          Con questo sito vogliamo condividere la nostra esperienza e offrire a tutti strumenti affidabili, rigenerati e garantiti.  
          La musica ci unisce, e con DJ Shop Rigenerato vogliamo fare in modo che la passione per il DJing sia accessibile a chiunque.
        </p>
      </div>
    </div>
  );
}
