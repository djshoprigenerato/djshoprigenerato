# DJSHOPRIGENERATO (Cloud Edition)

Stack: Render (free web service) + Supabase (free Postgres + Storage).  
Spedizione sempre gratuita (SDA & GLS). Stripe opzionale.

## Deploy 100% da browser (nessuna operazione locale)

1) **Supabase (gratis)**
   - Vai su https://supabase.com/ e crea un progetto Free.
   - Copia `DATABASE_URL` (Project Settings -> Database -> Connection string).
   - Crea un bucket Storage pubblico chiamato **uploads** (Storage -> New bucket -> Public).
   - Prendi `SUPABASE_URL` e **Service Role Key** (Project Settings -> API).

2) **Render (gratis)**
   - Vai su https://render.com/ e crea un account.
   - Crea un **nuovo repository** su GitHub (web) e carica i file di questa cartella (drag & drop).
   - Su Render: New -> Web Service -> Connect repository.
   - Aggiungi le **Environment Variables**:
     - `SESSION_SECRET`: stringa lunga
     - `BASE_URL`: es. `https://shop.tuodominio.it`
     - `DATABASE_URL`: la stringa Postgres di Supabase
     - `SUPABASE_URL`: url del tuo progetto
     - `SUPABASE_SERVICE_ROLE_KEY`: chiave service role
     - (opz) `STRIPE_SECRET_KEY` e `STRIPE_PUBLISHABLE_KEY`
   - Start command: `node server.js` (gia in render.yaml). Piano: **Free**.

3) **Inizializza DB**
   - Nella pagina del servizio Render -> Shell (o via "Jobs"): esegui
     - `npm run initdb`
     - `npm run seed` (dati demo)

4) **Dominio (register.it)**
   - Su Render -> Custom Domains: aggiungi `shop.tuodominio.it` (o il tuo dominio principale).
   - Su register.it imposta un **CNAME** del tuo host verso il dominio onrender.com indicato da Render.
   - Attiva HTTPS automatico su Render.

5) **Stripe (facoltativo)**
   - Inserisci chiavi test, prova un pagamento.
   - Poi passa a chiavi live.

Note: Il file system di Render (piano Free) e effimero. Le **immagini** e i **dati** sono su Supabase, quindi persistenti.
