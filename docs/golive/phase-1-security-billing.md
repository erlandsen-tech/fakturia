# Phase 1 — Critical security & billing integrity (BLOCKER)

> **Tier:** BLOCKER &nbsp;·&nbsp; **Estimated effort:** ~1 day (4-6 h implementation across 2 migrations + 3 route files + email.ts, plus ~2 h staging verification of the revoke/trigger/webhook-retry/Resend-failure paths)
>
> Self-contained brief — execute in a fresh session. See [PHASES.md](./PHASES.md) for the full go-live sequence and how this phase fits in. All file:line references were verified against the repo on 01.06.2026; re-confirm before editing since code may have moved.

## Objective

Close three launch-blocking defects that let users mint free paid credits and that corrupt billing state. (1.1) The SECURITY DEFINER points/numbering RPCs are world-callable over PostgREST and the profiles UPDATE RLS policy lets any authenticated user PATCH their own invoice_points to any value, so anyone can self-grant unlimited paid invoice credits and bypass Stripe entirely. (1.2) The Stripe webhook claims the idempotency row BEFORE running side-effects and returns HTTP 200 on every failure branch, so a transient failure is recorded as "processed" and Stripe never retries — a customer pays but is never credited. (1.3) The invoice send path treats the Resend SDK as throw-on-error, but the SDK resolves {data, error}; a rejected/failed send still marks the invoice 'sent' and consumes a paid point. All three must be fixed before going live (Stripe live keys + real money).

## Context

Product/stack facts a fresh engineer needs:
- Money is NOK; invoice points are the billable unit. New users get 3 free points (seeded by trigger in 20260504000004_free_trial_seeding.sql); packs sell more (49/89/199 NOK = pack_5/10/25). A "subscription" tier code path exists but is dead/placeholder — do not invest in it, but do not break compile.
- Supabase access model: in-app routes use the SSR client (src/utils/supabase/server.ts) built with NEXT_PUBLIC_SUPABASE_ANON_KEY + the user's auth cookie, so RPCs run as the Postgres role `authenticated`. The Stripe webhook (src/app/api/stripe-webhook/route.ts) uses a separate admin client built with SUPABASE_SERVICE_ROLE_KEY, so it runs as the `service_role` and BYPASSES RLS and any REVOKE on `public`/`anon`/`authenticated`.
- The /api/v1/invoices route (AI/API-key surface) authenticates by API key and then ALSO uses the plain anon SSR client (createClient(), no user JWT) — so its RPC calls currently execute as the `anon` role with an attacker-supplied p_user_id. This is the worst exposure: cross-tenant + self-credit.
- The canonical hardening pattern already exists and works: supabase/migrations/20260510120000_secure_invoice_share.sql lines 59-60: `revoke all on function public.get_public_invoice_by_token(text) from public;` then `grant execute ... to anon, authenticated;`. Copy this exact shape.
- Migrations are timestamp-named (YYYYMMDDHHMMSS_name.sql). Newest is 20260527210000. The new migration must sort AFTER all existing ones. Use date 2026-06-01 (today): 20260601120000_*.sql (or later). Migrations are applied against the linked hosted project ref xemufotqckljtkqoqbsf (eu-central-1).
- Resend SDK (resend npm pkg) `emails.send()` returns a Promise that RESOLVES to `{ data, error }`. It does NOT reject on API/validation errors (invalid 'to', domain not verified, 4xx/5xx). It only rejects on network-level faults. So a try/catch around it catches almost nothing.
- next.config.js has trailingSlash:true — irrelevant to these three fixes except: do not change the webhook route path; Stripe is already configured to POST the trailing-slash URL. Keep it.

## Current state (verified)

### Privileged RPCs lack REVOKE — world-callable
`supabase/migrations/20240322100001_add_points_rpc.sql` &nbsp;·&nbsp; lines 1-40

Defines add_invoice_points(uuid,int) and deduct_invoice_point(uuid), both LANGUAGE plpgsql SECURITY DEFINER, with NO revoke/grant. Default Postgres grants EXECUTE to PUBLIC, so anon+authenticated can call them via POST /rest/v1/rpc/add_invoice_points with arbitrary p_user_id/p_points → unlimited free credits, fully bypassing Stripe.

