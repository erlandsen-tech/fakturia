# Phase 2 — Legal compliance & data retention (BLOCKER)

> **Tier:** BLOCKER &nbsp;·&nbsp; **Estimated effort:** ~1 day (about 2-3h for the soft-delete migration + route + UI + read-path fixes and testing; 3-4h drafting the two legal-page outlines into TSX and the signup consent gate; remainder for build/QA). Final legal wording sign-off by the user is additional and outside engineering time.
>
> Self-contained brief — execute in a fresh session. See [PHASES.md](./PHASES.md) for the full go-live sequence and how this phase fits in. All file:line references were verified against the repo on 01.06.2026; re-confirm before editing since code may have moved.

## Objective

Make Fakturio legally shippable in Norway/EU by fixing invoice deletion to a status-guarded soft-delete (bokføringsloven §13 5-year retention + sequential numbering integrity), publishing a Norwegian GDPR privacy policy at /personvern with subprocessor disclosure, and publishing Terms of Service at /vilkar with a blocking signup consent checkbox. All three are go-live blockers.

## Context

Product: Norwegian e-invoicing SaaS (EHF 3.0 / PEPPOL BIS Billing 3.0) for enkeltpersonforetak. Stack: Next.js 14 App Router (standalone), Supabase Postgres+Auth+RLS, Stripe, Resend, @react-pdf/renderer; deployed on Fly.io. Money is NOK; UI dates render via toLocaleDateString (should be EU DD.MM.YYYY, 24h, UTC for non-local). Legal facts: (a) bokføringsloven (the Norwegian Bookkeeping Act) §13 requires accounting documentation incl. sales invoices to be retained 5 years; a sent/paid invoice is a bokføringspliktig document and MUST NOT be physically deleted. (b) Sequential, gap-free invoice numbering is mandatory (bokføringsforskriften); physically deleting an issued invoice leaves a numbering gap that is itself a violation. The app already allocates numbers atomically via the next_invoice_number RPC (migration 20260504000003, lines 82-101) and stores them per-user-unique. (c) GDPR: the controller (the user) and Fakturio-as-processor handle the user's personal data AND their clients' personal data, and money changes hands, so a privacy policy + subprocessor list is mandatory. Known subprocessors to disclose: Supabase (DB/Auth, EU Frankfurt eu-central-1), Stripe (payments), Resend (transactional email), Sentry (error tracking), Fly.io (hosting, ams region), B2Brouter (PEPPOL access point). Existing hardening pattern to copy for any new SECURITY DEFINER function: supabase/migrations/20260510120000_secure_invoice_share.sql lines 59-60 ("revoke all on function ... from public; grant execute ... to anon, authenticated"). i18n: client components use t(key) from src/lib/i18n.tsx (signature t(key, locale='nb'), line 315); server components use t(key) from src/lib/i18n.server.ts (line 8). Both are passthrough — an untranslated key renders as-is, so Norwegian strings can be passed directly. trailingSlash:true is set in next.config.js — new page routes are unaffected (Next handles internal links), this only matters for external POSTs.

## Current state (verified)

### Invoice delete is a physical DELETE (illegal)
`src/lib/auth.ts` &nbsp;·&nbsp; lines 154-178

deleteUserRecord() verifies ownership then runs supabase.from(tableName).delete().eq('id',...).eq('user_id',...) — a hard physical delete. No deleted_at handling, no status guard.

### Invoice DELETE route calls the physical delete
`src/app/api/invoices/[id]/route.ts` &nbsp;·&nbsp; lines 354-388

DELETE handler calls deleteUserRecord('invoices', params.id) unconditionally. No check of invoice.status — a 'sent' or 'paid' invoice can be physically destroyed, breaking §13 retention and leaving a gap in the sequential invoice_number series.

### deleted_at column already exists
`supabase/migrations/20260504000003_subscriptions_apikeys_softdelete.sql` &nbsp;·&nbsp; lines 55-61

invoices.deleted_at (and clients.deleted_at) TIMESTAMPTZ columns + indexes already exist. So no new column is needed — the infrastructure for soft-delete is present but the delete path doesn't use it.

### Some read paths already filter deleted_at, but NOT all
`src/app/api/invoices/route.ts` &nbsp;·&nbsp; lines 10-22

GET /api/invoices passes { deleted_at: null } to fetchUserData — correctly excludes soft-deleted invoices. v1 GET also filters (src/app/api/v1/invoices/route.ts:302 uses .is('deleted_at', null)).

