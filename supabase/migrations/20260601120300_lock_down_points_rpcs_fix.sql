-- Phase 1 (1.1) follow-up — the previous migration only did
-- `revoke all ... from public`, which is INSUFFICIENT on Supabase: the project
-- default privileges
--   (alter default privileges in schema public grant all on functions
--    to anon, authenticated, service_role)
-- grant EXECUTE on every public function DIRECTLY to anon + authenticated at
-- creation time, not merely via the PUBLIC pseudo-role. So revoking PUBLIC left
-- the direct anon/authenticated grants intact, and anon could still call
-- add_invoice_points / deduct_invoice_point over PostgREST (verified 01.06.2026).
--
-- Revoke EXECUTE from anon + authenticated explicitly. service_role keeps its
-- own direct grant (re-asserted below) so the Stripe webhook and the server-side
-- admin-client routes keep working.

-- Points mutations: server-side / service_role only.
revoke all on function public.add_invoice_points(uuid, integer) from anon, authenticated;
revoke all on function public.deduct_invoice_point(uuid) from anon, authenticated;
revoke all on function public.seed_profile_with_trial_points() from anon, authenticated;
grant execute on function public.add_invoice_points(uuid, integer) to service_role;
grant execute on function public.deduct_invoice_point(uuid) to service_role;

-- next_invoice_number must stay callable by authenticated (in-app create/clone),
-- where the in-function auth.uid() guard prevents cross-tenant use. Deny anon;
-- keep authenticated + service_role.
revoke all on function public.next_invoice_number(uuid) from anon;
grant execute on function public.next_invoice_number(uuid) to authenticated;
grant execute on function public.next_invoice_number(uuid) to service_role;
