# Phase 3 — PEPPOL e-invoice delivery via B2Brouter

> ⏸ **DEFERRED — NOT a launch blocker.** As of 01.06.2026 the founder deprioritized PEPPOL delivery: launch with EHF as a downloadable/export file, get real users + feedback, and build this only once there's demand. At launch, [Phase 4](./phase-4-landing-honesty.md) must ensure no copy promises network "sending." This brief is preserved for when the time comes.
>
> **Tier:** Deferred (was Blocker) &nbsp;·&nbsp; **Estimated effort:** ~3-4 days (largest phase): ~0.5 day API contract confirmation + sandbox setup, ~0.5 day migration + types, ~1 day B2Brouter client + preflight + send/status routes with idempotency and point accounting, ~0.5 day UI (button, status badge, polling, retry) + client-form tightening, ~1 day sandbox end-to-end testing and one controlled live verification.
>
> Self-contained brief — execute in a fresh session. See [PHASES.md](./PHASES.md) for the full go-live sequence and how this phase fits in. All file:line references were verified against the repo on 01.06.2026; re-confirm before editing since code may have moved.

## Objective

Wire real PEPPOL delivery of EHF 3.0 invoices through B2Brouter, the access point the founder already signed up for. Today the app only generates UBL XML and serves it as a download/email attachment; nothing reaches the PEPPOL network. This phase adds a "Send via PEPPOL" action, persistent per-invoice delivery status (queued/sent/delivered/failed) with idempotency and retry, status display, and a B2Brouter sandbox path before go-live. This is the founder's #1 ship-blocker and the largest phase in the plan.

## Context

Product: Fakturio, Norwegian e-invoicing SaaS. Next.js 14 App Router, standalone output, deployed on Fly.io (app `fakturia`, region ams, port 3003, Dockerfile). Supabase Postgres + Auth + RLS. Stripe (one-off invoice packs pack_5/10/25 = 49/89/199 NOK; a subscription code path exists but is dead/placeholder). Resend for email. @react-pdf/renderer for PDFs.

Money is NOK, handled in øre where possible. EU date formats (DD.MM.YYYY), 24h clock, metric; all non-local times in UTC.

CRITICAL DEPLOY TRAPS:
- next.config.js has trailingSlash:true. Any external POST INTO this app (e.g. a B2Brouter delivery-status WEBHOOK if we choose to expose one) MUST target the trailing-slash URL (e.g. /api/peppol/webhook/) or it gets 308-redirected and the POST body is lost. Outbound calls FROM the app to B2Brouter are unaffected.
- The live Stripe publishable key is baked at BUILD time (fly.toml [build.args] + .github workflows). Adding a new RUNTIME secret like B2BROUTER_API_KEY does NOT require an image rebuild — it is set via `fly secrets set` and injected at runtime, same as RESEND_API_KEY already is. Only NEXT_PUBLIC_* build args need a rebuild.
- The Supabase hardening pattern to copy for any new SECURITY DEFINER RPC is in supabase/migrations/20260510120000_secure_invoice_share.sql: `revoke all on function ... from public; grant execute ... to anon, authenticated`. (Phase 3 likely needs no new RPC, but if one is added, this REVOKE pattern is mandatory — a prior audit found points RPCs lacked it.)

B2Brouter API (Invinet/Editran platform, Redmine-derived REST API). Account is on the free/basic plan (24 invoices/yr — hard cap to respect; do NOT auto-send in bulk loops). Known shape, but the implementing engineer MUST confirm exact paths/headers against the live API docs linked from the B2Brouter dashboard for THIS account before coding, because B2Brouter has both a legacy XML/Redmine API and a newer JSON API:
- Auth: per-account API key sent as an HTTP header (legacy: `X-Redmine-API-Key: <key>`; some accounts use `?key=` query or an `Authorization` bearer). Store as Fly runtime secret B2BROUTER_API_KEY. Never log it.
- Submit: B2Brouter accepts our UBL/EHF XML DIRECTLY (it does the AS4/SBDH/SMP-lookup PEPPOL transport for us) via an "import invoice" endpoint, historically `POST /projects/{projectId}/invoices/import.xml` with Content-Type application/xml and the raw UBL as the body; the project/account id comes from the dashboard. The newer API exposes a JSON create endpoint — either is acceptable; importing our existing UBL is preferred because src/lib/ehf.ts already produces compliant UBL.
- Status: each submitted invoice gets a B2Brouter document id; poll `GET /invoices/{id}.xml` (or the JSON equivalent) for state, which progresses through values like new/imported → sent/delivered → error, plus a human-readable error/validation message on rejection.
- Base URLs: production app.b2brouter.net; there is a separate SANDBOX/test environment (e.g. app.b2brouter-pre... / a "test" project) — confirm the exact sandbox host from the dashboard and use it for all pre-go-live testing.
- The free plan still routes to the LIVE PEPPOL network, so a test send delivers a real document to a real recipient. Use the sandbox/test project for everything except a single deliberate end-to-end live verification to a controlled recipient.

