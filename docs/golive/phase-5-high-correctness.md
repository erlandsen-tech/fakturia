# Phase 5 — High-priority correctness (VAT/EHF/money/idempotency/GDPR)

> **Tier:** HIGH &nbsp;·&nbsp; **Estimated effort:** ~2-3 days
>
> Self-contained brief — execute in a fresh session. See [PHASES.md](./PHASES.md) for the full go-live sequence and how this phase fits in. All file:line references were verified against the repo on 01.06.2026; re-confirm before editing since code may have moved.

## Objective

Make Fakturio legally and financially correct before charging real money. This phase fixes six HIGH-tier defects: (a) the PDF prints an illegal "MVA" VAT statement for sellers who are not VAT-registered (the core sole-proprietor audience under the NOK 50k threshold); (b) the EHF generator emits tax category 'S' with no seller VAT id, producing EN16931 BR-S-02 violations that any PEPPOL access point will reject (hard blocker for Phase 3 PEPPOL delivery); (c) a dead, reachable subscription checkout path that can grant an unlimited point-bypass; (d) money is recomputed independently as floats in three places (DB / PDF / EHF), risking disagreement and PEPPOL rounding failures; (e) re-sending an invoice double-deducts a point and re-emails because there is no status==='sent' server-side guard; and (f) no GDPR Art.15 export or Art.17 deletion flow exists. Each is observable today and must be fixed before go-live.

## Context

Product/legal facts a fresh engineer must respect:
- Audience: Norwegian sole proprietors (enkeltpersonforetak) under the NOK 50,000 MVA threshold. They are NOT VAT-registered, must NOT add MVA, and must NOT print "MVA" after their org.nr. Printing "Org.nr 123456789 MVA" is the legal marker reserved for VAT-registered entities (which use "MVA" suffix / "NO…MVA" vat number). Doing so for a non-registered seller is an illegal VAT statement.
- Money is NOK. Amounts should be handled in integer øre where possible. Norwegian locale formatting (nb-NO), EU dates DD.MM.YYYY, 24h, UTC for non-local times.
- EN16931 rule BR-S-02: if any line uses VAT category 'S' (standard rated, rate>0), the seller (AccountingSupplierParty) MUST carry a VAT identifier (PartyTaxScheme/CompanyID). A non-VAT-registered seller therefore must NOT use 'S'; it must use category 'E' (exempt) with a TaxExemptionReason and rate 0, and must NOT emit a VAT id. PEPPOL access points (B2Brouter) reject BR-S-02 violations outright — this blocks Phase 3 PEPPOL delivery.
- next.config.js has trailingSlash:true — any new external-facing POST must use the trailing-slash URL (not relevant to these internal routes but keep in mind for any webhook touch).
- The hardening pattern to copy for any new RPC is supabase/migrations/20260510120000_secure_invoice_share.sql: "revoke all on function … from public; grant execute … to anon, authenticated".
- The product sells one-off packs only (pack_5/10/25 = 49/89/199 NOK). Subscriptions are dead/placeholder. There is NO real Stripe subscription product configured; STRIPE_*_PRICE_ID fall back to literal 'price_starter' etc.
- Invoice retention: Norwegian bokføringsloven requires retained invoices for ~5 years; Phase 2 covers retention. GDPR deletion here must ANONYMIZE retained invoices rather than hard-delete them.

## Current state (verified)

### VAT correctness — PDF sender line
`src/components/InvoicePDF.tsx` &nbsp;·&nbsp; lines 143-147

Sender meta hardcodes the MVA suffix: `Org.nr {i.sender.org_no} MVA`. There is no conditional on vat_registered. The InvoicePDFProps.sender type (lines 113-116) has no vat_registered/vat_number field at all, so the component cannot currently know the seller's VAT status.

### VAT correctness — PDF totals label
`src/components/InvoicePDF.tsx` &nbsp;·&nbsp; lines 203-206

