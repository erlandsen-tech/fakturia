# Fakturio

Fakturering for norske enkeltpersonforetak og småbedrifter. Kjøp pakker med fakturaer (5/10/25), send dem som PDF på e-post, eller automatiser via API. Ingen abonnement.

## Stack

- Next.js 14 (App Router) + TypeScript
- Supabase (Auth + Postgres + RLS)
- Stripe Checkout (one-time bundle purchases)
- `@react-pdf/renderer` (server-side PDF)
- Resend (email + PDF attachments)
- Tailwind 4 + shadcn/ui

## Quick start

1. Install dependencies
   ```bash
   npm install
   ```

2. Copy `.env.example` → `.env.local` and fill in:
   - Supabase project URL + anon key + service role key
   - Stripe test keys (`sk_test_…`, `pk_test_…`) and webhook secret
   - Resend API key + verified sender address (optional — the app runs without email, but the "send" action will only mark invoices as sent without delivering them)

3. Apply database migrations
   ```bash
   # Either via Supabase CLI:
   supabase db push
   # Or paste supabase/migrations/*.sql into the Supabase SQL editor in order
   ```

4. Run the dev server
   ```bash
   npm run dev
   ```

5. (For Stripe) forward webhook events locally
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```
   Take the printed `whsec_…` value and set it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## Routes

### Pages
- `/` — landing page
- `/pricing` — bundle pack purchase
- `/sign-in`, `/sign-up`
- `/dashboard` — invoice points + activity overview
- `/invoices`, `/invoices/create`, `/invoices/[id]`
- `/clients`, `/clients/new`, `/clients/[id]`
- `/settings` — company info
- `/settings/api-keys` — generate/revoke API keys

### Web API
- `GET/POST /api/invoices` — list / create draft (no point cost)
- `GET/PUT/PATCH/DELETE /api/invoices/[id]` — CRUD; `PATCH {action: 'send'}` deducts a point, renders PDF, emails it
- `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/[id]`
- `POST /api/create-checkout-session` — Stripe Checkout for `{type: 'pack', pack: 'pack_5' | 'pack_10' | 'pack_25'}`
- `POST /api/stripe-webhook` — handles `checkout.session.completed` (adds points)
- `GET/POST /api/api-keys`, `DELETE /api/api-keys/[id]`

### Programmatic API (Bearer token)
- `POST /api/v1/invoices` — create + optionally send
- `GET /api/v1/invoices` — list
- `GET/POST /api/v1/clients`

Auth: `Authorization: Bearer fk_live_…` — generate keys at `/settings/api-keys`. Each `send: true` call deducts one invoice point.

Example:
```bash
curl -X POST http://localhost:3000/api/v1/invoices \
  -H "Authorization: Bearer fk_live_…" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Ola Nordmann",
    "client_email": "ola@example.com",
    "items": [{ "description": "Webdesign", "quantity": 1, "unit_price": 5000, "vat_rate": 25 }],
    "due_days": 30,
    "send": true
  }'
```

## Pricing

Bundle packs only — no subscriptions:
- 5-pack: 49 NOK (9.80/invoice)
- 10-pack: 89 NOK (8.90/invoice)
- 25-pack: 199 NOK (7.96/invoice)

New users get 3 free invoices on signup.

## Deployment

Dockerfile + `docker-compose.yml` are included. `fly.toml` and `amplify.yml` are also provided. Set all env vars from `.env.example` in your deployment environment, and configure Stripe webhooks to point at `https://your-domain/api/stripe-webhook`.

## Security notes

See `SECURITY.md` for the RLS / authorization model. CSP and HSTS headers are configured in `next.config.js`.