## Current state (verified)

### Delivery code — confirmed ZERO
`(repo-wide grep)` &nbsp;·&nbsp; lines n/a

grep -rni 'b2brouter|access point|AS4|SBDH|participant|smp' across src/ and supabase/ returns ONLY a doc comment in src/lib/ehf.ts:90 ('orgnr → PEPPOL participant ID'). There is genuinely no transport/delivery code, no access-point client, no AS4/SBDH handling. The product stops at generating UBL XML.

### UBL generator
`src/lib/ehf.ts` &nbsp;·&nbsp; lines 182-322

buildEhfInvoice(input) returns a self-contained UBL 2.1 / EHF 3.0 Invoice string. CustomizationID/ProfileID are the PEPPOL BIS Billing 3.0 values (lines 11-12). Computes EndpointID for seller from company.org_number (scheme 0192) at line 219 and for buyer from client.peppol_endpoint OR client.org_number at line 220 via peppolEndpoint() (lines 91-100, parses 'NNNN:id' or falls back to 0192:orgnr). validate() (lines 108-126) throws EhfValidationError listing missing mandatory fields. NOTE seller VAT: PartyTaxScheme/CompanyID is emitted only if company.vat_number is set (line 159-161); for VAT-registered Norwegian sellers EN16931 rule BR-S-02 requires a seller VAT id when category S is used — this is the Phase 5 BR-S-02 dependency that B2Brouter Schematron will REJECT if violated.

### EHF download route (no delivery)
`src/app/api/invoices/[id]/ehf/route.ts` &nbsp;·&nbsp; lines 17-115

GET only. Builds UBL via buildEhfInvoice and returns it as Content-Disposition: attachment (lines 94-101). On missing fields returns 422 with {missing:[...]} (lines 103-108). This is download-only; nothing is transmitted to PEPPOL.

### Send flow (email only, not PEPPOL)
`src/app/api/invoices/[id]/route.ts` &nbsp;·&nbsp; lines 103-324

PATCH with body {action:'send'} is the ONLY send path. It deducts 1 invoice point via RPC deduct_invoice_point (atomic, lines 149-162) unless on an 'unlimited' subscription tier (lines 143-145), renders a PDF, best-effort builds EHF XML (lines 227-279, silently null on EhfValidationError), emails PDF+optional XML via sendInvoiceEmail, then sets status='sent' (line 297). On ANY failure it refunds the point via add_invoice_points (lines 299-307). There is NO PEPPOL submission and NO idempotency guard against re-sending (status 'draft'→'sent' allowed repeatedly; only 'paid'/'cancelled' are blocked at line 131).

### Email attachment path
`src/lib/email.ts` &nbsp;·&nbsp; lines 21-57

sendInvoiceEmail attaches the PDF and, if ehfXml is provided, an EHF_<num>.xml file. This is the current 'EHF delivery' — an email attachment, NOT PEPPOL. Resend is lazily constructed and gated on RESEND_API_KEY (lines 4-9), the exact env-secret pattern to mirror for B2BROUTER_API_KEY.

### Recipient PEPPOL id — schema EXISTS
`supabase/migrations/20260513120000_ehf_invoice_fields.sql` &nbsp;·&nbsp; lines 8-18

clients table already has peppol_endpoint text (line 18, comment 'e.g. 0192:123456789') plus org_number, address_line1/2, postal_code, city, country DEFAULT 'NO', vat_number. So buyer participant id CAN be captured. The column comment even says 'required if we ever auto-deliver via an Access Point' — that time is now.

### Recipient PEPPOL id — form + validation EXIST
`src/lib/validations/invoice.ts` &nbsp;·&nbsp; lines 60