Totals row label is the literal string `MVA 25%` regardless of the actual line vat_rate or seller registration. `vat` is computed at line 128 as sum of quantity*unit_price*(vat_rate/100); for a non-registered seller with 0% lines this would print 'MVA 25%' over a 0.00 value — incoherent and legally wrong.

### VAT correctness — PDF caller
`src/components/InvoiceDetailClient.tsx` &nbsp;·&nbsp; lines 241-265

The sender object passed to InvoicePDF is built from companySettings but does NOT include vat_registered or vat_number (only name/address/org_no/email/phone). Line 265 also force-defaults each line's vat_rate to 25 (`item.vat_rate || 25`), so even a 0% line is coerced to 25% in the PDF.

### VAT correctness — create defaults
`src/app/invoices/create/page.tsx` &nbsp;·&nbsp; lines 45-49, 146-149

formData.vat_rate defaults to 25.00 (line 45) and the initial item (line 48) and every added item (line 147) default vat_rate to 25. The page loads companySettings (lines 104-123) but never reads companySettings.vat_registered to drive the default rate; a non-registered seller silently gets 25% on every line.

### VAT correctness — validation default
`src/lib/validations/invoice.ts` &nbsp;·&nbsp; lines 12, 38, 43

webCreateInvoiceSchema defaults vat_rate to 25 in three places; server accepts whatever the client sends but the default reinforces 25%. No server-side check that a non-registered seller's lines are 0%.

### company_settings schema
`supabase/migrations/20240321000001_update_company_settings.sql` &nbsp;·&nbsp; lines 5-6

vat_registered BOOLEAN DEFAULT false and vat_number TEXT already exist. So the truth source for VAT status is present and defaults correctly to false (non-registered). No tax_exemption_reason column exists anywhere (grep across supabase/ and src/ returned none).

### EHF tax category logic
`src/lib/ehf.ts` &nbsp;·&nbsp; lines 102-106

taxCategory(rate) returns 'S' for any rate>0 and 'Z' otherwise. It NEVER returns 'E' and never consults seller VAT registration. So a seller with a 25% line always emits category 'S'.

### EHF seller VAT id is conditional
`src/lib/ehf.ts` &nbsp;·&nbsp; lines 159-161, 222-236

renderParty only emits cac:PartyTaxScheme/CompanyID when opts.vatNumber is truthy (line 159). The supplier party is built with vatNumber: company.vat_number (line 229). If a non-registered seller has no vat_number but a 25% line (the create-page default), the XML emits TaxCategory 'S' with NO seller VAT id → BR-S-02 violation → access-point rejection.

### EHF — no exemption reason emitted
`src/lib/ehf.ts` &nbsp;·&nbsp; lines 254-263, 265-282

TaxSubtotal (254-263) and per-line ClassifiedTaxCategory (272-276) emit only ID + Percent + TaxScheme. There is no cbc:TaxExemptionReason / TaxExemptionReasonCode path, which EN16931 requires for category 'E'.

### Dead subscription path — checkout
`src/app/api/create-checkout-session/route.ts` &nbsp;·&nbsp; lines 16-21, 71-92

SUBSCRIPTION_PRICES falls back to literal placeholders ('price_starter'/'price_growth'/'price_enterprise') when env vars are unset. POSTing {type:'subscription', tier:'growth'} reaches stripe.checkout.sessions.create with mode:'subscription' (line 80). With real placeholder ids this errors at Stripe, but the path is fully reachable and not feature-flagged.

### Dead subscription path — webhook activation
`src/app/api/stripe-webhook/route.ts` &nbsp;·&nbsp; lines 91-109

On checkout.session.completed with type 'subscription', the webhook upserts subscription_tier/subscription_status='active'/subscription_stripe_id onto profiles. Combined with the bypass below, an 'active'+'growth' profile gets unlimited free sends.

### Unlimited point bypass
`src/app/api/invoices/[id]/route.ts` &nbsp;·&nbsp; lines 135-163

