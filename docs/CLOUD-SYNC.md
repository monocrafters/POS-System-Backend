# POS Cloud Sync — Supabase (PostgreSQL)

Desktop and mobile share **one cloud database** automatically. Users do **not** add any database in the app.

## How it works

| Device | Local storage | Online |
|--------|---------------|--------|
| **Desktop** | SQLite (offline POS works) | Auto-push to Supabase **relational tables** every 30s + after every change |
| **Mobile** | Cached products (offline view) | Reads from Vercel API → Supabase cloud |
| **Vercel API** | Temp SQLite (hydrated from Supabase on start) | Same data as desktop |

- **Delete** on desktop → cloud row removed → deleted items do not come back
- **Offline** on desktop → data saved locally → sync when internet returns
- **Mobile** → tap **Sync now** in Settings to load latest desktop data

## Supabase tables (same structure as local Prisma)

| Table | Contents |
|-------|----------|
| `pos_users` | Admin / cashier accounts |
| `pos_products` | Products |
| `pos_product_barcodes` | Barcodes |
| `pos_bills` / `pos_bill_items` | Sales |
| `pos_returns` / `pos_return_items` | Returns |
| `pos_shop_settings` | Shop name, returns policy |
| `pos_recurring_expenses` / `pos_expenses` | Expenses |

View in Supabase → **Table Editor** (not JSON).

---

## Step 1 — Create free Supabase database

1. Go to https://supabase.com → Sign up (free)
2. **New project** → set a strong **database password** → region closest to you
3. Wait ~2 minutes for project to be ready

---

## Step 2 — Configure connection (Windows / IPv4)

Direct URI (`db.xxx.supabase.co`) is IPv6-only. Use the configure script — it auto-finds the Session pooler:

```powershell
node scripts/configure-supabase.mjs "postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

Or paste the **Session pooler** URI from Supabase → Connect → Session mode.

---

## Step 3 — Configure Vercel (for mobile app)

| Name | Value |
|------|--------|
| `POSTGRES_URI` | Same Supabase URI as desktop |
| `SHOP_ID` | `bata-store-01` |
| `SYNC_ENABLED` | `true` |
| `JWT_SECRET` | Same as desktop |

Then **Redeploy**.

---

## Test

- Desktop: Settings → Cloud sync → **Connected**
- Supabase: Table Editor → `pos_products`
- Browser: `http://localhost:3000/api/cloud/health`
- Mobile: Settings → **Sync now**