### Invoice LIST page does NOT filter deleted_at (leak path)
`src/app/invoices/page.tsx` &nbsp;·&nbsp; lines 58-66

The list page queries Supabase directly from the browser client (.from('invoices').select(...).eq('user_id', user.id).order(...)) with NO deleted_at filter. Once soft-delete lands, deleted invoices would still appear here. Must add .is('deleted_at', null).

### Invoice DETAIL page / fetchUserRecord do NOT filter deleted_at
`src/lib/auth.ts` &nbsp;·&nbsp; lines 92-116

fetchUserRecord() (used by detail page src/app/invoices/[id]/page.tsx:14 and GET /api/invoices/[id]:18) selects by id+user_id with no deleted_at filter. Decision: detail GET should still be able to render a soft-deleted invoice (for the legally-required 5yr access), but it must visibly mark it deleted and hide edit/send/delete actions. The list is the place to hide them.

### Delete UI button has no status awareness
`src/components/InvoiceDetailClient.tsx` &nbsp;·&nbsp; lines 180-205, 305-312

handleDelete() always shows a destructive Delete button with a generic confirm() and POSTs DELETE regardless of invoice.status. Needs to be hidden/disabled for non-draft invoices.

### deleteUserRecord is shared with clients
`src/app/api/clients/[id]/route.ts` &nbsp;·&nbsp; lines 53

Clients DELETE also uses deleteUserRecord('clients', ...). To avoid changing client semantics in this phase, do NOT change deleteUserRecord itself; add a dedicated soft-delete path for invoices only.

### No privacy/terms routes exist
`src/app/ (route tree)` &nbsp;·&nbsp; lines n/a

find over src/app for personvern/vilkar/privacy/terms/legal returns nothing. Neither page exists.

### Footer has no legal links
`src/app/page.tsx` &nbsp;·&nbsp; lines 214-223

Landing footer contains only Wordmark, footer.tagline and 'Org.nr 925 100 200'. No Personvern / Vilkår links. Root layout (src/app/layout.tsx) has no global footer at all — the footer only lives on the landing page.

### Signup collects only email+password, no consent
`src/app/sign-up/[[...sign-up]]/page.tsx` &nbsp;·&nbsp; lines 12-80

SignUpPage has email + password fields and a submit button. No consent checkbox, no link to terms/privacy. supabase.auth.signUp is called with no gating on acceptance.

### Invoice status type
`supabase/migrations/20240320000000_create_invoice_status.sql` &nbsp;·&nbsp; lines 5-11

invoice_status enum = draft|sent|paid|overdue|cancelled. 'draft' is the only status that may be deleted; everything else is an issued/legally-retained document.

## Implementation steps

### 2.1a — Add a SECURITY DEFINER soft-delete RPC for invoices (status-guarded, copies the secure_invoice_share REVOKE/GRANT pattern)
**File:** `new migration: supabase/migrations/20260601120000_invoice_soft_delete.sql`

Create function public.soft_delete_invoice(p_invoice_id uuid) returns jsonb, language plpgsql, security definer, set search_path = public. Body: (1) resolve the caller via auth.uid() into v_uid; if null raise exception 'not authenticated'. (2) SELECT id, status, deleted_at INTO a record FROM public.invoices WHERE id = p_invoice_id AND user_id = v_uid; if NOT FOUND return jsonb_build_object('ok', false, 'error', 'not_found'). (3) If already deleted_at IS NOT NULL return jsonb_build_object('ok', true, 'already', true). (4) GUARD: if status <> 'draft' then return jsonb_build_object('ok', false, 'error', 'not_draft', 'status', status) (do NOT delete issued documents — §13). (5) UPDATE public.invoices SET deleted_at = now() WHERE id = p_invoice_id AND user_id = v_uid. (6) Optionally INSERT into public.audit_log (user_id, action, resource_type, resource_id) VALUES (v_uid, 'invoice.soft_delete', 'invoice', p_invoice_id). (7) return jsonb_build_object('ok', true). Then, copying migration 20260510120000_secure_invoice_share.sql lines 59-60 exactly: 'revoke all on function public.soft_delete_invoice(uuid) from public;' and 'grant execute on function public.soft_delete_invoice(uuid) to authenticated;' (do NOT grant to anon — deletion is an authed action). Note: SECURITY DEFINER + the WHERE user_id = auth.uid() guard means RLS-bypassing the UPDATE is safe because ownership is enforced inside the function.

