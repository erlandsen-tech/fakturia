-- Phase 1 (1.2a) — distinguish a 'claimed' webhook event from a 'processed'
-- one. Before this column the idempotency row was inserted BEFORE side-effects
-- ran, so a transient failure left a permanent 'seen' row and Stripe's retry
-- was short-circuited as a duplicate → customer paid but was never credited.
--
-- With a nullable processed_at, the webhook can: claim (insert, processed_at
-- NULL) → run side-effects → mark processed_at = now(). A retry of a completed
-- event (processed_at set) is a true duplicate; a retry of a failed/in-flight
-- event (processed_at NULL) is allowed to proceed.
alter table public.stripe_webhook_events
  add column if not exists processed_at timestamptz;