### Numbering RPC lacks REVOKE
`supabase/migrations/20260504000003_subscriptions_apikeys_softdelete.sql` &nbsp;·&nbsp; lines 83-101

next_invoice_number(uuid) is SECURITY DEFINER with no revoke/grant. World-callable; lets any caller burn/advance ANY user's invoice sequence (DoS / cross-tenant nuisance). Lower severity than points but same class of bug; include in lockdown.

### Trial-seed RPC is trigger-only (lower risk but verify)
`supabase/migrations/20260504000004_free_trial_seeding.sql` &nbsp;·&nbsp; lines 4-21

seed_profile_with_trial_points() is SECURITY DEFINER but is only attached as an AFTER INSERT trigger on auth.users (clients cannot insert into auth.users). Still has no REVOKE, so it is technically callable via rpc; calling it directly returns NULL trigger context and would error, but revoke EXECUTE from public anyway for defense-in-depth.

### profiles UPDATE RLS allows direct column write to invoice_points
`supabase/migrations/20240322000000_create_profiles.sql` &nbsp;·&nbsp; lines 22-26

Policy "Users can update their own profile" is FOR UPDATE USING (auth.uid()=id) WITH CHECK (auth.uid()=id). It checks ONLY row ownership, NOT which columns change. An authenticated user can PATCH /rest/v1/profiles?id=eq.<self> {"invoice_points": 999999} and self-grant credits WITHOUT any RPC. This is a second, independent free-credits hole.

### No existing REVOKE on points/numbering functions anywhere
`supabase/migrations/` &nbsp;·&nbsp; lines grep result

grep for 'revoke' across all migrations matches ONLY 20260510120000_secure_invoice_share.sql. Confirmed: nothing has been added in the last 18 days to lock down the points/numbering RPCs. The audit finding is still live.

### In-app send path calls add_invoice_points as `authenticated` (refund)
`src/app/api/invoices/[id]/route.ts` &nbsp;·&nbsp; lines 149,301

deduct_invoice_point and add_invoice_points are called via the user-context SSR client (role=authenticated). So a naive `revoke from authenticated` on add_invoice_points would break the refund-on-failed-send path. Must be handled (move refund to a service-role admin client, or keep a tightly-scoped grant — see changes).

### v1 API calls RPCs as `anon` with attacker-supplied user id
`src/app/api/v1/invoices/route.ts` &nbsp;·&nbsp; lines 37,131,180,251

Route auths by API key, then uses the plain anon SSR client (createClient()) and passes userId as an RPC arg. next_invoice_number, deduct_invoice_point, add_invoice_points all run as `anon`. Revoking from anon breaks this route — it must be switched to a service-role admin client (it already trusts userId server-side, so service role is correct).

### clone route calls next_invoice_number as authenticated
`src/app/api/invoices/[id]/clone/route.ts` &nbsp;·&nbsp; lines 29