### 2.1b — Replace the physical DELETE in the invoice route with the RPC + return proper errors
**File:** `src/app/api/invoices/[id]/route.ts`

In the DELETE handler (lines 354-388), remove the deleteUserRecord('invoices', params.id) call. Instead: get supabase via createClient(); first fetchUserRecord<{status:string}>('invoices', params.id, 'status') for a friendly 404 if not found/owned; if invoice.status !== 'draft' return NextResponse.json({ error: 'Bare kladd-fakturaer kan slettes. Utstedte fakturaer må beholdes i 5 år (bokføringsloven §13).' }, { status: 409 }); otherwise call const { data, error } = await supabase.rpc('soft_delete_invoice', { p_invoice_id: params.id }); if error -> 500; if data?.ok === false && data.error === 'not_draft' -> 409 with the same Norwegian message; if data?.ok === false && data.error === 'not_found' -> 404; on success return { message: 'Faktura slettet' }. Keep the existing redirect/Unauthorized catch branches. Remove deleteUserRecord from the import on line 2 if it is no longer used in this file (it is only used here).

### 2.1c — Hide/disable the delete action for non-draft invoices in the detail UI
**File:** `src/components/InvoiceDetailClient.tsx`

Compute const canDelete = formData.status === 'draft'; (place near canSendInvoice at line 213). Wrap the destructive Delete <Button> (lines 305-312) in {canDelete && (...)} so it only renders for drafts. In handleDelete() (lines 180-205): change the confirm() copy to Norwegian ('Er du sikker på at du vil slette denne kladden? Dette kan ikke angres.'); after a non-ok response, surface the server error message (e.g. the 409 §13 message) via toast.error(error.error) rather than the generic 'Failed to delete invoice'. Optionally add a small helper text near the button explaining issued invoices cannot be deleted.

### 2.1d — Filter deleted_at on the client-side invoice LIST query
**File:** `src/app/invoices/page.tsx`

In the fetchInvoices Supabase query (lines 58-66), add .is('deleted_at', null) before .order(...). This stops soft-deleted invoices from appearing in the list. (The list is the primary 'active' view; the 5-yr archive remains reachable by direct id if needed.)

### 2.1e — (Decision, no code) Detail GET stays unfiltered intentionally
**File:** `src/app/api/invoices/[id]/route.ts + src/app/invoices/[id]/page.tsx`

Do NOT add a deleted_at filter to fetchUserRecord/GET — a soft-deleted draft (or any retained invoice) must remain retrievable by the owner for the 5-yr period. If desired as a polish item, render a 'Slettet' badge when invoice.deleted_at is set and hide Save/Send/Delete; this is optional for the blocker and can be deferred. Document this choice so a later engineer does not 'fix' it by filtering.

### 2.2a — Create the privacy policy page (Norwegian) at /personvern
**File:** `new file: src/app/personvern/page.tsx`

Server component (no 'use client'). Export const metadata = { title: 'Personvernerklæring · Fakturio' }. Render a readable prose page (max-w container, matching landing typography classes used in src/app/page.tsx, e.g. font-display headings, text-ink-2 body). Add export const dynamic = 'force-static' (pure content). Include a 'Sist oppdatert: 01.06.2026' line in DD.MM.YYYY. Content OUTLINE (engineer/user finalizes wording; do not invent legal guarantees): (1) Behandlingsansvarlig — Fakturio identity, org.nr 925 100 200, Nesodden contact email. (2) Hvilke personopplysninger vi behandler — account data (e-post, passord-hash via Supabase Auth), company_settings, kundedata the user enters (their clients' names, e-post, adresse, org.nr), invoice content, betalingsdata. State that client data is processed on behalf of the user (the user is behandlingsansvarlig for their own customers' data; Fakturio is databehandler). (3) Formål og rettslig grunnlag — oppfyllelse av avtale (GDPR art. 6(1)(b)), rettslig forpliktelse for regnskapslagring (art. 6(1)(c) + bokføringsloven §13, 5 års oppbevaring), berettiget interesse for drift/sikkerhet. (4) Lagringstid — konto til sletting; fakturaer og regnskapsdokumentasjon beholdes i minst 5 år som lovpålagt selv etter kontosletting (tie this to the soft-delete behaviour from 2.1). (5) Underleverandører (databehandlere) — a table/list: Supabase (database + autentisering, EU/Frankfurt), Stripe (betaling), Resend (e-postutsending), Sentry (feilovervåking), Fly.io (drift/hosting), B2Brouter (PEPPOL aksesspunkt for EHF-utsending). Note possible transfer outside EU/EØS where applicable and that DPAs/SCCs apply. (6) Dine rettigheter — innsyn, retting, sletting (med forbehold om lovpålagt regnskapslagring), dataportabilitet, klage til Datatilsynet. (7) Informasjonskapsler — note auth/session cookies (locale, Supabase session), no marketing tracking unless true. (8) Kontakt — e-post for personvernhenvendelser. (9) Endringer i erklæringen.