createClientSchema accepts peppol_endpoint: z.string().max(60).optional(). Client create form (src/app/clients/new/page.tsx:196-201) and edit form (src/app/clients/[id]/page.tsx:337-342) both render a 'PEPPOL-endepunkt' input bound to peppol_endpoint. So per-client capture is wired UI→validation→DB; what is MISSING is (a) it is optional/free-text with no format validation, and (b) nothing verifies the recipient is actually registered/reachable on PEPPOL (SMP lookup).

### Invoice delivery-status field — MISSING
`src/types/database.ts` &nbsp;·&nbsp; lines 30-50

Invoice interface has status: InvoiceStatus = 'draft'|'sent'|'paid'|'overdue'|'cancelled' (line 1, 37). There is NO peppol/delivery status column anywhere. invoice_status enum (supabase/migrations/20240320000000_create_invoice_status.sql:5-12) does not model transport states. A new, SEPARATE delivery-status concept is needed (do not overload the business status enum).

### Sender registration tracking — MISSING
`supabase/migrations/20240321000001_update_company_settings.sql` &nbsp;·&nbsp; lines 3-6

company_settings has organization_number, is_company_registered, vat_registered, vat_number (and elsewhere bank_account, address). There is NO field tracking whether the SENDER's org number is registered on PEPPOL / onboarded as a B2Brouter sender. Sender onboarding on the network is a one-time B2Brouter account/config step; the app only needs the seller org number (already present) but should record send-capability state for UX.

### Invoice detail UI actions
`src/components/InvoiceDetailClient.tsx` &nbsp;·&nbsp; lines 284-297

Action bar has 'Last ned EHF' (handleDownloadEhf, GET /ehf) and 'Send Invoice'/'Send på nytt' (handleSend → PATCH {action:'send'}). This is exactly where a 'Send via PEPPOL' button + a delivery-status badge must be added. handleSend already handles a 402 'insufficient points' and toasts.

### Runtime secrets precedent
`fly.toml` &nbsp;·&nbsp; lines 18-25

[env] holds only NON-secret NEXT_PUBLIC_* values + PORT/NODE_ENV. Secrets (RESEND_API_KEY) are NOT in fly.toml — they are set via `fly secrets set` at runtime. B2BROUTER_API_KEY follows the same pattern: runtime secret, no image rebuild needed. The trailingSlash:true health check at line 40 (/api/health/) is the canonical reminder that inbound POSTs need the trailing slash.

## Implementation steps

### 1 — Confirm B2Brouter API contract (do FIRST, do not skip)
**File:** `(investigation, no code)`

Log into the B2Brouter dashboard for this account. Capture and write down EXACTLY: (a) the API base URL for production and for the sandbox/test environment; (b) the auth header name and how the API key is presented (X-Redmine-API-Key header vs Authorization bearer vs ?key= query); (c) the account/project id used in the import path; (d) the import endpoint (expected POST /projects/{projectId}/invoices/import.xml, Content-Type application/xml, raw UBL body) and its success response shape (the returned B2Brouter document id); (e) the status-read endpoint (expected GET /invoices/{id}.xml) and the set of state values + where the validation/error message lives; (f) whether webhooks for status are available. These confirmed values drive every step below. If the account exposes only the newer JSON API, adapt: still submit our UBL (most plans accept import.xml); otherwise map our invoice to their JSON create body.

### 2 — Add Fly runtime secret
**File:** `(ops, fly.toml unchanged)`

Run `fly secrets set B2BROUTER_API_KEY=<key> -a fakturia` (and B2BROUTER_PROJECT_ID, B2BROUTER_BASE_URL if you choose to make base URL configurable so sandbox vs prod is a secret/env toggle). Do NOT put the key in fly.toml [env] or [build.args] — it is a runtime secret, mirroring RESEND_API_KEY. No image rebuild required. Add the same vars to .env.local for local dev and to the .github workflow's secret set if CI runs integration tests.

### 3 — DB migration: per-invoice PEPPOL delivery columns
**File:** `new migration supabase/migrations/20260602000000_peppol_delivery.sql`

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS peppol_status text NOT NULL DEFAULT 'none' (allowed: 'none','queued','sent','delivered','failed'); ADD COLUMN IF NOT EXISTS peppol_provider text; ADD COLUMN IF NOT EXISTS peppol_document_id text (B2Brouter doc id — also serves as idempotency anchor); ADD COLUMN IF NOT EXISTS peppol_error text; ADD COLUMN IF NOT EXISTS peppol_submitted_at timestamptz; ADD COLUMN IF NOT EXISTS peppol_delivered_at timestamptz. Add a CHECK constraint on peppol_status. Add a partial UNIQUE INDEX on peppol_document_id WHERE peppol_document_id IS NOT NULL to prevent duplicate id rows. Do NOT touch the invoice_status enum — peppol_status is orthogonal to the business status. Existing RLS on invoices already scopes by user_id, so no new policy is needed. (If you later add a status-poll RPC, copy the REVOKE/GRANT pattern from 20260510120000_secure_invoice_share.sql.)