PATCH send computes isUnlimited = subscription_status==='active' && tier in (growth,enterprise) and, when true, SKIPS deduct_invoice_point entirely (line 147 guard). So any profile flipped to active/growth (via the dead subscription path or direct profile write) sends invoices for free. subscription columns exist per supabase/migrations/20260504000003_subscriptions_apikeys_softdelete.sql:8-10.

### Float money — site 1 (DB)
`src/app/api/invoices/route.ts` &nbsp;·&nbsp; lines 64-66, 98-106

POST recomputes subtotal/vat/total as floats and stores subtotal_amount/vat_amount/total_amount; per-item amount and vat_amount also recomputed as floats (104-105). This is the authoritative stored value.

### Float money — site 2 (PDF)
`src/components/InvoicePDF.tsx` &nbsp;·&nbsp; lines 127-129

InvoicePDF INDEPENDENTLY recomputes subtotal/vat/total from items (not from stored values), using float arithmetic and toLocaleString with 2 decimals (line 124). Diverges from DB if rounding differs.

### Float money — site 3 (EHF)
`src/lib/ehf.ts` &nbsp;·&nbsp; lines 194-206, 254-263, 311-319

buildEhfInvoice INDEPENDENTLY recomputes line_amount, tax_amount, lineTotal, taxTotal, payable as floats and rounds with n2() (Math.round(v*100)/100). Three independent float pipelines (DB/PDF/EHF) can disagree by øre; EN16931 BR-CO-* / rounding constraints (sum of line tax must equal document tax) can fail on accumulation.

### Send idempotency — no sent guard
`src/app/api/invoices/[id]/route.ts` &nbsp;·&nbsp; lines 131-133, 147-163, 297

PATCH send only rejects status 'paid'/'cancelled' (131). A 'draft' OR an already-'sent' invoice both proceed to deduct a point (149) and re-email (281-288), then set status 'sent' (297). Re-sending (double-click / client retry) double-deducts and re-emails. No 'if status==="sent" return early' guard exists.

### Send idempotency — client double-fire
`src/app/invoices/create/page.tsx` &nbsp;·&nbsp; lines 224-239, 274

The Send button is disabled while loading (274) but the create flow POSTs then PATCHes; a network retry or a second invoice for the same draft is not guarded server-side. The server is the only safe place to enforce idempotency.

### GDPR — no export or deletion
`src/app/api` &nbsp;·&nbsp; lines n/a

No data-export or account-deletion route exists. `find src/app/api` for export|gdpr|account|delete|me returned nothing; grep for gdpr/anonymize/erasure across src returned only unrelated soft-delete code. DELETE /api/invoices/[id] and /api/clients/[id] exist but are per-record soft deletes, not an Art.15 export or Art.17 account erasure.

### Soft-delete + retention scaffolding exists
`supabase/migrations/20260504000003_subscriptions_apikeys_softdelete.sql` &nbsp;·&nbsp; lines 56-61

invoices.deleted_at and clients.deleted_at columns + indexes exist. This supports the anonymize-not-hard-delete approach for retained invoices required by the GDPR deletion flow.

## Implementation steps

### 1
**File:** `src/components/InvoicePDF.tsx`

Extend InvoicePDFProps.sender (lines 113-116) to include `vat_registered: boolean` and `vat_number?: string`. At the sender meta (line 145) replace the literal `Org.nr {i.sender.org_no} MVA` with conditional rendering: if sender.vat_registered, print `Org.nr {org_no} MVA` (or `{vat_number}` if present); otherwise print `Org.nr {org_no}` with NO MVA suffix. Norwegian convention: non-registered may add the line `Ikke MVA-registrert. Merverdiavgift er ikke beregnet.` — add that as a small note when !vat_registered.

### 2
**File:** `src/components/InvoicePDF.tsx`

Replace the hardcoded `MVA 25%` totals label (line 204). Derive the displayed VAT label from the actual line rates: if all lines share one rate r>0 show `MVA {r}%`; if mixed, show `MVA` (and rely on per-line Mva column already at line 192). When seller is not vat_registered (or computed vat===0), either hide the MVA totals row entirely or label it `MVA (ikke beregnet)` with 0,00. Do NOT print a 25% label when the underlying rate is not 25%.

