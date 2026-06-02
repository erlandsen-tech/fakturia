# Phase 4 — Landing & copy honesty

> **Tier:** BLOCKER &nbsp;·&nbsp; **Estimated effort:** ~1-1.5 hours (6 string edits across 3 files plus en/nb lockstep, a build, and a manual nb/en render pass on /, /pricing/, /i/[token]/)
>
> Self-contained brief — execute in a fresh session. See [PHASES.md](./PHASES.md) for the full go-live sequence and how this phase fits in. All file:line references were verified against the repo on 01.06.2026; re-confirm before editing since code may have moved.

> **Product decision (01.06.2026) — EHF stays as a "quiet export," and is NOT the selling point.** PEPPOL *delivery* is deferred (Phase 3). At launch, EHF remains available but **demoted to a low-key, accurately-labelled export** — e.g. "Eksporter EHF (.xml)" with a one-line tooltip like *"for deg som har eget aksesspunkt / regnskapsfører"*. It is NOT a hero/headline feature, and **no copy may imply network "sending" or "delivery."** The only reasons it stays at all: it's a cheap demand probe for whether to build Phase 3, and it serves the minority who already have an access point/accountant. It is explicitly **not** a differentiator.
>
> **What the landing SHOULD lead with (the real differentiators, per the founder, 01.06.2026):** the **dashboard/overview** that shows the user's customers, products, and invoices in one place (the founder calls this "logging" — it means record-keeping/overview, NOT an audit trail), the **design/UX quality**, and **automatic sending of the invoice to the recipient** (email). The honesty pass is not only "delete the lies about PEPPOL" — it's also "foreground what's genuinely good and working." Rebalance the hero/feature copy toward those three, and treat EHF/PEPPOL as a minor capability line, not a headline.
>
> Apply to every EHF mention you touch: reword "send"/"PEPPOL delivery" claims to "export/last ned EHF-fil," keep any "coming soon" for *delivery* clearly future-tense. Because we keep the export, the EHF must be **valid** — see Phase 5(b) BR-S-02, which stays in the launch path.

## Objective

Audit every user-facing string against working production code and remove all overpromises so the founder's "stop lying" ship-blocker clears. Five concrete false/overstated claims exist today: (1) PEPPOL delivery implied as live, (2) EHF XML described as "validert/validated" when no Schematron/EN16931 validation runs, (3) the PUBLIC invoice page tells the user's CLIENTS payment is auto-registered ("registrert automatisk") when no reconciliation exists, (4) pricing offers a subscription ("abonner for ubegrenset") that is not sold in the UI, and (5) pricing promises an automatic purchase receipt email that no code sends. This phase only changes copy strings (i18n.ts + three page files); no backend behaviour changes. Several wordings become safely reversible once Phase 3 (real PEPPOL sending) lands.

## Context

Product is Fakturio (fakturio.no), a Norwegian e-invoicing SaaS for sole proprietors. Money is NOK; metric; EU date format DD.MM.YYYY; 24h; non-local times UTC. Norwegian (nb) is the primary locale and the fallback in t(); English (en) mirrors every landing key and must be fixed in lockstep. The product sells one-off invoice packs only (49/89/199 NOK = pack_5/pack_10/pack_25, shown in src/app/pricing/page.tsx PACKS array). A subscription code path exists end-to-end (checkout, webhook, point-skip) but is NEVER surfaced in the pricing UI, so to a customer it is vapor. What actually works today, verified in code: (a) generate a PDF per invoice; (b) generate EHF 3.0 / PEPPOL BIS Billing 3.0 UBL XML via src/lib/ehf.ts and download it / attach it to the invoice email; (c) email the invoice (PDF + optional EHF XML attachment) to the client via Resend. What does NOT work: real PEPPOL network delivery/sending (only XML file download + email attachment); EN16931/Schematron validation (ehf.ts only checks field presence); payment auto-reconciliation/registration; BankID; Vipps; any purchase-receipt email after a pack purchase; subscriptions as a purchasable product. The EHF eyebrow already frames "Snart · BankID, Vipps, EHF-utsending" as coming-soon — that framing is correct and should be preserved/extended, not removed. The trailingSlash:true and Stripe-build-arg notes are not relevant to this phase (copy only).

## Current state (verified)

### Hero bullets — PEPPOL implied as live
`src/lib/i18n.ts` &nbsp;·&nbsp; lines 30, 272