### 4 — Update Invoice TS type
**File:** `src/types/database.ts`

Extend the Invoice interface (after line 47) with: peppol_status?: 'none'|'queued'|'sent'|'delivered'|'failed'; peppol_provider?: string|null; peppol_document_id?: string|null; peppol_error?: string|null; peppol_submitted_at?: string|null; peppol_delivered_at?: string|null. Export a PeppolStatus union type for reuse in the UI.

### 5 — B2Brouter client library
**File:** `new src/lib/peppol/b2brouter.ts`

Create a thin server-only client mirroring the lazy-getter pattern of src/lib/email.ts. Read B2BROUTER_API_KEY, B2BROUTER_PROJECT_ID, B2BROUTER_BASE_URL (default to the production host; sandbox host overrideable via env). Export: (a) async submitInvoice(ublXml: string): Promise<{documentId: string}> — POST {base}/projects/{projectId}/invoices/import.xml with header set per step 1, Content-Type application/xml, body = raw UBL; parse the returned document id; throw a typed B2BrouterError carrying the HTTP status + response body on non-2xx (B2Brouter returns Schematron/EN16931 validation errors here). (b) async getStatus(documentId: string): Promise<{state: 'queued'|'sent'|'delivered'|'failed'; rawState: string; error?: string}> — GET {base}/invoices/{documentId}.xml, map B2Brouter's state vocabulary to our 4 states. Never log the API key. Add a 20s fetch timeout via AbortController. This file must never be imported into a client component.

### 6 — Pre-send validation gate (recipient + UBL validity)
**File:** `new src/lib/peppol/preflight.ts (and reuse src/lib/ehf.ts validate)`

Before any submit, run preflight: (a) require client.peppol_endpoint OR client.org_number present and well-formed (regex ^\d{4}:\w+$ for endpoint, or 9-digit Norwegian orgnr that we format as 0192:<orgnr>); reject with a clear field-level error otherwise. (b) Call buildEhfInvoice — if it throws EhfValidationError, surface the missing[] list (same shape the /ehf route already returns at 422). (c) Explicitly guard the BR-S-02 case: if any line has vat_rate>0 (tax category S) and company.vat_number is empty, block with message 'Seller VAT number required for VAT invoices (EN16931 BR-S-02)'. B2Brouter WILL reject otherwise, but failing fast here saves a wasted submission against the 24/yr quota. (Full Schematron is Phase 5; this is the minimal subset that blocks PEPPOL submission.)

### 7 — Send-via-PEPPOL API route (idempotent)
**File:** `new src/app/api/invoices/[id]/peppol/route.ts (POST)`

POST handler: getAuthenticatedUser; fetchUserRecord invoice + client + items + company (same selects as the existing /ehf route lines 24-45). IDEMPOTENCY: if invoice.peppol_status IN ('queued','sent','delivered') AND peppol_document_id is set, return 409/200 with the existing status — do NOT resubmit (protects the 24/yr quota and prevents double-delivery). Run preflight (step 6); on failure return 422 with {missing|error}. Set peppol_status='queued', peppol_submitted_at=now() (optimistic, before the network call) via updateUserRecord. Call b2brouter.submitInvoice(xml). On success: persist peppol_document_id, peppol_provider='b2brouter', peppol_status='sent', clear peppol_error. On B2BrouterError: set peppol_status='failed', peppol_error=<message>, return 502 with the error so the UI can show it. POINTS: decide policy explicitly — recommended is to deduct the invoice point on successful B2Brouter ACCEPT (reuse deduct_invoice_point / refund via add_invoice_points exactly as PATCH does at lines 149-162 & 299-307), so a failed/rejected send costs nothing. Keep email-send (PATCH action:'send') and PEPPOL-send as SEPARATE actions; sending via PEPPOL should NOT also email unless the user picks both.

### 8 — Status read/poll route
**File:** `new src/app/api/invoices/[id]/peppol/status/route.ts (GET)`