Uses user-context client. next_invoice_number must remain callable here. Decide: keep grant to authenticated for next_invoice_number (it only mutates the caller's own profile sequence when p_user_id=self, but it does NOT verify p_user_id=auth.uid()), OR add an auth.uid() guard inside the function. See risks.

### Webhook: idempotency row claimed BEFORE side-effects
`src/app/api/stripe-webhook/route.ts` &nbsp;·&nbsp; lines 34-44

Inserts into stripe_webhook_events (event_id PK) BEFORE crediting points. Once inserted, the event is permanently 'seen'. If the subsequent add_invoice_points fails, the row stays, so a Stripe retry hits the 23505 conflict at line 39 and is short-circuited as deduplicated → points are NEVER added. Paid-but-not-credited.

### Webhook: every failure branch returns HTTP 200
`src/app/api/stripe-webhook/route.ts` &nbsp;·&nbsp; lines 53,64,81,85,105,112

All error paths return NextResponse.json({received:true,...}) = HTTP 200. Stripe treats 2xx as success and never retries. Combined with the early idempotency claim, any transient failure = permanent loss of the credit. The ONLY 5xx is line 43 (failed to even claim the row).

### Webhook idempotency table
`supabase/migrations/20260527210000_stripe_webhook_idempotency.sql` &nbsp;·&nbsp; lines 7-15

Table stripe_webhook_events(event_id PK, event_type, received_at) with RLS enabled and NO policies (service-role only). There is NO 'processed_at'/status column, so today the schema cannot distinguish 'claimed' from 'completed'. The fix needs either a status/processed_at column or a claim-then-delete-on-failure strategy.

### Send path treats Resend as throw-on-error
`src/app/api/invoices/[id]/route.ts` &nbsp;·&nbsp; lines 281-297

Calls `await sendInvoiceEmail({...})` then unconditionally sets emailDelivery={delivered:true} (line 289) and updateUserRecord status:'sent' (line 297). The return value {data,error} is ignored. The surrounding try/catch (line 298) only fires on a thrown/rejected promise; Resend resolving with {error} does NOT reject, so a failed send still consumes the point (deducted at 149) and marks the invoice sent. The refund branch never runs.

### email.ts returns the raw {data,error} but callers ignore it
`src/lib/email.ts` &nbsp;·&nbsp; lines 50-56

sendInvoiceEmail returns getResend().emails.send(...) i.e. the Promise<{data,error}> directly. It does not inspect error. Fix can live here (throw on error) so all callers get correct behavior, plus a guard at each call site.

### v1 send path has the same Resend bug
`src/app/api/v1/invoices/route.ts` &nbsp;·&nbsp; lines 235-242

Same pattern: await sendInvoiceEmail(...) then emailDelivery={delivered:true} at 242 with no error check; only the try/catch at 249 (which Resend won't trigger). Must be fixed in lockstep.

## Implementation steps

### 1.1a
**File:** `new migration supabase/migrations/20260601120000_lock_down_points_rpcs.sql`

Create a new migration (timestamp must sort after 20260527210000). Revoke EXECUTE from public/anon/authenticated on the privileged SECURITY DEFINER functions, then grant ONLY where needed. Copy the exact shape from 20260510120000_secure_invoice_share.sql:59-60. Statements:
  revoke all on function public.add_invoice_points(uuid, integer) from public;
  revoke all on function public.deduct_invoice_point(uuid) from public;
  revoke all on function public.seed_profile_with_trial_points() from public;
  -- next_invoice_number: revoke from public, but it must stay callable by in-app clients (clone + create). Add an internal auth guard (see 1.1b) THEN grant to authenticated:
  revoke all on function public.next_invoice_number(uuid) from public;
  grant execute on function public.next_invoice_number(uuid) to authenticated;
Do NOT grant add_invoice_points / deduct_invoice_point to anon or authenticated. service_role already bypasses these grants, so the webhook keeps working with no grant needed. (Optional explicit clarity: grant execute on function public.add_invoice_points(uuid,integer) to service_role; — harmless, makes intent obvious.)

### 1.1b
**File:** `same migration 20260601120000_lock_down_points_rpcs.sql`

Harden next_invoice_number so that, now that it is callable by `authenticated`, a user cannot advance ANOTHER user's sequence. CREATE OR REPLACE FUNCTION public.next_invoice_number(p_user_id uuid) ... add at the top of the body, INSIDE the SECURITY DEFINER function, a guard: `IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN RAISE EXCEPTION 'forbidden'; END IF;` (the auth.uid() IS NOT NULL clause lets the service_role/v1 path, which has no JWT, still pass). Re-declare with SET search_path = public to match the secure pattern. Keep the rest of the body identical to 20260504000003 lines 83-101.

### 1.1c
**File:** `same migration 20260601120000_lock_down_points_rpcs.sql`

Prevent direct client writes to profiles.invoice_points (the RLS hole at 20240322000000:22-26). Add a BEFORE UPDATE trigger that blocks changing invoice_points (and next_invoice_number, subscription_* columns) unless running as a privileged role. Implementation:
  CREATE OR REPLACE FUNCTION public.prevent_protected_profile_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  END; $$;
  DROP TRIGGER IF EXISTS prevent_protected_profile_change ON public.profiles;
  CREATE TRIGGER prevent_protected_profile_change BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_profile_change();
Rationale: the SECURITY DEFINER RPCs (add/deduct) run as the function owner, not 'authenticated', so the jwt-role check lets them through; the service role's JWT role is 'service_role' (not 'authenticated') so the webhook upsert at stripe-webhook route 96-101 still works; only a direct PATCH from a logged-in user (role=authenticated) is blocked. Verify column names subscription_tier/subscription_status/subscription_stripe_id exist (they do per webhook upsert + 20260504000003). If next_invoice_number column guard causes the next_invoice_number() RPC to fail (it runs as definer/owner, role not 'authenticated', so it is exempt) — confirm in test.

### 1.1d
**File:** `src/app/api/v1/invoices/route.ts`

This route runs RPCs as `anon` (line 37 createClient(), then 131/180/251). After the revoke in 1.1a those calls will FAIL with permission-denied. Switch this route's privileged DB work to a service-role admin client. Add a helper mirroring stripe-webhook route lines 9-14: `const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)` from '@supabase/supabase-js'. Use supabaseAdmin for the rpc('next_invoice_number'), rpc('deduct_invoice_point'), rpc('add_invoice_points') calls and for the invoice/items inserts (since with anon-key + no JWT, RLS would otherwise block these inserts; the route already authorized via API key and owns userId). Keep userId derived ONLY from the authenticated API key (authenticateApiKey return), never from request body.

### 1.1e
**File:** `src/app/api/invoices/[id]/route.ts`

The refund call add_invoice_points at line 301 runs as `authenticated` and will FAIL after the revoke. Move ONLY the refund to a service-role admin client. Add a module-level helper getSupabaseAdmin() (same as webhook) and replace line 301 `await supabase.rpc('add_invoice_points', {...})` with `await getSupabaseAdmin().rpc('add_invoice_points', { p_user_id: user.id, p_points: 1 })`. Leave the deduct_invoice_point call at line 149 as-is for now? NO — deduct is also revoked. Either (a) also grant deduct to authenticated with an internal auth.uid() guard like 1.1b, OR (b) route the deduct through the admin client too. RECOMMENDED: route deduct through admin client as well (line 149) for a uniform 'all point mutations are service-role only' invariant, and do NOT grant add/deduct to authenticated at all. Update getAuthenticatedUser()/ownership checks stay on the user client; only the two RPC calls move to admin.

### 1.1f
**File:** `src/app/api/invoices/[id]/clone/route.ts`

Line 29 calls next_invoice_number via the user client (authenticated). This stays working because 1.1a grants next_invoice_number to authenticated and 1.1b's guard allows auth.uid()==p_user_id. Verify clone passes p_user_id: user.id (it does). No code change required, but add a test that clone still allocates a number after the migration.

### 1.2a
**File:** `new migration supabase/migrations/20260601120100_webhook_event_status.sql`

Add a completion marker so 'claimed' and 'processed' are distinguishable. ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS processed_at timestamptz; (nullable). Keep event_id PK. This lets a duplicate that arrives while the first is still in-flight be detected, and lets a retry of a FAILED (never-completed) event proceed.

### 1.2b
**File:** `src/app/api/stripe-webhook/route.ts`

Rework the idempotency + failure handling so Stripe retries on failure and never double-credits:
1) Keep verifying the signature (lines 22-29) and the early 400 on bad signature (correct — Stripe should not retry an unsigned request).
2) Replace the claim logic (34-44): attempt `insert into stripe_webhook_events {event_id, event_type}`. On 23505 conflict, SELECT the existing row; if processed_at IS NOT NULL → return 200 {deduplicated:true} (true duplicate of a completed event). If processed_at IS NULL → this is a retry of an in-flight/failed event: return HTTP 409 or 500 so Stripe retries later (do NOT proceed concurrently). Simplest robust option: on conflict-with-null-processed_at, return 500 and let the next retry try again.
3) Run side-effects (credit points / subscription upsert). Convert EVERY current failure return from HTTP 200 to HTTP 5xx so Stripe retries: lines 81 (failed create profile), 85 (failed add points), 105 (failed subscription), 112 (unexpected) must become `new NextResponse('...', { status: 500 })`. Genuinely-unprocessable-but-final cases (line 53 no user_id, line 64 invalid pack metadata) should ALSO delete the just-claimed event row and return 200 (these will never succeed on retry, so acknowledge — but log loudly). 
4) ONLY after side-effects succeed, `update stripe_webhook_events set processed_at = now() where event_id = event.id`. 
5) On ANY side-effect failure, DELETE the claimed row (`delete from stripe_webhook_events where event_id = event.id and processed_at is null`) before returning 5xx, so the Stripe retry can re-claim and re-run. This preserves true idempotency (a completed event has processed_at set and is short-circuited) while allowing retries of failures. 
Keep add_invoice_points via supabaseAdmin (service role) — unaffected by 1.1 revokes.