landing.heroBullet2 = "PDF + EHF / PEPPOL" (nb line 30, en line 272 identical). Rendered as a star bullet in src/app/page.tsx line 68. Reads as if PEPPOL delivery is a live feature; in reality only PDF + EHF-XML download/email-attachment work (verified: src/lib/ehf.ts builds a string; src/lib/email.ts only attaches the XML to the client invoice email; no PEPPOL access point integration exists in src).

### Value card 3 — false "validert" claim
`src/lib/i18n.ts` &nbsp;·&nbsp; lines 44, 286

landing.value3Body (nb 44 / en 286) says "Last ned EHF 3.0 XML fra hver faktura, validert mot PEPPOL BIS Billing 3.0" / "...validated against PEPPOL BIS Billing 3.0". Rendered in src/app/page.tsx line 102. No validation runs: src/lib/ehf.ts validate() at lines 108-126 only checks presence of required fields and throws EhfValidationError; there is NO Schematron, XSD, or EN16931 rule validation anywhere (grep for schematron/xsd/en16931 returns only the CUSTOMIZATION_ID constant and a code-comment). The XML is built to the BIS 3.0 shape but is not verified against the spec.

### EHF section body — false "validert" claim
`src/lib/i18n.ts` &nbsp;·&nbsp; lines 49, 291

landing.ehfBody (nb 49 / en 291) says "...som validert EHF 3.0 / PEPPOL BIS Billing 3.0 XML — klar til innsending" / "...as validated EHF 3.0 ... XML — ready for submission". Same false validation claim as value3Body. Rendered in src/app/page.tsx line 127. The eyebrow above it (landing.ehfEyebrow, lines 46/288) and quote (landing.ehfQuote, lines 47/289) ARE correctly framed as coming-soon and need no change.

### PUBLIC invoice page — false auto-reconcile promise to the user's CLIENTS
`src/app/i/[token]/page.tsx` &nbsp;·&nbsp; lines 146

Hardcoded Norwegian copy (not in i18n): "Betalingsdetaljene finner du til høyre. Bruk KID-nummeret når du betaler, så blir fakturaen registrert automatisk." This page is served to the sender's clients (third parties). No auto-reconciliation exists: there is no bank/payment webhook, no payment-status updater, no KID-matching code in src. The Stripe webhook (src/app/api/stripe-webhook/route.ts) only handles pack/subscription credit, not invoice payment. This is a false promise to third parties and the highest-reputational-risk item.

### Pricing page — subscription that is not sold
`src/app/pricing/page.tsx` &nbsp;·&nbsp; lines 65

Subhead: "Kjøp fakturaer når du trenger dem, eller abonner for ubegrenset." The PACKS array (lines 15-19) only offers pack_5/pack_10/pack_25 and startCheckout always sends {type:'pack'} (line 79). No subscription button is rendered. The subscription code path exists (create-checkout-session route lines 72-91; stripe-webhook lines 91-108) but is unreachable from the UI, so "abonner for ubegrenset" advertises a product a customer cannot buy. Contradicts the same page's own footnote line 93 "Ingen abonnement, ingen binding" and the landing pricingTitle (i18n line 52/294) "Betal når du sender. Ingen binding."

### Pricing page — false automatic-receipt promise
`src/app/pricing/page.tsx` &nbsp;·&nbsp; lines 95

Footnote: "Kvittering sendes automatisk til e-posten din etter betaling." No receipt email is sent on purchase. The webhook (src/app/api/stripe-webhook/route.ts) only credits points/sets subscription and has NO Resend/email call. The checkout session (src/app/api/create-checkout-session/route.ts lines 42-66) does not set receipt_email or invoice_creation. src/lib/email.ts sendInvoiceEmail only emails INVOICES to clients, never purchase receipts. So no automatic receipt fires.

### EHF section eyebrow/quote — already honest, do NOT change
`src/lib/i18n.ts` &nbsp;·&nbsp; lines 46-47, 288-289

landing.ehfEyebrow "Snart · BankID, Vipps, EHF-utsending" / "Coming soon · BankID, Vipps, EHF sending" and landing.ehfQuote "PDF og EHF-XML i dag. Resten kommer." correctly mark BankID/Vipps/EHF-sending as coming-soon. Keep as-is; only the body's "validert" wording is wrong.

### heroSub — already honest
`src/lib/i18n.ts` &nbsp;·&nbsp; lines 25, 267

