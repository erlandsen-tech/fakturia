-- Phase 1 (1.1) — Lock down billing-critical SECURITY DEFINER RPCs and the
-- profiles UPDATE hole.
--
-- Before this migration the points/numbering functions kept Postgres's default
-- EXECUTE-to-PUBLIC grant, so anon + authenticated could POST
-- /rest/v1/rpc/add_invoice_points with an arbitrary p_user_id and self-grant
-- unlimited paid credits, fully bypassing Stripe. Separately, the profiles
-- UPDATE RLS policy only checks row ownership, not which columns change, so a
-- logged-in user could PATCH their own invoice_points to any value.
--
-- Pattern copied from 20260510120000_secure_invoice_share.sql:59-60.

-- ----------------------------------------------------------------------------
-- 1.1a — revoke EXECUTE from the world on the privileged functions.
-- service_role bypasses these grants entirely, so the Stripe webhook (which
-- runs as service_role) keeps working with no grant needed.
-- ----------------------------------------------------------------------------
revoke all on function public.add_invoice_points(uuid, integer) from public;
revoke all on function public.deduct_invoice_point(uuid) from public;
revoke all on function public.seed_profile_with_trial_points() from public;

-- Make intent explicit (harmless; service_role already bypasses RLS/grants).
grant execute on function public.add_invoice_points(uuid, integer) to service_role;
grant execute on function public.deduct_invoice_point(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 1.1b — next_invoice_number must stay callable by in-app clients (clone +
-- create), so we re-grant it to authenticated, but first add an internal guard
-- so a user cannot advance ANOTHER user's sequence. The auth.uid() IS NOT NULL
-- clause lets the service_role / v1 path (no JWT, auth.uid() NULL) still pass.
-- Body is otherwise identical to 20260504000003:83-101.
-- ----------------------------------------------------------------------------
create or replace function public.next_invoice_number(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  next_num INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.profiles
  SET next_invoice_number = next_invoice_number + 1
  WHERE id = p_user_id
  RETURNING next_invoice_number - 1 INTO next_num;

  IF next_num IS NULL THEN
    INSERT INTO public.profiles (id, next_invoice_number)
    VALUES (p_user_id, 2)
    RETURNING 1 INTO next_num;
  END IF;

  RETURN to_char(now(), 'YYYY') || '-' || lpad(next_num::text, 4, '0');
END;
$$;

revoke all on function public.next_invoice_number(uuid) from public;
grant execute on function public.next_invoice_number(uuid) to authenticated;
grant execute on function public.next_invoice_number(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 1.1c — block direct client writes to protected profile columns. The profiles
-- UPDATE RLS policy (20240322000000:22-26) only checks row ownership, so an
-- authenticated user could PATCH invoice_points directly. This BEFORE UPDATE
-- trigger rejects changes to the billing/subscription columns when the request
-- comes from a logged-in end user (jwt role 'authenticated').
--
-- The SECURITY DEFINER RPCs (add/deduct/next_number) run as the function owner,
-- whose jwt role is NOT 'authenticated', so they are exempt. The Stripe webhook
-- runs as service_role (jwt role 'service_role'), so its upsert is exempt too.
-- Only a direct PATCH from a logged-in user is blocked.
-- ----------------------------------------------------------------------------
create or replace function public.prevent_protected_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
BEGIN
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'authenticated' THEN
    IF NEW.invoice_points IS DISTINCT FROM OLD.invoice_points
       OR NEW.next_invoice_number IS DISTINCT FROM OLD.next_invoice_number
       OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
      RAISE EXCEPTION 'protected profile columns cannot be modified directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

drop trigger if exists prevent_protected_profile_change on public.profiles;
create trigger prevent_protected_profile_change
  before update on public.profiles
  for each row execute function public.prevent_protected_profile_change();