### 2.2b — Create the Terms of Service page (Norwegian) at /vilkar
**File:** `new file: src/app/vilkar/page.tsx`

Server component, metadata title 'Vilkår for bruk · Fakturio', force-static, same layout/typography as /personvern. Content OUTLINE: (1) Innledning/aksept — bruk av tjenesten innebærer aksept. (2) Tjenesten — fakturering for norske enkeltpersonforetak; EHF/PDF-generering; describe current scope honestly (PDF/XML now; PEPPOL-sending state per ship-blocker reality — keep claims accurate). (3) Konto og ansvar — brukeren er ansvarlig for korrekt fakturainnhold, MVA, og egen regnskapsplikt; Fakturio er et verktøy, ikke regnskapsfører/juridisk rådgiver. (4) Priser og betaling — engangskjøp av fakturapakker (49/89/199 NOK = pakke 5/10/25), 3 gratis fakturaer ved registrering; priser i NOK inkl./eks. mva as applicable; no auto-renewing subscription (the subscription code path is dead/placeholder — do not promise it). (5) Angrerett/refusjon — digital tjeneste; describe refund stance. (6) Brukerens data og regnskapsoppbevaring — cross-reference personvern; 5-årsoppbevaring. (7) Ansvarsbegrensning og oppetid — 'as is', begrenset ansvar. (8) Oppsigelse/sletting av konto — and that statutory records survive deletion. (9) Lovvalg og verneting — norsk rett. (10) Endringer i vilkårene. Include 'Sist oppdatert: 01.06.2026'.

### 2.2c — Add legal links to the landing footer
**File:** `src/app/page.tsx`

In the footer (lines 214-223), add a links group containing <Link href="/personvern">Personvern</Link> and <Link href="/vilkar">Vilkår</Link> (use the same inverted/muted text-xs styling as the existing org.nr line). Keep it accessible (visible, not hidden).

### 2.3a — Add a required consent checkbox to signup that blocks submission
**File:** `src/app/sign-up/[[...sign-up]]/page.tsx`