landing.heroSub "Lag fakturaen, send PDF-en, last ned EHF-XML. Ferdig." accurately describes working features (PDF send + EHF download). No change needed.

### No marketed AI/MCP/demo/Vipps/kort on user-facing surfaces
`src/app/api/v1/invoices/route.ts` &nbsp;·&nbsp; lines 58, 275, 281

There is an internal "AI API" (v1 invoices endpoint) but it is NOT advertised anywhere in landing/pricing/public copy (grep found AI only in code comments and the v1 route). Stripe payment_method_types:['card'] is config, not customer-facing copy. No Vipps/BankID claims exist outside the correctly-framed coming-soon eyebrow. So no additional vapor copy to fix beyond the five items above.

## Implementation steps

### 1
**File:** `src/lib/i18n.ts`

Fix heroBullet2 to stop implying live PEPPOL delivery. nb line 30: change "PDF + EHF / PEPPOL" to "PDF + EHF-XML nedlasting". en line 272: change "PDF + EHF / PEPPOL" to "PDF + EHF XML download". (Keeps it truthful: download works, delivery does not.)

### 2
**File:** `src/lib/i18n.ts`

Remove the false validation claim in value3Body. nb line 44: replace "Last ned EHF 3.0 XML fra hver faktura, validert mot PEPPOL BIS Billing 3.0. Klar for offentlige innkjøp og store kunder." with "Last ned EHF 3.0 / PEPPOL BIS Billing 3.0 XML fra hver faktura. Klar for offentlige innkjøp og store kunder." en line 286: replace "Download EHF 3.0 XML from every invoice, validated against PEPPOL BIS Billing 3.0. Ready for public-sector and large buyers." with "Download EHF 3.0 / PEPPOL BIS Billing 3.0 XML from every invoice. Ready for public-sector and large buyers." (Drops the word validert/validated; the format claim itself is fine.)

### 3
**File:** `src/lib/i18n.ts`

Remove the false validation claim in ehfBody. nb line 49: replace "Du laster allerede ned hver faktura som PDF og som validert EHF 3.0 / PEPPOL BIS Billing 3.0 XML — klar til innsending. Direkte EHF-utsending, BankID-signering og Vipps-betaling står for tur." with "Du laster allerede ned hver faktura som PDF og som EHF 3.0 / PEPPOL BIS Billing 3.0 XML. Direkte EHF-utsending over PEPPOL, BankID-signering og Vipps-betaling står for tur." en line 291: replace "You already download every invoice as PDF and as validated EHF 3.0 / PEPPOL BIS Billing 3.0 XML — ready for submission. Direct EHF sending, BankID signing and Vipps payment are next up." with "You already download every invoice as PDF and as EHF 3.0 / PEPPOL BIS Billing 3.0 XML. Direct EHF sending over PEPPOL, BankID signing and Vipps payment are next up." (Removes "validert/validated" and "klar til innsending/ready for submission" — the latter also softly implied delivery readiness.)

### 4
**File:** `src/app/i/[token]/page.tsx`

