# Phase 6 — Mediums (post-launch hardening: security/API, EHF conformance, ops/reliability, compliance)

> **Tier:** MEDIUM &nbsp;·&nbsp; **Estimated effort:** Cluster A ~1.5 days (v1 user-scoped rewrite is the bulk); Cluster B ~3 days (EHF exemption + Schematron + immutability triggers + numbering rework + delivery rendering); Cluster C ~2 days (Sentry wiring + source maps + CI tests + SIGTERM + redirect/pagination fixes); Cluster D ~0.5 day (statement + subprocessor list). Total ~7 days.
>
> Self-contained brief — execute in a fresh session. See [PHASES.md](./PHASES.md) for the full go-live sequence and how this phase fits in. All file:line references were verified against the repo on 01.06.2026; re-confirm before editing since code may have moved.

## Objective

Close the broad MEDIUM-tier gaps that materially affect security posture, EHF conformance, production reliability, and Norwegian legal compliance — batched after the launch-blockers. Group work into four clusters (A security/API, B EHF/data integrity, C ops/reliability, D compliance). Each change cites a verified file:line so a fresh engineer can implement without re-investigating.

## Context

Fakturio is a Norwegian e-invoicing SaaS: Next.js 14 App Router, output:'standalone', deployed on Fly.io (app name still `fakturia`, domain fakturio.no, ams region, port 3003, min 2 machines). Supabase Postgres+Auth+RLS. Stripe (test keys baked at BUILD time into the image via fly.toml build.args + both workflows — going live needs an image rebuild, not an env swap; the test/public pk_ keys are NOT secrets). Resend for email. @react-pdf/renderer for PDF. EHF 3.0 / PEPPOL BIS Billing 3.0 UBL 2.1 XML hand-built by string concatenation in src/lib/ehf.ts.

Hard facts to respect: money is NOK handled in øre; EU date format DD.MM.YYYY, 24h clock, metric; non-local times in UTC. next.config.js sets trailingSlash:true — external POSTs and health checks MUST use the trailing-slash URL (health check correctly uses /api/health/). The product sells one-off invoice packs (49/89/199 NOK = pack_5/10/25); a subscription tier code path exists (growth/enterprise unlimited in src/app/api/invoices/[id]/route.ts:143-145) but is dead/placeholder. The canonical Supabase hardening pattern to COPY is supabase/migrations/20260510120000_secure_invoice_share.sql:59-60 ("revoke all on function ... from public; grant execute ... to anon, authenticated").

IMPORTANT cross-references: the points/number RPCs missing REVOKE (next_invoice_number, deduct_invoice_point, add_invoice_points) is a LAUNCH BLOCKER tracked elsewhere — Cluster A only references it as the reason the cross-tenant write hole becomes catastrophic if the v1 client is "fixed" with the service role. The DPA/subprocessor disclosure (Cluster D) overlaps the Phase 2 privacy page; link rather than duplicate.

## Current state (verified)

### CLUSTER A — /api/v1 RLS-dead + latent cross-tenant hole
`src/app/api/v1/invoices/route.ts` &nbsp;·&nbsp; lines 37,89,131-175

authenticateApiKey() resolves a userId from the bearer API key, but every DB call uses createClient() from @/utils/supabase/server (the cookie-bound ANON client — see src/utils/supabase/server.ts:7-9). No session cookie is present on an API-key request, so RLS evaluates as anon and rejects all inserts/selects → the v1 write/read paths are effectively DEAD in production. LATENT HOLE: the obvious 'fix' is to swap to the service-role key, which bypasses RLS entirely; because the handler trusts the caller-derived userId and filters tenancy only with .eq('user_id', userId) in JS, a service-role client would make tenancy depend solely on correct code — and combined with the un-REVOKEd SECURITY DEFINER RPCs, any leaked/forged path could write cross-tenant. Must be fixed by minting a per-request user-scoped JWT (or RPC with explicit p_user_id under RLS), NOT service role.

### CLUSTER A — /api/v1 clients same defect
`src/app/api/v1/clients/route.ts` &nbsp;·&nbsp; lines 15,37-43,77-84

Same pattern: API-key auth yields userId, then anon createClient() does .from('clients').select/insert filtered by .eq('user_id', userId). RLS-dead for the same reason. createClientSchema accepts company/address fields but POST spreads ...result.data unfiltered into insert (line 81).