### 3
**File:** `src/components/InvoiceDetailClient.tsx`

In the sender object passed to InvoicePDF (lines 241-254) add `vat_registered: companySettings.vat_registered ?? false` and `vat_number: companySettings.vat_number ?? undefined`. Remove the `|| 25` fallback on line 265 — pass `vat_rate: item.vat_rate ?? 0` so a 0% line is not silently coerced to 25%.

### 4
**File:** `src/app/invoices/create/page.tsx`

Drive the default VAT rate from companySettings.vat_registered. After companySettings loads (lines 104-123), if vat_registered is false set formData.vat_rate to 0 and reset existing/new item vat_rate to 0; if true keep 25. Update the initial item (line 48) to not assume 25 before settings load — initialize to 0 and patch on settings load, or gate the form until settings are loaded. Show a small inline hint when not registered: 'Du er ikke MVA-registrert — fakturalinjer settes til 0% MVA.'

### 5
**File:** `src/lib/validations/invoice.ts`

Keep the 25 default but add an optional server-side normalization point: the create route (next change) will override rate to 0 for non-registered sellers, so the schema default is acceptable. Optionally add a comment that vat_rate may be forced to 0 server-side based on company_settings.vat_registered.

### 6
**File:** `src/app/api/invoices/route.ts`

In POST, after resolving the user, fetch company_settings.vat_registered. If false, force every item's vat_rate to 0 before computing subtotal/vat/total (lines 64-66) and before building itemsPayload (lines 98-106). This guarantees the authoritative stored values never carry VAT for a non-registered seller, regardless of what the client posted.

### 7
**File:** `src/lib/ehf.ts`

Change taxCategory to accept seller VAT-registration context. New signature: `taxCategory(rate: number, sellerVatRegistered: boolean): 'S' | 'Z' | 'E'`. Logic: if !sellerVatRegistered return 'E'; if rate>0 return 'S'; else return 'Z'. Thread a `sellerVatRegistered` flag (derive from company.vat_number presence AND an explicit company.vat_registered field — add `vat_registered?: boolean` to EhfCompany interface lines 17-30) into buildEhfInvoice and pass it into both taxCategory call sites (line 211 grouping and line 273 ClassifiedTaxCategory).

### 8
**File:** `src/lib/ehf.ts`

For category 'E' lines: force Percent to 0 in TaxSubtotal (line 260) and ClassifiedTaxCategory (line 274), and emit a `<cbc:TaxExemptionReason>` (e.g. 'Selger er ikke registrert i Merverdiavgiftsregisteret' / EN16931 'VATEX-EU-O' is for outside-scope; use the Norwegian exemption text). Add the TaxExemptionReason element inside the TaxCategory of the TaxSubtotal block (after Percent, before TaxScheme). For 'E' the taxable amount stays but tax amount is 0.

### 9
**File:** `src/lib/ehf.ts`

Only emit the seller cac:PartyTaxScheme/CompanyID (line 159-161, supplier built at 229) when the seller is genuinely VAT-registered AND has a vat_number. When not registered, ensure vatNumber passed to the supplier renderParty is null so no seller VAT id is emitted (satisfying the 'no VAT id with category E' requirement and avoiding BR-S-02 when 'S' is used only with a present id).

### 10
**File:** `src/lib/ehf.ts`

Update validate() (lines 108-126) so that when the seller IS vat_registered, company.vat_number becomes required (push 'company.vat_number' to missing if absent) — this prevents the BR-S-02 case where a registered seller emits 'S' without an id. When not registered, do not require it.

### 11
**File:** `src/app/api/invoices/[id]/route.ts`

In the EHF build call (lines 246-258) and the PDF build, pass company.vat_registered through so ehf.ts can compute category. Add `vat_registered: company?.vat_registered ?? false` to the company object (around line 247).

### 12
**File:** `src/app/api/invoices/[id]/ehf/route.ts`

Same as above: add `vat_registered: company.vat_registered ?? false` to the company object passed to buildEhfInvoice (around line 65-76).