### 1.2c
**File:** `src/app/api/stripe-webhook/route.ts`

Add `export const dynamic = 'force-dynamic';` and `export const runtime = 'nodejs';` at top of the route if not already implied (Stripe signature verification needs the raw body and Node runtime). Confirm the raw body read at line 23-24 stays — do not switch to request.json(). No path change (trailingSlash: external POST already targets the trailing-slash URL).

### 1.3a
**File:** `src/lib/email.ts`

Make sendInvoiceEmail fail loudly on Resend errors instead of returning the raw {data,error}. Replace the `return getResend().emails.send({...})` (lines 50-56) with: `const { data, error } = await getResend().emails.send({...}); if (error) { throw new Error(\`Resend send failed: ${error.message ?? JSON.stringify(error)}\`); } return data;`. Now every existing caller's try/catch (which assumed throw-on-error) becomes correct with no further change, AND a failed send propagates.

### 1.3b
**File:** `src/app/api/invoices/[id]/route.ts`

With 1.3a, the await at line 281 now throws on Resend error, so the catch at line 298 fires: it logs, refunds the point (now via admin client per 1.1e), and returns 500 WITHOUT marking 'sent'. Verify control flow: emailDelivery={delivered:true} at 289 and updateUserRecord status:'sent' at 297 are only reached if send succeeded. No further change needed beyond 1.3a + 1.1e, but add an explicit assertion/comment that a thrown Resend error must NOT reach line 297.