Add const [accepted, setAccepted] = useState(false). Add a checkbox row above the submit button: an <input type="checkbox" id="consent" checked={accepted} onChange> (or the project's Checkbox component if one exists under @/components/ui) with a <Label htmlFor="consent"> reading: 'Jeg godtar <Link href="/vilkar" target="_blank">vilkår</Link> og <Link href="/personvern" target="_blank">personvernerklæring</Link>.' Gate submission: set the submit Button disabled={loading || !accepted}; and at the top of handleSignUp (after e.preventDefault, line 20-21) add: if (!accepted) { toast.error('Du må godta vilkår og personvern for å registrere deg.'); return; }. Optionally translate the static 'Create an Account'/'Email'/'Password' copy to Norwegian for consistency, but the consent gate is the required part.

## Acceptance criteria

- [ ] DELETE /api/invoices/[id] on a 'sent' (or paid/overdue/cancelled) invoice returns HTTP 409 with the §13 Norwegian message and the row is NOT physically removed (still present in DB with deleted_at NULL).
- [ ] DELETE /api/invoices/[id] on a 'draft' invoice returns 200, the row remains in the table with deleted_at set to a timestamp (NOT physically deleted), and the invoice_number is preserved (no gap in the sequence).
- [ ] src/lib/auth.ts deleteUserRecord is no longer invoked for invoices; the invoices DELETE route goes through the soft_delete_invoice RPC.
- [ ] The soft_delete_invoice function has 'revoke all ... from public' and grant execute to authenticated only (not anon), matching the secure_invoice_share pattern.
- [ ] GET /api/invoices, GET /api/v1/invoices, and the /invoices list page all exclude soft-deleted invoices; a freshly soft-deleted draft disappears from the list immediately on refresh.
- [ ] The Detail page Delete button is hidden for non-draft invoices and the confirm/error copy is Norwegian.
- [ ] /personvern renders (HTTP 200) in Norwegian with all 9 outlined sections including the named subprocessor list (Supabase, Stripe, Resend, Sentry, Fly.io, B2Brouter) and the 5-yr §13 retention statement.
- [ ] /vilkar renders (HTTP 200) in Norwegian with the outlined ToS sections, correct pack pricing (49/89/199), and no promise of a subscription.
- [ ] Landing footer shows working 'Personvern' and 'Vilkår' links.
- [ ] Signup submit is disabled until the consent checkbox is checked; attempting to submit unchecked shows the Norwegian error toast and does NOT call supabase.auth.signUp; the consent label links to /vilkar and /personvern.

## Test plan

- Apply the migration locally (supabase db reset or supabase migration up) and confirm soft_delete_invoice exists with correct ACL: in psql run \df+ soft_delete_invoice and check 'Access privileges' shows authenticated=X and NOT anon/public.
- Create a draft invoice, DELETE it via the UI, refresh /invoices — it should vanish from the list; query the DB (select id, invoice_number, status, deleted_at from invoices where id=...) and confirm the row still exists with deleted_at set.
- Mark an invoice 'sent' (PATCH action=send, which deducts a point) or set status sent, then attempt DELETE: curl -i -X DELETE https://fakturio.no/api/invoices/<id>/ (note trailing slash to avoid the 308 trap) with an authed cookie — expect 409 and the §13 message; confirm the row is untouched.
- Verify numbering integrity: after soft-deleting a draft and creating a new invoice, confirm next_invoice_number still increments without reusing or gapping in a way that hides the deleted document.
- Load /personvern and /vilkar in the browser; check both render server-side (view-source shows the Norwegian content, confirming static render) and that 'Sist oppdatert' shows 01.06.2026 in DD.MM.YYYY.
- On the landing page, click the footer 'Personvern' and 'Vilkår' links and confirm they navigate correctly.
- On /sign-up: confirm the Create Account button is disabled until the checkbox is ticked; tick it and confirm enablement; with JS, confirm submitting unchecked is blocked and shows the toast; confirm the consent label links open /vilkar and /personvern.
- Run the production build (next build) to confirm the new pages compile under standalone output and there are no type errors from the edited TSX/route files.

## Risks & gotchas

- Do NOT modify src/lib/auth.ts deleteUserRecord itself — it is shared with the clients DELETE route (src/app/api/clients/[id]/route.ts:53). Changing it to soft-delete would silently change client deletion semantics; keep the invoice fix scoped to the new RPC + route.
- SECURITY DEFINER footgun: the RPC bypasses RLS, so the WHERE user_id = auth.uid() ownership check inside the function is load-bearing. Without it, any authenticated user could soft-delete others' invoices. Must also set search_path = public to avoid search-path hijacking, matching the existing secure pattern.
- The detail GET intentionally does NOT filter deleted_at (5-yr retained access). A well-meaning future change that adds the filter would break legal data access — document the decision (step 2.1e) so it is not reverted.
- trailingSlash:true: external/manual curl tests against /api/invoices/[id] must use the trailing slash or hit a 308 redirect that can drop the method/body. New page routes (/personvern, /vilkar) are internal and unaffected.
- Legal wording: provide the section OUTLINE only. The user must finalize the actual legal text (controller identity/address, refund terms, subprocessor transfer specifics, Datatilsynet wording) before relying on these pages — do not ship invented guarantees.
- Subprocessor list must stay truthful: only list services actually wired (Sentry was added in recent commits; B2Brouter is the PEPPOL AP on the free plan). If any of these are removed before launch, drop them from /personvern to avoid misrepresentation.
- Soft-delete migration ordering: name the file with a timestamp after 20260527210000 so it applies last; using CREATE OR REPLACE FUNCTION makes re-runs idempotent.

## Out of scope (deferred)

- Subscription/recurring billing terms (the subscription code path is dead/placeholder; do not document or revive it in this phase).
- Changing client deletion to soft-delete, or any client-data retention policy work.
- A full account-deletion / GDPR data-export (right-to-erasure) flow — only the policy disclosure is in scope; the actual erasure tooling is a separate phase.
- Cookie consent banner / consent management platform — note cookies in the policy, but no banner UI here unless analytics tracking is actually added.
- Translating the entire app to Norwegian; only the new legal pages and the signup consent/copy touched here.
- Stripe live-mode cutover and image rebuild (separate phase).