### 13
**File:** `src/app/api/create-checkout-session/route.ts`

Remove or feature-flag the subscription branch (lines 71-92). Preferred: delete the SUBSCRIPTION_PRICES map (16-21) and the entire `if (type === 'subscription')` block, and change the final fallback (line 94) to 'Invalid type. Use: pack'. If retention is desired, gate behind `if (process.env.ENABLE_SUBSCRIPTIONS === 'true')` and return 404 otherwise so {type:'subscription'} cannot be invoked in production.

### 14
**File:** `src/app/api/stripe-webhook/route.ts`

Guard the subscription activation branch (lines 91-109) behind the same ENABLE_SUBSCRIPTIONS flag, or remove it. As long as the dead path can write subscription_status='active', the unlimited bypass is reachable. If removed, also neutralize the bypass in the next change.

### 15
**File:** `src/app/api/invoices/[id]/route.ts`

Neutralize the unlimited point-bypass (lines 143-163). With subscriptions dead, set isUnlimited to a constant false (or gate behind ENABLE_SUBSCRIPTIONS), so every send deducts a point. This closes the free-send hole even if a profile row was tampered to active/growth.

### 16
**File:** `src/app/api/invoices/[id]/route.ts`

Add a send idempotency guard. Immediately after fetching the invoice status (lines 121-129) and before any deduction (147), add: `if (invoice.status === 'sent') return NextResponse.json({ message: 'Invoice already sent', data: { id: params.id, status: 'sent', alreadySent: true } });`. This prevents double point-deduction and re-email on retry. Combine with the existing paid/cancelled guard.

### 17
**File:** `src/app/api/invoices/[id]/route.ts`

Harden idempotency against concurrent double-clicks: change the deduction/send to be atomic on status. Either (a) perform the status flip to 'sent' conditionally in SQL `update invoices set status='sent' where id=? and status<>'sent' returning ...` BEFORE emailing and only proceed if a row was updated, or (b) add a DB unique/partial constraint. Option (a) is simplest: wrap the existing flow so the point is deducted only if the conditional status update claimed the invoice. Keep the existing refund-on-failure path (300-302).

### 18
**File:** `src/lib/money.ts (new)`

Create a single money module operating in integer øre: `toOre(nok)`, `fromOre(ore)`, `lineAmountOre(qtyMilli, unitPriceOre)`, `vatOre(amountOre, rateBp)`, and a `computeInvoiceTotals(items, sellerVatRegistered)` that returns { lineTotalsOre[], subtotalOre, vatOre, totalOre } computed ONCE. Round once per line in øre. This becomes the authoritative computation used by DB, PDF, and EHF.

### 19
**File:** `src/app/api/invoices/route.ts`

Replace the inline float math (lines 64-66, 104-105) with computeInvoiceTotals from src/lib/money.ts. Store subtotal/vat/total and per-item amount/vat_amount from the øre computation (convert back to the stored numeric scale). This is the single source of truth.

### 20
**File:** `src/components/InvoicePDF.tsx`

Stop recomputing money (lines 127-129). Accept precomputed totals (subtotal/vat/total and per-line amount) via props from stored values, and render them with the nb-NO formatter. The caller (InvoiceDetailClient) already has invoice.subtotal_amount/vat_amount/total_amount — pass those through instead of summing items in the component.

### 21
**File:** `src/lib/ehf.ts`

Stop recomputing money independently (lines 194-206). Accept precomputed per-line amounts and tax totals (in øre/NOK) on EhfLine/EhfInvoice, or import computeInvoiceTotals from src/lib/money.ts and use the SAME rounding. Ensure sum(line tax) === document tax exactly to satisfy EN16931 rounding rules. n2() should format already-rounded values, not re-round divergently.

### 22
**File:** `supabase/migrations/20260601_add_tax_exemption_and_gdpr.sql (new migration)`