### 1.3c
**File:** `src/app/api/v1/invoices/route.ts`

Same: with 1.3a, await sendInvoiceEmail at line 235 throws on Resend error → caught at 249 → refunds point (via admin client per 1.1d) + sets invoice back to 'draft' + returns 502. Verify emailDelivery={delivered:true} at 242 is only reached on success. No further change beyond 1.3a + 1.1d.

## Acceptance criteria

- [ ] Calling POST {SUPABASE_URL}/rest/v1/rpc/add_invoice_points with the anon key (or a logged-in user's JWT) returns 401/403 permission denied, NOT a credited balance.
- [ ] Same for deduct_invoice_point and seed_profile_with_trial_points via anon/authenticated.
- [ ] next_invoice_number remains callable by an authenticated user for THEIR OWN id, but raises 'forbidden' when p_user_id != auth.uid().
- [ ] A logged-in user issuing PATCH /rest/v1/profiles?id=eq.<self> {"invoice_points":999} is rejected by the prevent_protected_profile_change trigger; their balance is unchanged.
- [ ] The Stripe webhook (service role) still successfully credits points on checkout.session.completed (pack) — service_role bypasses the revokes.
- [ ] In-app invoice send (PATCH /api/invoices/[id] action=send) still deducts and, on failure, refunds exactly one point; v1 send still works end-to-end.
- [ ] A simulated webhook side-effect failure returns HTTP 5xx (not 200) and leaves NO processed row, so a Stripe retry re-runs and credits exactly once; a genuine duplicate of a completed event returns 200 and credits zero additional points.
- [ ] A Resend send that resolves with {error} (e.g. unverified domain / bad recipient) results in the invoice NOT marked 'sent', the point NOT consumed (refunded/never deducted net), and a non-2xx API response surfacing the error.
- [ ] npm run build / tsc passes; no route still calls add_invoice_points or deduct_invoice_point through an anon/authenticated client.

## Test plan

- Apply migrations to a scratch/staging DB (supabase db push against a non-prod branch, or supabase migration up locally). Confirm both new migration files apply cleanly and sort last.
- Free-credits probe (must FAIL): curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/add_invoice_points" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H 'Content-Type: application/json' -d '{"p_user_id":"<any-uuid>","p_points":1000}'  → expect 401/403/permission denied. Repeat with a real user JWT.
- Direct column-write probe (must FAIL): curl -s -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.<self>" -H "apikey: $ANON" -H "Authorization: Bearer $USER_JWT" -H 'Content-Type: application/json' -H 'Prefer: return=representation' -d '{"invoice_points":999}' → expect error from trigger; SELECT invoice_points after → unchanged.
- next_invoice_number self vs other: as authenticated user A, rpc('next_invoice_number',{p_user_id:A}) → returns YYYY-000X; rpc with p_user_id:B → 'forbidden'.
- Webhook happy path: use Stripe CLI `stripe trigger checkout.session.completed` (or replay a real test event) against the trailing-slash URL; confirm points credited once and stripe_webhook_events.processed_at set.
- Webhook retry-on-failure: temporarily force add_invoice_points to error (e.g. point at a bad env in staging), send event → expect HTTP 5xx and NO row left (processed_at null row deleted); restore, let Stripe retry (or re-send same event id) → credited exactly once.
- Webhook true duplicate: send the SAME completed event id twice after success → second returns 200 deduplicated, balance unchanged.
- Resend failure: set RESEND_FROM_EMAIL to an unverified domain (or RESEND_API_KEY to a key whose domain isn't verified) in staging, send an invoice via PATCH /api/invoices/[id] → expect 500, invoice still 'draft'/not 'sent', point balance net unchanged (deducted then refunded, or not consumed). Repeat for POST /api/v1/invoices with send=true → expect 502 + status draft.
- Regression: full send happy path with a verified Resend domain → invoice 'sent', one point consumed, email + PDF (+EHF when metadata complete) delivered.

## Risks & gotchas

- ORDERING HAZARD: deploy the DB migration and the app code changes (1.1d/1.1e moving RPCs to the service-role admin client) TOGETHER. If the revoke lands before the code is deployed, the in-app send/refund and the v1 route will break (permission denied) for the gap window. Prefer: deploy code that uses the admin client first (still works pre-revoke), then apply the migration.
- The prevent_protected_profile_change trigger relies on the request.jwt.claims 'role' being 'authenticated' for end users and 'service_role' for the webhook. Verify this on the hosted project before trusting it — if the claim shape differs, the trigger could either block the webhook (bad) or fail open. Test the webhook upsert (stripe-webhook 96-101) explicitly after enabling the trigger.
- next_invoice_number is granted to `authenticated` AND guarded by auth.uid(). But the v1/webhook paths have no JWT (auth.uid() NULL) — the guard's `auth.uid() IS NOT NULL` clause must be present or those paths break. Double-check the v1 route now uses the admin client (1.1d) so it is service_role, not anon.
- Webhook claim-then-delete-on-failure introduces a small window where two concurrent retries could both proceed if the first hasn't set processed_at and the second sees no row. Stripe rarely sends true concurrent retries, but add_invoice_points is additive (not idempotent by itself), so a double-run would double-credit. Mitigate by keeping the INSERT ... the unique PK as the concurrency gate (only one INSERT wins); the loser gets 23505 and, seeing processed_at NULL, returns 5xx WITHOUT running side-effects. Ensure the 'processed_at NULL → 5xx, do not process' branch is strict.
- Do NOT broaden the fix to the dead subscription path — but the prevent_protected_profile_change trigger guards subscription_tier/status, and the webhook's subscription upsert (service_role) must still pass. Covered by the role check, but verify since this is the placeholder path.
- Resend change in email.ts now THROWS; any OTHER caller of sendInvoiceEmail not in scope here would start surfacing errors. grep confirms only the two send routes call it, but re-grep before merge.
- fly.toml health check path is /api/health/ (trailing slash) and Stripe posts to the trailing-slash webhook URL — do not 'normalize' or change the webhook route path while editing the file, or external POSTs will 308 and break.

## Out of scope (deferred)

- Building out the real subscription/'unlimited' billing — it stays a dead placeholder this phase.
- Replacing the in-memory rate limiter in /api/v1/invoices with Redis/Upstash (separate hardening phase).
- Going Stripe-live / rebuilding the image to bake the live publishable key (separate go-live step; note it requires an image rebuild, not just an env swap).
- PEPPOL/EHF delivery over the access point (B2Brouter) — separate blocker, not security/billing-integrity.
- Landing-page copy/feature-promise cleanup (separate ship blocker).
- Broad audit-log or alerting work beyond logging the webhook failure branches.