### CLUSTER A — CSP allows unsafe-inline + unsafe-eval
`next.config.js` &nbsp;·&nbsp; lines 13-15

script-src is "'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com" and style-src has 'unsafe-inline'. CSP is set via next.config.js headers() (NOT middleware). unsafe-eval is not required by Stripe.js or Supabase and defeats XSS mitigation; unsafe-inline on scripts likewise. This is the only place CSP is defined; middleware.ts sets no headers.

### CLUSTER A — invoice share token only 64-bit
`supabase/migrations/20260508000000_add_invoice_share_columns.sql` &nbsp;·&nbsp; lines 9

share_token default is encode(extensions.gen_random_bytes(8),'hex') = 8 bytes = 64 bits of entropy, exposed at public /i/[token] (src/app/i/[token]/page.tsx). 64-bit is brute-forceable for an unauthenticated enumerable resource. Should be >=16 bytes (128-bit). The token gates get_public_invoice_by_token() which returns client PII + bank account.

### CLUSTER B — EHF exempt(E)/reduced-rate + TaxExemptionReason missing
`src/lib/ehf.ts` &nbsp;·&nbsp; lines 102-106,254-263,265-282

taxCategory(rate) returns only 'S' (rate>0) or 'Z' (rate===0); never 'E'. For any zero/exempt line, EN16931 Schematron rules BR-Z-10 / BR-E-10 require a TaxExemptionReason or TaxExemptionReasonCode in cac:TaxSubtotal/cac:TaxCategory — it is absent, so any 0% line produces XML an Access Point/Schematron validator will REJECT. Reduced Norwegian rates (15% food, 12% transport) happen to validate as 'S' so they pass, but there is no way to mark a genuinely exempt/outside-scope line.

### CLUSTER B — no EN16931/Schematron validation in CI
`.github/workflows/pr-checks.yml` &nbsp;·&nbsp; lines 1-46

pr-checks runs only `npx tsc --noEmit` and `npm run build`. deploy.yml (1-90) runs tsc + build + migration push + fly deploy + health smoke test. Neither validates the hand-concatenated UBL against EN16931/PEPPOL Schematron. package.json has no libxml/schematron/xsd dep. XML built by string concat in ehf.ts → silent regressions ship undetected.

### CLUSTER B — sent/paid invoices fully editable (no immutability)
`src/app/api/invoices/[id]/route.ts` &nbsp;·&nbsp; lines 56-98

PUT calls updateUserRecord('invoices', id, result.data) with no status guard. updateInvoiceSchema (src/lib/validations/invoice.ts:20-28) permits issue_date/due_date/notes/vat_rate/status changes. A 'sent' or 'paid' invoice (a legal accounting document) can be silently mutated. PATCH (line 131) only blocks re-sending paid/cancelled; it does not protect content. No DB-level immutability trigger exists (grep of migrations confirms none).

### CLUSTER B — invoice_items.quantity is INTEGER but validation allows fractional
`supabase/migrations/20240319000000_create_base_tables.sql` &nbsp;·&nbsp; lines 38

quantity column is `integer NOT NULL DEFAULT 1` and is never altered in any later migration. Both createInvoiceSchema and webCreateInvoiceSchema (src/lib/validations/invoice.ts:11,42) allow z.number().positive().max(10000) — fractional hours like 1.5 pass validation but Postgres truncates/rounds on insert. EHF n2() formats quantity to 2 decimals (ehf.ts:268) implying fractional support that the column cannot store.

### CLUSTER B — delivery date captured but never rendered
`src/app/api/invoices/route.ts` &nbsp;·&nbsp; lines 83-84

delivery_time (TIMESTAMPTZ) + delivery_place columns exist (migration 20240321000002_update_invoices.sql:3-4) and the web POST persists them, but grep shows ZERO references to delivery in src/lib/pdf.ts and the EHF builder does not emit cac:Delivery/cbc:ActualDeliveryDate (ehf.ts has no delivery handling; ehf route src/app/api/invoices/[id]/ehf/route.ts:47-91 never passes it). Captured data is invisible on both PDF and XML — EHF cac:Delivery/cbc:ActualDeliveryDate is the standard slot.