Add company_settings.tax_exemption_reason TEXT (default Norwegian non-registered text) for EHF 'E' lines. Add profiles.deleted_at / anonymized_at TIMESTAMPTZ for account deletion. Create a SECURITY DEFINER RPC `export_user_data(p_user_id uuid) returns jsonb` aggregating the user's profile, company_settings, clients, invoices, invoice_items. Create a SECURITY DEFINER RPC `anonymize_user_account(p_user_id uuid)` that: scrubs PII from clients/company_settings, anonymizes (does NOT hard-delete) invoices required for retention (replace client name/email/address with 'Anonymisert', keep amounts/dates/numbers for bokføringsloven), sets profiles.anonymized_at. Apply the hardening from supabase/migrations/20260510120000_secure_invoice_share.sql verbatim: `revoke all on function … from public; grant execute … to authenticated;` (NOT anon for these).

### 23
**File:** `src/app/api/account/export/route.ts (new)`

GET handler: authenticate via getAuthenticatedUser(), call export_user_data RPC for the user, return as a downloadable JSON attachment (Content-Disposition). Optionally also a CSV variant for invoices. This satisfies GDPR Art.15. Internal route, so trailingSlash is not an external-POST concern.

### 24
**File:** `src/app/api/account/delete/route.ts (new)`

POST handler (require explicit confirmation in body, e.g. {confirm:'DELETE'}): authenticate, call anonymize_user_account RPC (anonymize retained invoices, scrub clients/company_settings, mark profile anonymized), then sign the user out / delete the auth user via supabase admin if no retention obligation remains. Satisfies GDPR Art.17 while respecting Phase 2 retention. Document that invoices are anonymized, not erased, with the legal basis.

### 25
**File:** `src/app/settings/page.tsx`

Add a 'Personvern / GDPR' section with two actions: 'Last ned mine data' (GET /api/account/export) and 'Slett konto' (POST /api/account/delete with a confirm dialog). Surface the retention caveat: fakturaer anonymiseres og beholdes i 5 år iht. bokføringsloven.

## Acceptance criteria

- [ ] For a seller with company_settings.vat_registered=false, the generated PDF prints 'Org.nr <n>' with NO 'MVA' suffix and does NOT show a 'MVA 25%' line (or shows 'MVA (ikke beregnet)' 0,00).
- [ ] For a VAT-registered seller, the PDF prints the MVA suffix / vat_number and the totals MVA label reflects the actual line rate(s), not a hardcoded 25%.
- [ ] Creating an invoice as a non-registered seller stores vat_amount=0 and every item vat_rate=0 in the DB, regardless of client-posted rates.
- [ ] buildEhfInvoice for a non-registered seller emits TaxCategory 'E' with Percent 0, a TaxExemptionReason, and NO seller cac:PartyTaxScheme/CompanyID; for a registered seller it emits 'S' only when company.vat_number is present.
- [ ] An EHF XML produced for a non-registered seller passes EN16931/PEPPOL BIS Billing 3.0 validation (no BR-S-02 violation) — verify against a validator before Phase 3.
- [ ] POSTing {type:'subscription'} to /api/create-checkout-session returns a 4xx/404 (path removed or flagged off); it can no longer create a Stripe subscription session.
- [ ] No code path sets isUnlimited=true in production; every successful send deducts exactly one point.
- [ ] PATCH send on an invoice already in status 'sent' returns early with no point deduction and no second email (verify points unchanged and only one email sent across two rapid PATCH calls).
- [ ] Subtotal/VAT/total shown in the PDF, stored in the DB, and emitted in the EHF XML are identical to the øre (integer) value computed once — no off-by-øre disagreement.
- [ ] GET /api/account/export returns the authenticated user's full data (profile, company, clients, invoices, items) as a downloadable file.
- [ ] POST /api/account/delete anonymizes retained invoices (client PII replaced, amounts/numbers retained) and scrubs/clears the user's other PII; new RPCs have REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO authenticated per the secure_invoice_share pattern.

## Test plan

