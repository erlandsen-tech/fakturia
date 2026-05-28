-- Stripe webhook idempotency: prevent double-processing when Stripe retries.
-- The handler inserts (event_id) before processing. A duplicate insert hits
-- the primary-key conflict and the handler returns 200 without re-running side
-- effects (which would double-credit invoice points or duplicate subscription
-- activations).

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
-- No policies: only the service role (used by the webhook handler) can access.