### CLUSTER B — invoice numbering burns numbers on drafts; year prefix never resets
`supabase/migrations/20260504000003_subscriptions_apikeys_softdelete.sql` &nbsp;·&nbsp; lines 83-103

next_invoice_number() increments profiles.next_invoice_number on every call and is invoked at DRAFT creation (src/app/api/invoices/route.ts:68 and v1 invoices route:131) — deleting/abandoning a draft permanently burns that number, leaving gaps that Norwegian bokføring frowns on. Also the prefix is to_char(now(),'YYYY') concatenated with a counter that NEVER resets at year rollover: 2026 continues 2026-0247, then on 1 Jan becomes 2027-0248 (prefix changes but sequence keeps climbing instead of restarting at 0001).

### CLUSTER B — v1 invoice create leaves orphan numbered invoice on item-insert failure
`src/app/api/v1/invoices/route.ts` &nbsp;·&nbsp; lines 169-175

If invoice_items insert fails, the handler returns 500 WITHOUT deleting the already-inserted invoice row (which already consumed a number via next_invoice_number). Contrast the WEB route src/app/api/invoices/route.ts:109-113 which DOES roll back the orphan. (So this is a v1-only defect — the web path is already fixed.)

### CLUSTER C — server/edge Sentry is DARK
`sentry.server.config.ts` &nbsp;·&nbsp; lines 3

sentry.server.config.ts and sentry.edge.config.ts both read process.env.SENTRY_DSN, but ONLY NEXT_PUBLIC_SENTRY_DSN is defined (fly.toml:16,25 [build.args]+[env]; deploy.yml:18; Dockerfile ARG/ENV). SENTRY_DSN is set nowhere (grep confirmed). So Sentry.init never runs server/edge-side → all backend exceptions are invisible. Client config (sentry.client.config.ts:3) correctly uses NEXT_PUBLIC_SENTRY_DSN and DOES initialize.

### CLUSTER C — no Sentry source-map upload
`next.config.js` &nbsp;·&nbsp; lines 49-56

withSentryConfig sets org/project/hideSourceMaps but no SENTRY_AUTH_TOKEN is provided in deploy.yml or Dockerfile (grep confirmed none). Without an auth token at build time, source maps are not uploaded to Sentry, so any captured server stack traces are minified/unreadable.

### CLUSTER C — deploy/pr CI runs no tests/lint; 0 test files
`.github/workflows/deploy.yml` &nbsp;·&nbsp; lines 33-39