- Set a test company_settings.vat_registered=false; create an invoice via the UI; download the PDF and confirm no 'MVA' after org.nr and no '25%' MVA label.
- Flip vat_registered=true with a vat_number; confirm PDF shows MVA suffix and correct rate label.
- Unit-test taxCategory(): taxCategory(25,false)==='E', taxCategory(25,true)==='S', taxCategory(0,true)==='Z'.
- Build EHF for non-registered seller with a 25%-defaulted line; assert XML contains <cbc:ID>E</cbc:ID>, <cbc:Percent>0.00</cbc:Percent>, a TaxExemptionReason, and NO <cac:PartyTaxScheme> in AccountingSupplierParty. Run the XML through an EN16931/PEPPOL validator (e.g. the Anskaffelser.no / B2Brouter validator) and confirm zero BR-S errors.
- curl -X POST $BASE/api/create-checkout-session/ -d '{"type":"subscription","tier":"growth"}' (note trailing slash) and confirm a 4xx/404, not a session URL.
- Manually set a profile to subscription_status='active', tier='growth'; send an invoice; confirm a point is still deducted (bypass neutralized).
- Idempotency: with an invoice in 'draft', fire two PATCH {action:'send'} requests in quick succession; confirm exactly one point deducted, one email, and the second returns alreadySent/early. Repeat firing PATCH on an already-'sent' invoice; confirm no deduction.
- Money parity: create an invoice with awkward amounts (e.g. qty 3 × 33.33 at 25%); compare stored subtotal_amount/vat_amount/total_amount to the PDF-rendered totals and to the EHF <cbc:TaxAmount>/<cbc:PayableAmount>; all must match to the øre, and EHF sum(line tax)===document tax.
- GET /api/account/export/ as an authenticated user; verify JSON includes profile, company_settings, clients, invoices, invoice_items.
- POST /api/account/delete/ with confirmation; verify retained invoices now show anonymized client fields but unchanged amounts/numbers/dates, company_settings/clients PII scrubbed, profile marked anonymized; verify the new RPCs are not executable by anon (psql: set role anon; select export_user_data(...) → permission denied).

## Risks & gotchas

- Forcing vat_rate=0 server-side for non-registered sellers could surprise a seller who just crossed the NOK 50k threshold and flipped vat_registered=true mid-stream — ensure the flag is editable and the default re-derives on the create page.
- Changing taxCategory signature touches both call sites (grouping at line 211 and per-line at 273); missing one yields mixed 'S'/'E' categories on the same invoice and a fresh BR violation. Update both.
- If money computation is centralized in src/lib/money.ts but PDF/EHF are not all switched over in the same change, you can introduce NEW disagreement instead of removing it — land changes 18-21 together.
- Removing the subscription branch while the webhook still writes subscription_status leaves a dormant unlimited bypass; neutralize the bypass (change 15) even if the webhook branch is only flagged, not deleted.
- The idempotency early-return must come BEFORE deduct_invoice_point; placing it after would still double-deduct.
- GDPR hard-deleting invoices would violate bokføringsloven retention (Phase 2). The deletion flow MUST anonymize retained invoices, not delete them.
- New RPCs default to PUBLIC execute in Postgres; the existing add_invoice_points/deduct_invoice_point RPCs (supabase/migrations/20240322100001_add_points_rpc.sql) already lack REVOKE — copy the secure_invoice_share pattern and grant to authenticated only.

## Out of scope (deferred)

- REVOKE/GRANT hardening of the existing add_invoice_points/deduct_invoice_point RPCs (the go-live-audit points self-grant hole) — tracked separately as a CRITICAL security item, not Phase 5 (though the new GDPR RPCs in this phase MUST follow the secure pattern).
- Phase 3 actual PEPPOL/B2Brouter delivery — this phase only makes the EHF XML valid so Phase 3 can deliver.
- Phase 2 invoice retention policy itself (the 5-year retention rules); this phase only consumes the anonymize-not-delete requirement.
- Building a real Stripe subscription product / pricing — subscriptions stay dead/flagged-off.
- Stripe test→live key rebuild (build-arg baked publishable key) — separate deploy concern.
