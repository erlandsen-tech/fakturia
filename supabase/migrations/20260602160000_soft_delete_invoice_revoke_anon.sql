-- Phase 2 follow-up — same Supabase REVOKE gotcha that 20260601120300 fixed for
-- the points RPCs: the project default privileges
--   (alter default privileges in schema public grant all on functions
--    to anon, authenticated, service_role)
-- grant EXECUTE on every new public function DIRECTLY to anon at creation time,
-- not merely via the PUBLIC pseudo-role. So the `revoke all ... from public` in
-- 20260601130000 left anon's direct grant intact, and an anon PostgREST call to
-- /rest/v1/rpc/soft_delete_invoice reached the function body (it returned the
-- in-function `not authenticated` P0001, proving anon could execute it —
-- verified 02.06.2026).
--
-- The in-function auth.uid() guard already blocks any real deletion by anon, but
-- anon should not be able to invoke the function at all. Revoke from anon
-- explicitly; keep authenticated (the in-app DELETE route runs as the logged-in
-- user). service_role bypasses grants and never calls this RPC, so no re-grant.

revoke all on function public.soft_delete_invoice(uuid) from anon;
grant execute on function public.soft_delete_invoice(uuid) to authenticated;
