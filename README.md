# DJ Shop Rigenerato!

Full-stack app (Express + React + Supabase + Stripe) pronta per Render.

## Variabili d'ambiente (Render → Environment)
- SITE_URL = https://www.djshoprigenerato.eu
- SUPABASE_URL = https://<tuo-progetto>.supabase.co
- SUPABASE_ANON_KEY = <anon>
- SUPABASE_SERVICE_ROLE_KEY = <service role>
- ADMIN_ROLE_NAME = admin
- UPLOADS_BUCKET = uploads
- STRIPE_SECRET_KEY = sk_test_...
- STRIPE_WEBHOOK_SECRET = whsec_...

## Supabase
- Bucket `uploads` pubblico (read) e policy di upload per utenti autenticati.
- Tabelle: categories, products, product_images, discount_codes, orders, order_items.

## Build/Run
npm install
npm run build
npm start

Deployment su Render già configurato (vedi render.yaml).
