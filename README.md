
# DJ Shop Rigenerato! — Full‑stack E‑commerce (Render + Supabase + Stripe)

**Slogan:** _Re-mix, re-fix, re-use_  
**Tech:** React (Vite) + Express + Supabase (DB + Auth + Storage) + Stripe (payments)

---

## 1) Setup (Supabase)
1. Create a new project on Supabase.
2. In **Storage**, create a bucket named **`uploads`** (public).
3. Open the SQL Editor and run the SQL in `server/schema.sql` (tables + basic RLS).
4. In **Authentication → Users**, create your admin account and set its **app_metadata** to:
   ```json
   { "role": "admin" }
   ```
   (Or any value you prefer, but keep `ADMIN_ROLE_NAME` in env matching it).

## 2) Environment Variables (Render.com → your service → Environment)
Required (mark **all** as Private):
- `VITE_SUPABASE_URL` – your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` – Supabase anon key (for client)
- `SUPABASE_URL` – same as above
- `SUPABASE_SERVICE_ROLE_KEY` – Supabase service role key (server-side only)
- `STRIPE_SECRET_KEY` – your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` – webhook secret from the Stripe Dashboard (after creating the endpoint)
- `SITE_URL` – public site URL (e.g. `https://djshop.onrender.com`)
- `UPLOADS_BUCKET` – `uploads` (default)
- `ADMIN_ROLE_NAME` – `admin` (default)

## 3) Install & Run Locally
```bash
# Node 20+
npm install
# Build the client
npm run build
# Start server (serves built client + API)
npm start
# App runs by default on http://localhost:3000
```

> For local Stripe webhooks, use the Stripe CLI:  
> `stripe listen --forward-to localhost:3000/api/stripe-webhook`  
> Then set the outputted signing secret as `STRIPE_WEBHOOK_SECRET`.

## 4) Stripe
- The checkout session is created server-side (`POST /api/create-checkout-session`).
- Webhook (`/api/stripe-webhook`) confirms payments and stores orders/details.
- Discount codes are managed in-app (DB table `discount_codes`). The server applies the discount to line item prices and records which code was used.

## 5) Admin
- Log in with your admin user → navigate to **/admin**.
- CRUD categories/products (multi-image). Uploads go to the Supabase bucket `uploads/PRODUCT_ID/...`.
- Deleting a product cascades: DB rows + bucket files removed.
- View all orders, inspect detail pages with customer data.
- Create/enable/disable **discount codes**.

## 6) Pages
- Home, Products (+detail), Cart, Checkout, Orders (for logged-in users), Terms, Payments, Shipping (SDA+GLS free delivery), About.
- Guest checkout is supported (no login required).

## 7) Notes
- The UI palette is derived from the provided logo (orange/green/charcoal/cream).
- The logo file lives at `client/public/logo.jpg` and is used in the header/footer.