Fix the false auto-reconcile promise to clients at line 146. Replace "Betalingsdetaljene finner du til høyre. Bruk KID-nummeret når du betaler, så blir fakturaen registrert automatisk." with "Betalingsdetaljene finner du til høyre. Husk å oppgi KID-nummeret når du betaler, så blir betalingen lett å spore." (States the truthful benefit of KID — traceability for the recipient's own bookkeeping — without promising automatic registration in Fakturio.)

### 5
**File:** `src/app/pricing/page.tsx`

Remove the unsold-subscription claim at line 65. Replace "Kjøp fakturaer når du trenger dem, eller abonner for ubegrenset." with "Kjøp fakturaer når du trenger dem. Betal kun for det du sender." (Aligns with the packs-only reality and the page's own line 93 footnote and the landing title "Ingen binding".)

### 6
**File:** `src/app/pricing/page.tsx`

Remove the false automatic-receipt promise at line 95. Replace "Kvittering sendes automatisk til e-posten din etter betaling." with "Betaling skjer trygt via Stripe." (Truthful: Stripe processes the card payment. Removes the unbacked auto-receipt claim. If/when a receipt is actually wired — Stripe receipt_email or invoice_creation — this line can be restored.)

### 7
**File:** `src/app/i/[token]/page.tsx`

OPTIONAL consistency check at line 254 footer "Sendt med Fakturio · Trygt og bokført". "bokført" (booked/recorded in accounts) is a mild overstatement since Fakturio does not do bookkeeping/reconciliation. Recommend changing "Trygt og bokført" to "Trygt og sporbart". Keep this optional/low-priority; flag to founder rather than block on it.

## Acceptance criteria

- [ ] No user-facing string asserts EHF/PEPPOL delivery or sending is live; PEPPOL/EHF sending appears only in coming-soon framing (landing.ehfEyebrow/ehfQuote and the reworded ehfBody).
- [ ] The words "validert"/"validated" no longer appear in any landing string (grep -ni 'validert\|validated' src/lib/i18n.ts returns nothing).
- [ ] The public invoice page (src/app/i/[token]/page.tsx) contains no "registrert automatisk" claim (grep returns nothing); KID copy promises only traceability, not auto-registration.
- [ ] src/app/pricing/page.tsx contains no "abonner"/subscription offer and no "Kvittering sendes automatisk" claim (grep for 'abonner' and 'Kvittering' returns nothing in that file).
- [ ] Both nb and en dictionaries are updated in lockstep for every changed landing key (heroBullet2, value3Body, ehfBody); no en key still contains the old wording.
- [ ] Every remaining marketing claim maps to working code: PDF generation, EHF-XML download, invoice email with PDF (+optional EHF attachment), pack purchase via Stripe — and nothing else.
- [ ] App builds with no TypeScript/JSX errors after the string edits (npm run build / next build succeeds).

## Test plan

- Run: grep -ni 'validert\|validated\|registrert automatisk\|abonner\|Kvittering sendes' src/lib/i18n.ts src/app/pricing/page.tsx 'src/app/i/[token]/page.tsx' — expect zero matches after edits.
- Run: grep -n 'PEPPOL' src/lib/i18n.ts — confirm every remaining PEPPOL mention is either a format name (EHF 3.0 / PEPPOL BIS Billing 3.0 XML, describing the downloadable file) or in coming-soon framing; none asserts live delivery.
- Build: run next build (npm run build) and confirm it compiles — the edits are plain string changes so this should pass; catches any accidental quote/escape breakage in the .tsx files.
- Manual nb render: load / (landing) and visually confirm hero bullet reads "PDF + EHF-XML nedlasting", value card 3 has no "validert", and the EHF section body frames PEPPOL sending as "står for tur".
- Manual nb render: load a public invoice at /i/[token]/ (note trailing slash) and confirm the intro paragraph no longer says "registrert automatisk" and reads as traceability-only.
- Manual nb render: load /pricing/ and confirm the subhead no longer mentions abonnement/subscription and the footnote no longer promises an automatic receipt email.
- Toggle locale to en and repeat the landing checks to confirm the en dictionary was updated in lockstep (no stale "validated"/"PEPPOL" delivery wording).

## Risks & gotchas

- en and nb must be edited together — the value3Body and ehfBody keys exist twice in i18n.ts (nb ~44/49, en ~286/291). Missing the en copy leaves a lie in the English UI. Edit by exact line/context, not blind replace-all, since some substrings differ between locales.
- The public invoice page and pricing page use HARDCODED Norwegian strings (not i18n keys). Do not route them through t(); edit the literal strings in place to avoid scope creep.
- Do NOT touch landing.ehfEyebrow / landing.ehfQuote — they are already correctly coming-soon; rewording risks losing the honest framing.
- "EHF 3.0 / PEPPOL BIS Billing 3.0 XML" is the legitimate NAME of the downloadable format and is fine to keep; the dishonesty was only in the verbs (validert, registrert automatisk, abonner, kvittering sendes) and the implied live PEPPOL delivery. Don't over-scrub the format name.
- Keep Norwegian characters (æ/ø/å) intact and UTF-8; match each file's existing quote style when editing .tsx.

## Out of scope (deferred)

- Implementing real PEPPOL/EHF network delivery (that is Phase 3 — the gating B2Brouter access-point integration).
- Adding actual EN16931/Schematron validation of the generated XML (separate hardening task; this phase only removes the false claim).
- Wiring an actual purchase-receipt email (Stripe receipt_email or invoice_creation, or a Resend receipt) — out of scope; we remove the claim instead.
- Building or removing the dead subscription code path in create-checkout-session/stripe-webhook/invoices route — code cleanup is not required for copy honesty; only the unsold subscription COPY is removed.
- Any payment auto-reconciliation / KID-matching feature.
- The points-RPC REVOKE security fix (separate go-live blocker from the audit, not a copy issue).