GET handler: ownership-checked fetch; if peppol_document_id present, call b2brouter.getStatus, update peppol_status and peppol_delivered_at (when delivered) / peppol_error (when failed) in the DB, return the current status JSON. This lets the detail page poll for delivered/failed after the initial 'sent'. Free-plan friendly: no background cron needed — poll on-demand when the invoice detail page is open. (Optional later: a status webhook at /api/peppol/webhook/ WITH the mandatory trailing slash per trailingSlash:true — but only if B2Brouter supports webhooks for this plan; on-demand polling is sufficient for MVP.)

### 9 — Retry action
**File:** `src/app/api/invoices/[id]/peppol/route.ts`

Allow re-submit ONLY when peppol_status='failed' (or 'none'). The idempotency guard in step 7 already blocks resubmit for queued/sent/delivered. A 'Retry PEPPOL' button reuses the same POST route; because failed sends did not consume a point (step 7 policy), retry is safe against quota.

### 10 — UI: Send via PEPPOL button + status badge
**File:** `src/components/InvoiceDetailClient.tsx`

In the action bar (around lines 284-297, next to 'Last ned EHF' and 'Send Invoice'), add a 'Send via PEPPOL'/'Send via PEPPOL-nettverket' button calling POST /api/invoices/[id]/peppol. Disable + show spinner while in flight. On 422 (missing fields / BR-S-02) toast the specific error and ideally deep-link to the client edit page when peppol_endpoint is the problem. Add a delivery-status badge driven by invoice.peppol_status: none→hidden/'Ikke sendt', queued/sent→'Sendt, venter på levering' (then poll the status route every ~10s while open), delivered→'Levert' (green) with peppol_delivered_at shown in DD.MM.YYYY HH:mm, failed→'Feilet' (red) showing peppol_error with a 'Retry' button. Format the delivered timestamp using EU date + 24h clock.

### 11 — Client form: make PEPPOL id first-class
**File:** `src/app/clients/new/page.tsx (196-201) and src/app/clients/[id]/page.tsx (337-342); src/lib/validations/invoice.ts (60)`

Tighten peppol_endpoint validation: accept either 'NNNN:identifier' or a bare 9-digit Norwegian org number (auto-prefix 0192:). Add helper text 'For levering via PEPPOL: motpartens organisasjonsnummer (f.eks. 0192:999888777)'. Optionally add a 'Sjekk PEPPOL' button that, before first send, calls B2Brouter's recipient/participant lookup (SMP) if the account exposes it, to confirm the buyer is reachable — otherwise the first real send is the verification. Do not make peppol_endpoint globally required (email-only clients still exist), but require it at PEPPOL-send time (enforced by preflight, step 6).

### 12 — Sandbox-first test config
**File:** `src/lib/peppol/b2brouter.ts + .github workflow / fly secrets`

Make the base URL + project id env-driven so the sandbox/test B2Brouter environment is used everywhere except production. Verify the entire flow against sandbox before pointing prod at the live endpoint. Because the free plan delivers to the LIVE PEPPOL network, restrict live testing to ONE controlled end-to-end send to a recipient org you control, then watch it reach 'delivered'.

## Acceptance criteria

- [ ] A 'Send via PEPPOL' action exists on the invoice detail page and, for a valid invoice with a reachable recipient, results in invoice.peppol_status transitioning none→sent and a non-null peppol_document_id persisted.
- [ ] Polling the status route advances a successfully-routed invoice to peppol_status='delivered' with peppol_delivered_at set; a rejected one to 'failed' with a human-readable peppol_error.
- [ ] Submitting the same invoice twice does NOT create a second B2Brouter document: the second call returns the existing status (409/200) and does not consume an invoice point or re-deliver.
- [ ] An invoice missing mandatory EHF fields, or a VAT-rated invoice with no seller vat_number (BR-S-02), is blocked BEFORE submission with a specific actionable error — no wasted B2Brouter quota.
- [ ] B2BROUTER_API_KEY is a Fly runtime secret (visible in `fly secrets list`, absent from fly.toml and from logs); deploying it required no image rebuild.
- [ ] peppol_endpoint can be entered/edited per client and is required (validated) at PEPPOL-send time but not for email-only sends.
- [ ] All flows pass against the B2Brouter SANDBOX before any production endpoint is enabled; exactly one deliberate live end-to-end send is verified as 'delivered'.
- [ ] A failed send leaves the invoice point unconsumed (or refunded) and a 'Retry' re-submits cleanly.

## Test plan