deploy.yml runs only Typecheck (npx tsc --noEmit) then migrate+deploy. pr-checks.yml runs tsc + build. Neither runs `next lint` (a lint script exists in package.json) nor any test runner. Repo contains ZERO test files (find for *.test.*/*.spec.* returns nothing) and no vitest/jest dependency.

### CLUSTER C — no graceful SIGTERM drain
`Dockerfile` &nbsp;·&nbsp; lines 43

Container starts with CMD ["node","server.js"] (Next standalone server). With Fly auto_stop_machines='stop' and min 2 machines, instances are stopped/rescheduled routinely; there is no SIGTERM handler to stop accepting new connections and drain in-flight requests (e.g. an in-progress PDF render + Resend send + point deduction in invoices/[id] PATCH could be killed mid-flight, double-charging or losing a point). No signal handling anywhere in src.

### CLUSTER C — auth failures return 500 instead of 401 (wrong redirect check)
`src/app/api/invoices/[id]/route.ts` &nbsp;·&nbsp; lines 39,88,329,368

getAuthenticatedUser() (src/lib/auth.ts:23-25) calls Next's redirect('/sign-in') on no-session, which throws an error whose message is the literal string 'NEXT_REDIRECT' (uppercase). Handlers branch on error.message.includes('redirect') (lowercase) which NEVER matches → unauthenticated API calls fall through to the generic 500 instead of 401. Same broken check repeated in src/app/api/invoices/route.ts:25,118 and src/app/api/invoices/[id]/ehf/route.ts:110. Correct guard: import { isRedirectError } from 'next/dist/client/components/redirect' or test error?.digest?.startsWith('NEXT_REDIRECT') / message === 'NEXT_REDIRECT'.

### CLUSTER C — list endpoints unbounded / SELECT *
`src/app/api/invoices/route.ts` &nbsp;·&nbsp; lines 10-22

GET /api/invoices uses fetchUserData with select '*, client:clients(*), items:invoice_items(*)' and NO limit/pagination — returns every invoice with all joined rows. fetchUserData (src/lib/auth.ts:60-87) applies no limit. v1 clients GET (src/app/api/v1/clients/route.ts:38-43) is also unbounded (.order('name'), no limit). The v1 invoices GET (route.ts:295,304) IS already bounded (limit clamped to <=100) — so only the web /api/invoices list and v1 /clients list need pagination.

### CLUSTER C — no documented PITR/backup or uptime monitoring
`supabase/migrations` &nbsp;·&nbsp; lines n/a

No documentation or config in repo for Supabase PITR/backup policy or external uptime monitoring of fakturio.no. fly.toml has an internal health check (checks.alive → /api/health/) but no external synthetic monitor. This is a documentation/ops-config gap, not a code defect.

### CLUSTER D — no accessibility statement
`src/app` &nbsp;·&nbsp; lines n/a

No tilgjengelighetserklæring page exists (grep for tilgjengelighet/accessibility/WCAG returns nothing; no src/app/personvern|privacy|vilkar|terms route dirs exist). Norwegian law (likestillings- og diskrimineringsloven §18, uu-tilsynet) requires an accessibility statement for digital services; a paid public-facing SaaS should publish one.

### CLUSTER D — subprocessors/DPA undisclosed
`src/app` &nbsp;·&nbsp; lines n/a

No privacy (personvernerklæring) or DPA/subprocessor page exists at all (no personvern/privacy/terms routes). Fakturio processes customer + their-clients' PII through Supabase (Frankfurt), Stripe, Resend, Fly.io, Sentry — none disclosed. OVERLAPS the Phase 2 privacy page: this phase should LINK to / extend that page with a subprocessor list, not build a separate one.

### CLUSTER D — Sentry session replay disabled (no PII risk currently)
`sentry.client.config.ts` &nbsp;·&nbsp; lines 6-7

replaysSessionSampleRate:0 and replaysOnErrorSampleRate:0.1. Session replay is effectively off except on-error sampling, and no Replay integration is added to integrations[] (none configured) so replay is NOT actually active. The PII-capture risk is latent, not live — if Replay is ever enabled, maskAllText/blockAllMedia must be set. Mark as low-priority guard, not a current leak.

## Implementation steps

### A1 — Make /api/v1 actually work AND tenant-safe without service role
**File:** `src/app/api/v1/invoices/route.ts (and src/app/api/v1/clients/route.ts)`

Stop using the cookie-bound anon createClient() for API-key requests. Choose ONE approach and apply to both files: (a) PREFERRED — route all data access through SECURITY DEFINER RPCs that take p_user_id explicitly and self-filter tenancy (mirror next_invoice_number's signature), each REVOKEd from public and granted only to the role the request uses; or (b) mint a short-lived user-scoped Supabase JWT for the resolved userId and create a request client with that token so RLS applies natively. DO NOT introduce the service-role key here — explicitly document in a code comment that service role is forbidden because tenancy is caller-derived. Until fixed, the endpoints silently fail; verify by curling with a valid fk_ key and confirming a row is actually written.

### A2 — Filter v1 client insert payload
**File:** `src/app/api/v1/clients/route.ts`

Replace `insert({ user_id: userId, ...result.data })` (line 79-81) with an explicit allow-list of columns (name,email,phone,company,org_number,address_line1,address_line2,postal_code,city,country,vat_number,peppol_endpoint) so unexpected/future columns cannot be set via the public API.

### A3 — Drop unsafe-eval (and tighten script inline) in CSP
**File:** `next.config.js`

In securityHeaders Content-Security-Policy (lines 13-15): remove 'unsafe-eval' from script-src entirely. Stripe.js and Supabase do not require it. Keep https://js.stripe.com. If 'unsafe-inline' on script-src is still needed by Next's inline bootstrap, prefer migrating to a nonce-based policy; at minimum document why inline remains. Leave style-src 'unsafe-inline' only if a Tailwind/CSS-in-JS audit confirms it is required, otherwise remove. Re-test Stripe Checkout redirect and Supabase auth after the change.

### A4 — Increase share-token entropy to 128-bit
**File:** `new migration supabase/migrations/<ts>_widen_share_token.sql`

ALTER COLUMN invoices.share_token SET DEFAULT encode(extensions.gen_random_bytes(16),'hex') (16 bytes = 128-bit). Backfill existing short tokens: UPDATE invoices SET share_token = encode(extensions.gen_random_bytes(16),'hex') WHERE length(share_token) <= 16 (this invalidates already-shared 64-bit links — acceptable for security; note in release notes). Keep the unique index. Forward-only/additive per deploy.yml migration policy.

### B1 — Support exempt/zero categories with mandatory exemption reason
**File:** `src/lib/ehf.ts`

Extend taxCategory() and the line/subtotal model to carry a category + optional exemption reason. For category 'Z' or 'E' (and 'AE'/'O' if you add them), emit <cbc:TaxExemptionReasonCode> and/or <cbc:TaxExemptionReason> inside cac:TaxCategory in BOTH the TaxSubtotal block (lines 254-263) and ClassifiedTaxCategory (lines 272-276) to satisfy Schematron BR-Z-10/BR-E-10/BR-O-10. Add a per-line `tax_category`/`exemption_reason` to EhfLine and thread it from invoice_items (add columns in a migration if persisting). Validate that any non-'S' line has a reason before building.

### B2 — Add EN16931/PEPPOL Schematron validation to CI
**File:** `.github/workflows/pr-checks.yml + new test fixture/script`

Add a job step that builds a representative EHF XML from a fixture (call buildEhfInvoice with a golden input) and validates it against the EN16931 UBL + PEPPOL BIS Billing 3.0 Schematron (e.g. via a node validator or the official .sch compiled to XSLT). Fail the PR on any error/warning. This requires adding a dev dependency for XML/Schematron validation (none present today). Wire the same check into deploy.yml before the Fly deploy step.

### B3 — Enforce invoice immutability for non-draft status
**File:** `src/app/api/invoices/[id]/route.ts + new DB trigger migration`

In PUT (lines 56-98): after fetching the invoice, reject content edits when status is 'sent'/'paid'/'cancelled' (allow only status transitions like marking paid, and notes if you choose). Belt-and-suspenders: add a DB trigger migration on public.invoices and public.invoice_items that raises an exception on UPDATE/DELETE of financial fields when the parent invoice status is not 'draft'. Mirror the existing trigger style used in migration 20240322000001.

### B4 — Allow fractional quantities end-to-end
**File:** `new migration supabase/migrations/<ts>_invoice_items_quantity_numeric.sql`

ALTER TABLE public.invoice_items ALTER COLUMN quantity TYPE numeric(12,2) USING quantity::numeric; (NOK amounts already DECIMAL). This lets 1.5 hours persist without truncation, matching ehf.ts n2(quantity) and the zod .positive() validators. Verify downstream Number(it.quantity) usages still work (they do — JS coerces numeric). Additive/forward-only.

### B5 — Render delivery date/place in PDF and EHF
**File:** `src/lib/ehf.ts, src/app/api/invoices/[id]/ehf/route.ts, src/lib/pdf.ts`

EHF: add optional actual_delivery_date + delivery_location to EhfInvoice and emit cac:Delivery/cbc:ActualDeliveryDate (and cac:DeliveryLocation/cac:Address) per BIS Billing 3.0; pass invoice.delivery_time (format to YYYY-MM-DD, treat stored TIMESTAMPTZ as UTC) and delivery_place from the ehf route (currently not passed, route lines 47-91) and from invoices/[id] PATCH (lines 229-273). PDF: add a 'Leveringsdato'/'Leveringssted' line in src/lib/pdf.ts rendering delivery_time as DD.MM.YYYY (nb-NO) and delivery_place. Show only when present.

### B6 — Stop burning numbers on drafts + reset sequence per year
**File:** `new migration replacing next_invoice_number() + call-site changes`

Defer number allocation: do NOT call next_invoice_number at draft creation (remove rpc call from src/app/api/invoices/route.ts:68 and src/app/api/v1/invoices/route.ts:131); allocate the number only at the send transition (invoices/[id] PATCH, and v1 when send=true) so abandoned drafts don't consume numbers. Rework the RPC to store a per-(user,year) counter (e.g. a table keyed by user_id+year, or a JSONB map on profiles) that RESETS to 0001 when to_char(now(),'YYYY') changes, so 2027 starts at 2027-0001. Keep it atomic (UPDATE ... RETURNING) and SECURITY DEFINER, and REVOKE/grant per the secure_invoice_share pattern.

### B7 — Roll back orphan invoice on v1 item-insert failure
**File:** `src/app/api/v1/invoices/route.ts`

In the itemsError branch (lines 173-175), before returning 500, delete the just-created invoice row: `await supabase.from('invoices').delete().eq('id', invoice.id);` — mirroring the web route's rollback at src/app/api/invoices/route.ts:111. (If B6 defers numbering this still matters to avoid orphan invoice rows.)

### C1 — Light up server/edge Sentry
**File:** `fly.toml + .github/workflows/deploy.yml + Dockerfile (or config rename)`

Either (a) set SENTRY_DSN to the same DSN value in fly.toml [env] (runtime only — it need not be a build arg for server runtime init) so sentry.server.config.ts/sentry.edge.config.ts initialize; or (b) simpler: change both server/edge configs to read process.env.NEXT_PUBLIC_SENTRY_DSN (already present everywhere) with SENTRY_DSN fallback. The DSN is not a secret. Verify by throwing a test error in a server route and confirming it lands in the fakturio Sentry project.

### C2 — Upload source maps on deploy
**File:** `.github/workflows/deploy.yml + Dockerfile`

Add SENTRY_AUTH_TOKEN as a GitHub secret and pass it into the build environment (Dockerfile ARG/ENV SENTRY_AUTH_TOKEN, forwarded via flyctl deploy --build-arg or set in CI build env) so withSentryConfig uploads source maps for the aiakaki/fakturio project. Keep hideSourceMaps:true. The token IS a secret — never put it in fly.toml.

### C3 — Add lint + tests to CI and a minimal test suite
**File:** `.github/workflows/pr-checks.yml, deploy.yml, package.json`

Add a dev test runner (e.g. vitest), a `test` script, and seed unit tests for the highest-risk pure logic: src/lib/ehf.ts (totals, tax grouping, exemption-reason emission from B1, escaping) and the invoice total/VAT math. Add `npm run lint` and `npm test` steps to pr-checks.yml and run them (at least lint+test) in deploy.yml before Fly deploy. Gate the EN16931 validation from B2 here too.

### C4 — Graceful SIGTERM drain
**File:** `new server entry (e.g. server-wrapper) or Dockerfile CMD + handler`

Wrap the Next standalone server so SIGTERM/SIGINT stops accepting new connections, waits for in-flight requests (with a bounded timeout < Fly's kill grace), then exits 0. Ensure the long PATCH send pipeline (PDF render + Resend + point deduct in invoices/[id]) either completes or is safe to retry. Align any drain timeout with Fly's default kill_timeout; document it.

### C5 — Fix the redirect→401 check everywhere
**File:** `src/app/api/invoices/[id]/route.ts, src/app/api/invoices/route.ts, src/app/api/invoices/[id]/ehf/route.ts`

Replace every `error instanceof Error && error.message.includes('redirect')` with a correct Next redirect detector: import { isRedirectError } from 'next/dist/client/components/redirect-error' (or check error?.digest?.startsWith('NEXT_REDIRECT')) and return 401 for it. Occurrences: [id]/route.ts:39,88,329,368; route.ts:25,118; ehf/route.ts:110. Consider centralizing in a small helper since it is duplicated 7x.

### C6 — Paginate/bound unbounded list endpoints
**File:** `src/app/api/invoices/route.ts, src/app/api/v1/clients/route.ts, src/lib/auth.ts`

Add limit+offset (or cursor) pagination to GET /api/invoices (currently fetchUserData with no bound, lines 10-22) and GET /api/v1/clients (no .limit, lines 38-43). Add an optional limit param to fetchUserData (src/lib/auth.ts:60-87) clamped to a max (e.g. 100). Narrow the web invoices SELECT away from items:invoice_items(*) for list views if only summary fields are needed. (v1 invoices GET is already bounded — no change.)

### C7 — Document PITR/backup + add external uptime monitor
**File:** `docs (new) + ops config`

Document Supabase PITR/backup retention for project xemufotqckljtkqoqbsf (Frankfurt) and add an external synthetic uptime monitor hitting https://fakturio.no/api/health/ (note the REQUIRED trailing slash per trailingSlash:true, or it 308s). This is ops/docs, no app code change.

### D1 — Publish accessibility statement (tilgjengelighetserklæring)
**File:** `new src/app/tilgjengelighet/page.tsx + footer link`

Add a Norwegian accessibility statement page covering WCAG conformance status and a contact for reporting barriers, per uu-tilsynet requirements. Link it from the site footer.

### D2 — Disclose subprocessors/DPA (extend Phase 2 privacy page)
**File:** `Phase 2 privacy page (src/app/personvern when it lands) — do NOT create a duplicate`

Add a subprocessor list to the Phase-2 privacy/personvern page: Supabase (DB+Auth, EU/Frankfurt), Stripe (payments), Resend (email), Fly.io (hosting, ams), Sentry (error tracking, EU ingest). Link the accessibility statement and DPA from the footer alongside it. Coordinate with Phase 2 to avoid two privacy pages.

### D3 — Guard Sentry replay PII (low priority)
**File:** `sentry.client.config.ts`

Replay is effectively off today (rates 0/0.1, no Replay integration registered). If/when session replay is enabled, add Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }) and keep replaysSessionSampleRate at 0 for a SaaS handling invoice PII. No urgent change; add a comment documenting the requirement.

## Acceptance criteria

- [ ] A valid fk_ API key against POST /api/v1/invoices and /api/v1/clients actually creates rows (no silent RLS rejection), and the code path uses user-scoped JWT or SECURITY-DEFINER RPCs — NOT the service-role key.
- [ ] A second tenant's API key cannot read or write the first tenant's invoices/clients via /api/v1 (verified by a cross-tenant attempt returning empty/forbidden).
- [ ] Response CSP header no longer contains 'unsafe-eval'; Stripe Checkout and Supabase auth still function.
- [ ] New invoice share_token values are 32 hex chars (128-bit); /i/[token] still resolves.
- [ ] buildEhfInvoice output for an invoice containing a 0%/exempt line includes a TaxExemptionReason(Code) and passes EN16931 + PEPPOL BIS Billing 3.0 Schematron in CI.
- [ ] Attempting PUT to edit a 'sent' or 'paid' invoice's financial fields is rejected at both API and DB layers.
- [ ] Inserting an invoice item with quantity 1.5 persists 1.50 (not truncated to 1).
- [ ] Delivery date appears as DD.MM.YYYY on the PDF and as cbc:ActualDeliveryDate in the EHF XML when set.
- [ ] Abandoning a draft does not consume an invoice number; on 1 Jan the per-user sequence restarts at <YYYY>-0001.
- [ ] A failed item insert in POST /api/v1/invoices leaves no orphan invoice row.
- [ ] A deliberate server-side exception appears in the fakturio Sentry project with a de-minified stack trace (source maps uploaded).
- [ ] Calling an authenticated API route without a session returns HTTP 401 (not 500).
- [ ] GET /api/invoices and GET /api/v1/clients accept a limit and never return the full unbounded table.
- [ ] pr-checks and deploy run lint + tests + Schematron validation and fail on errors.
- [ ] Container handles SIGTERM by draining in-flight requests before exit.
- [ ] A tilgjengelighetserklæring page is reachable and linked in the footer; the privacy page lists all subprocessors.

## Test plan

- v1 RLS fix: curl -X POST https://fakturio.no/api/v1/clients/ (TRAILING SLASH) -H 'Authorization: Bearer fk_<valid>' -H 'Content-Type: application/json' -d '{"name":"Test AS"}' → expect 201 and confirm the row in Supabase; repeat with a SECOND tenant's key and a GET to confirm isolation.
- CSP: curl -sI https://fakturio.no/ | grep -i content-security-policy → assert 'unsafe-eval' absent; manually run a Stripe checkout and a Supabase sign-in in the browser to confirm no CSP console violations.
- Share token: after migration, SELECT length(share_token) FROM invoices → all 32; open a freshly-generated /i/<token> link.
- EHF exempt: unit-test buildEhfInvoice with a line at vat_rate 0 + exemption reason → assert XML contains cbc:TaxExemptionReason; pipe the XML through the Schematron validator in CI and assert 0 errors.
- Immutability: PATCH an invoice to 'sent', then PUT new notes/issue_date → expect 4xx; attempt a raw UPDATE in psql on the items → expect trigger exception.
- Fractional qty: POST an invoice item quantity 1.5 → SELECT quantity → expect 1.50.
- Delivery: create invoice with delivery_time set, GET /api/invoices/<id>/ehf/ → assert cbc:ActualDeliveryDate; render the PDF and visually confirm 'Leveringsdato' DD.MM.YYYY.
- Numbering: create a draft, delete it, create another → assert no gap consumed; simulate year change (or unit-test the allocator) → assert reset to 0001.
- Orphan: temporarily force an item-insert error in v1 create → assert no invoice row remains.
- Sentry server: add a temporary throw in a server route, deploy, trigger it → confirm event with readable stack in Sentry; remove the throw.
- 401: curl an authed route with no cookie/key → expect 401, not 500.
- Pagination: GET /api/invoices/?limit=5 → expect <=5; GET /api/v1/clients/?limit=2 → expect <=2.
- CI: open a PR that introduces an EHF Schematron violation → assert pr-checks fails; lint/test steps visible and green on a clean PR.
- SIGTERM: locally `docker run` the image, send SIGTERM during an in-flight request → assert it completes and the process exits 0.
- Compliance: load /tilgjengelighet/ and the privacy page → confirm content and footer links.

## Risks & gotchas

- Ordering: the un-REVOKEd points/number RPCs are a LAUNCH BLOCKER tracked outside this phase — do NOT 'fix' /api/v1 (A1) by switching to the service-role key before/around that, or you convert a dead endpoint into a live cross-tenant write hole. Land the RPC REVOKE first, then A1 with user-scoped access only.
- B6 changes WHEN numbers are allocated (send-time, not draft-time). This touches both web and v1 create + both send paths; if half-applied you get either double allocation or sent invoices with no number. Apply atomically and test both paths.
- B4 (quantity INTEGER→numeric) and B6 (numbering rework) are schema/RPC migrations pushed by deploy.yml `supabase db push --include-all` BEFORE the app deploys — they must be backward-compatible with the currently-running image for the brief window between migrate and deploy.
- A4 share-token widening invalidates existing 64-bit share links if you backfill — communicate or skip backfill for already-issued links (security tradeoff).
- CSP A3: removing 'unsafe-inline' from script-src without a nonce can break Next's inline bootstrap and break the whole app — verify in a preview before prod; keep the change minimal (eval first).
- C1 Sentry DSN as runtime [env] is fine, but if you instead add it as a build arg remember the test-key/live-key rebuild caveat — server DSN does not need build-time baking.
- C4 SIGTERM drain timeout must be shorter than Fly's machine kill grace or Fly force-kills mid-drain; the long PATCH send pipeline (PDF+Resend+point deduct) is the main thing that can be interrupted — ensure point refund/idempotency covers a mid-send kill.
- B3 immutability must still permit legitimate transitions (draft→sent, sent→paid, →cancelled) and point/refund updates; an over-broad trigger could block the send pipeline itself.
- B1 exemption reasons: emitting an empty/placeholder reason still fails Schematron — require a real reason for any non-'S' line at validation time.
- Trailing-slash trap: all curl/synthetic checks and any new external POST integrations MUST use the trailing-slash URL (e.g. /api/health/, /api/v1/clients/) or get 308'd.
- D2 must coordinate with Phase 2's privacy page to avoid shipping two divergent privacy/personvern pages.

## Out of scope (deferred)

- The points/number SECURITY DEFINER RPC REVOKE/grant hardening (next_invoice_number, deduct_invoice_point, add_invoice_points) — that is a launch blocker tracked in the go-live audit, only referenced here as context for A1.
- Stripe test→live switch and the required image rebuild (separate go-live task).
- PEPPOL Access Point (B2Brouter) outbound delivery integration — separate gating item.
- Building the Phase 2 privacy/personvern page from scratch (D2 only extends it with subprocessors).
- Replacing the hand-rolled UBL string-concat builder with a real XML library (B2 adds validation to catch regressions; a full rewrite is a larger effort).
- The dead subscription (growth/enterprise unlimited) tier — not activated in this phase.
