# Fakturia — Rebuild Plan

## Architecture Overview

```
Next.js 15 (App Router)
├── Supabase (Auth + DB + RLS)
├── Stripe (Subscriptions + One-off payments)
├── Resend (Email delivery)
├── @react-pdf/renderer (Server-side PDF)
├── Zod (Input validation)
└── AI API (Bearer token auth, OpenAI-compatible)
```

## Security Fixes (Priority Order)

### 🔴 Critical
1. **db.ts** — Remove `rejectUnauthorized: false`. Use proper SSL config or Supabase pooler URL.
2. **Service role key overuse** — Only use `SUPABASE_SERVICE_ROLE_KEY` in webhook route. All other routes use user-scoped client.
3. **Input validation** — Add Zod schemas to ALL API routes.
4. **Race condition** — Replace read-check-deduct with atomic RPC: `UPDATE profiles SET invoice_points = invoice_points - 1 WHERE id = $1 AND invoice_points > 0 RETURNING invoice_points`

### 🟡 Medium
5. **Docker** — Bind to `127.0.0.1:3003:3003`, set `NODE_ENV=production`
6. **Rate limiting** — Add `next-rate-limit` or Upstash Ratelimit on API routes
7. **Missing .env.example** — Create with all required vars documented
8. **CSP headers** — Add via `next.config.js` headers or middleware

## Pricing Models

### Subscription (Monthly)
- **Basic**: 149 NOK/mo — 10 invoices
- **Pro**: 299 NOK/mo — 50 invoices + email delivery
- **Unlimited**: 499 NOK/mo — unlimited invoices + AI API access

### One-off (No subscription)
- **Single invoice**: 49 NOK per invoice (Stripe Checkout, no account needed for payment)
- Buy "invoice packs": 5-pack 199 NOK, 10-pack 349 NOK

### Implementation
- Stripe Products + Prices for each tier
- `subscription_tier` column in profiles table
- One-off purchases use Stripe Payment Links or one-time Checkout Sessions
- Points system remains for one-off; subscription removes point counting

## Database Schema Changes

```sql
-- Add subscription support
ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN subscription_stripe_id TEXT;
ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive';

-- API keys for AI access
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  key_hash TEXT NOT NULL,  -- SHA-256 hash of the API key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Invoice numbers (sequential per user)
ALTER TABLE invoices ADD COLUMN invoice_number TEXT;
CREATE UNIQUE INDEX idx_invoice_number_per_user ON invoices(user_id, invoice_number);

-- Soft delete
ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMPTZ;

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Atomic point deduction function
CREATE OR REPLACE FUNCTION deduct_invoice_point(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_points INTEGER;
BEGIN
  UPDATE profiles
  SET invoice_points = invoice_points - 1,
      updated_at = now()
  WHERE id = p_user_id AND invoice_points > 0
  RETURNING invoice_points INTO new_points;
  
  RETURN new_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## API Endpoints

### Web App API
- `GET/POST /api/invoices` — List/Create invoices
- `GET/PUT/PATCH/DELETE /api/invoices/[id]` — CRUD
- `GET/POST /api/clients` — List/Create clients
- `GET/PUT/DELETE /api/clients/[id]` — CRUD
- `POST /api/stripe-webhook` — Stripe events
- `POST /api/create-checkout-session` — Start payment
- `POST /api/create-subscription` — Start subscription

### AI API (v1)
- `POST /api/v1/invoices` — Create + optionally send invoice
- `GET /api/v1/invoices` — List invoices
- `GET /api/v1/invoices/[id]` — Get single invoice
- `GET /api/v1/clients` — List clients
- `POST /api/v1/clients` — Create client

**Auth:** Bearer token via `api_keys` table
**Format:** OpenAI-compatible request/response structure

Example:
```json
POST /api/v1/invoices
Authorization: Bearer fk_live_abc123

{
  "client_name": "Ola Nordmann",
  "client_email": "ola@example.com",
  "items": [
    { "description": "Webdesign", "quantity": 1, "unit_price": 5000 }
  ],
  "due_days": 30,
  "send": true
}
```

## SEO Checklist

- [x] Semantic HTML5 elements
- [x] Proper meta tags (title, description, keywords)
- [x] Open Graph tags (og:title, og:description, og:image, og:url)
- [x] Twitter Card tags
- [x] JSON-LD structured data (SaaS Product schema)
- [x] sitemap.xml (dynamic via app/sitemap.ts)
- [x] robots.txt (via app/robots.ts)
- [x] Canonical URLs
- [x] Performance: Next.js Image optimization, font preloading
- [x] Accessibility: WCAG 2.1 AA
- [x] Norwegian language tag (lang="nb")

## UI/UX Principles

- **Scandinavian minimalism** — lots of white space, clean lines
- **Color palette**: White, slate-900, emerald-500 (accent), neutral borders
- **Typography**: Inter or Geist for body, monospace for numbers/amounts
- **Mobile-first** — invoices are often created on-the-go
- **Dark mode** support
- **Invoice preview** — real-time PDF preview as you type
- **Dashboard** — clean overview: outstanding, paid, overdue counts

## Implementation Order

1. Fix critical security issues
2. Add Zod validation to all API routes
3. Add .env.example
4. Create API keys table + AI endpoint
5. Add subscription support (Stripe + DB)
6. One-off invoice purchase flow
7. Server-side PDF generation
8. Email delivery (Resend)
9. SEO foundation (meta, sitemap, robots, JSON-LD)
10. UI refresh (dashboard, invoice builder, settings)
11. Docker production config
12. Rate limiting
13. Audit logging
14. Monitoring (Sentry)