- Step 1 verification: from the B2Brouter dashboard, record base URLs (prod+sandbox), auth header, project id, import endpoint, status endpoint; paste into a scratch note and reconcile with src/lib/peppol/b2brouter.ts before writing the route.
- Local curl against SANDBOX import: `curl -X POST '{SANDBOX_BASE}/projects/{PROJECT}/invoices/import.xml' -H '{AUTH_HEADER}: $B2BROUTER_API_KEY' -H 'Content-Type: application/xml' --data-binary @sample-ehf.xml` (generate sample-ehf.xml via the existing GET /api/invoices/[id]/ehf download). Confirm it returns a document id, not a validation error.
- Status poll: `curl '{SANDBOX_BASE}/invoices/{DOC_ID}.xml' -H '{AUTH_HEADER}: $B2BROUTER_API_KEY'` and confirm the state vocabulary matches the mapping in getStatus().
- Negative UBL test: submit an invoice with vat_rate=25 but blank company.vat_number; confirm preflight blocks it locally with the BR-S-02 message AND (if you bypass preflight) that B2Brouter sandbox itself rejects it — proving the gate is real.
- Idempotency: trigger Send via PEPPOL twice quickly on the same invoice; assert only one peppol_document_id and one B2Brouter document, no double point deduction.
- UI: open invoice detail, click Send via PEPPOL, watch badge go queued/sent → (poll) → delivered with the timestamp rendered DD.MM.YYYY HH:mm; force a failure (bad recipient endpoint) and confirm 'Feilet' + error text + working Retry.
- Trailing-slash check (only if a webhook is added): POST to /api/peppol/webhook (no slash) and confirm it 308s, then POST to /api/peppol/webhook/ and confirm the body is received — otherwise skip (polling-only MVP).
- Production cutover: flip base URL to prod via `fly secrets set`, redeploy (runtime secret, no rebuild), send ONE real invoice to a controlled recipient org, confirm 'delivered'.

## Risks & gotchas

- Free/basic plan hard cap is 24 invoices/year and the free plan delivers to the LIVE network — every test send to a real recipient is irreversible and counts against quota. Use the sandbox/test project for all iteration; limit live sends to one controlled verification. Burning quota or mis-delivering to a real buyer is the top risk.
- Exact B2Brouter endpoints/auth differ between the legacy XML/Redmine API and the newer JSON API and between plan tiers; coding against assumed paths without step-1 confirmation will fail. The brief mandates dashboard confirmation first.
- BR-S-02 (seller VAT id missing on VAT-rated lines) is a hard EN16931/Schematron failure B2Brouter will reject — src/lib/ehf.ts emits the seller VAT block conditionally (only if company.vat_number set). This Phase-5 dependency MUST be gated in preflight or real sends silently fail at the AP.
- Idempotency is essential: the existing PATCH send path has NONE (it re-sends freely). Without the peppol_document_id guard, a double click or retry could deliver the same invoice twice on the network — embarrassing and quota-wasting.
- peppol_endpoint is currently optional free-text with no SMP/registration check — a syntactically valid but unregistered recipient will be accepted by the form and only fail at B2Brouter. Surface the AP's error clearly and consider an SMP lookup before first send.
- Point/quota accounting interaction: the email send already deducts/refunds a point. If PEPPOL send also deducts, decide and document whether sending the SAME invoice by both channels costs one point or two — avoid surprising the user. Recommended: deduct once per successful delivery channel, refund on failure.
- trailingSlash:true: if a B2Brouter status webhook is added, it MUST use the trailing-slash inbound URL or the POST is 308'd and lost — same trap that bit Stripe webhooks/health checks.
- B2BROUTER_API_KEY must never hit logs, Sentry, or client bundles — keep the client server-only and scrub it from error reporting.

## Out of scope (deferred)

- Full EN16931/Schematron validation suite (only the minimal BR-S-02 + buildEhfInvoice mandatory-field subset is gated here) — deferred to Phase 5.
- Inbound/receiving e-invoices over PEPPOL (this phase is outbound delivery only).
- Credit notes / invoice corrections over PEPPOL (commercial invoice 380 only for now).
- Background cron/queue worker for status polling — MVP uses on-demand polling while the detail page is open; a worker can come later if needed.
- Switching Stripe to live mode / the image-rebuild that requires (separate phase).
- Reviving the dead subscription code path; this phase works with the existing one-off pack point model.
- Bulk / auto-send of many invoices — explicitly avoided given the 24/yr free-plan cap.
