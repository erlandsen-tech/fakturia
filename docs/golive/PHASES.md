# Fakturio — Go-Live Phase Plan

Generated 01.06.2026 from an 8-dimension, adversarially-verified codebase audit. Each phase below is a **self-contained implementation brief** — open the linked file and execute it in a **fresh context**. Files cite `file:line` evidence verified against the repo on 01.06.2026 (re-confirm before editing).

**Do not flip Stripe to live until Phases 1, 2, and 4 are done.** Those are the launch blockers. Phase 5 is high-priority correctness that should also land before charging real money. **Phase 3 (PEPPOL delivery) is deferred to post-launch** — the founder wants real users and feedback before investing in access-point delivery; at launch, EHF ships as a downloadable/export artifact only, and Phase 4 must say so honestly. Phase 6 is post-launch hardening.

---

## Phases

| # | Phase | Tier | Effort | What it unblocks |
|---|-------|------|--------|------------------|
| 1 | [Security & billing integrity](./phase-1-security-billing.md) | 🔴 Blocker | ~1 day | Stops anyone minting free credits; makes Stripe webhook + email send trustworthy |
| 2 | [Legal compliance & data retention](./phase-2-legal-retention.md) | 🔴 Blocker | ~1 day | Soft-delete (bokføringsloven §13), Privacy Policy, ToS + signup consent (GDPR) |
| 4 | [Landing & copy honesty](./phase-4-landing-honesty.md) | 🔴 Blocker | ~1–1.5 h | Founder ship-blocker #2 — removes claims for features that aren't live; **must frame EHF as download/export only** |
| 5 | [High-priority correctness](./phase-5-high-correctness.md) | 🟠 High | ~2–3 days | VAT/MVA legality, EHF BR-S-02, money math, send idempotency, dead sub path, GDPR export/delete |
| 6 | [Mediums (post-launch hardening)](./phase-6-mediums.md) | 🟡 Medium | ~7 days | API/security hardening, EHF conformance, ops/monitoring, accessibility statement |
| 3 | [PEPPOL delivery via B2Brouter](./phase-3-peppol-delivery.md) | ⏸ **Deferred** | ~3–4 days | Post-launch: actually *delivers* EHF over PEPPOL. Build after there are users + feedback. Not a launch blocker. |

---

## Recommended sequence

**Launch path (do these, in order):**

1. **Phase 1 first, today** — the free-credits hole (`add_invoice_points` lacks `REVOKE`; `profiles.invoice_points` is directly PATCH-able) is one `curl` away from making the paid product free. The webhook + Resend fixes ride along in the same area.
2. **Phase 4 (1–1.5 h)** — quick honesty pass; cheap to land early and removes the most visible promises-vs-reality gap. With PEPPOL deferred, this is **load-bearing**: the copy must present EHF as a downloadable/export file, not as network delivery, and must not imply "sending."
3. **Phase 2** — legal pages + soft-delete. Independent of the others; the user must finalize the actual legal wording (briefs give section outlines only).
4. **Phase 5** — VAT/MVA legality, money math, send idempotency, dead-subscription removal, GDPR export/delete. The BR-S-02 EHF tax-category fix still belongs here (see note) even though Phase 3 is deferred.
5. **Then flip Stripe to live** (checklist below).

**Deferred (post-launch, after users + feedback):**

6. **Phase 3 — PEPPOL delivery.** The big build. Pick it up once there's demand signal. Depends on Phase 5's BR-S-02 fix and a valid recipient PEPPOL id.
7. **Phase 6** — hardening sweep; can be interleaved post-launch.

> BR-S-02 note: Phase 5(b)'s tax-category fix was originally framed as a prerequisite for Phase 3. **It still matters at launch on its own merits** — the EHF you let users *download* should be valid UBL, since they may upload it to their own access point or accounting system. A malformed EHF that nothing validates is a "stop lying" problem too. Keep it in Phase 5; it's just no longer gated by the PEPPOL build.

> **EHF positioning decision (01.06.2026):** EHF stays in the product at launch but **demoted to a quiet, accurately-labelled export** ("Eksporter EHF (.xml)" — not a hero feature, never framed as "sending/delivery"). It is **not** the differentiator — it's kept only as a cheap demand probe for whether Phase 3 (PEPPOL delivery) is worth building, plus the minority who can already use the file. Consequence: Phase 4 reframes EHF copy as *export*, and Phase 5(b) EHF-validity work **stays in the launch path** (we don't hand out malformed files).
>
> **The actual differentiators (founder, 01.06.2026):** the **dashboard/overview** of customers, products & invoices (founder's word "logging" = record-keeping/overview, not an audit trail) · design/UX quality · **automatic sending of the invoice to the recipient**. The landing should lead with these, not EHF/PEPPOL. This also **raises the stakes on email reliability** — auto-send is the headline value, so the Phase 1 Resend-failure fix and Phase 5 send-idempotency fix protect the core product, not an edge case.

---

## Stripe test → live cutover (mechanical, do AFTER Phases 1–5)

This is the switch itself, not a code phase. Steps:

1. Create live products/prices in the Stripe dashboard (packs 49/89/199 NOK = pack_5/10/25).
2. Swap `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to live values. ⚠️ The **publishable key is baked at build time** (`fly.toml [build.args]` + `.github/workflows/deploy.yml` + `pr-checks.yml`) — going live needs an **image rebuild**, not just an env swap. (The anon/test keys currently in `fly.toml` are public by design and are *not* a security issue.)
3. Register the **live webhook endpoint with the trailing slash** — `https://fakturio.no/api/stripe-webhook/` (the `trailingSlash:true` 308 trap will drop the body otherwise) — and set the new `STRIPE_WEBHOOK_SECRET` as a Fly secret.
4. Confirm runtime Fly secrets are set: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, plus `SENTRY_DSN` (server) and `SENTRY_AUTH_TOKEN`. (`B2BROUTER_API_KEY` is **not** needed at launch — that's Phase 3, deferred.)
5. Smoke-test a live pack purchase end-to-end (checkout → webhook credits exactly one pack → points balance updates).

---

## What's already solid (don't re-litigate)

RLS posture is good (every tenant table has `auth.uid()`-scoped policies); IDOR on web routes is defended; no secrets are committed; webhook signature is verified; the idempotency table exists; security headers/HSTS are present; auth middleware gates protected routes; EHF XML is structurally close to BIS 3.0. Two audit findings were **refuted**: "test keys in fly.toml block go-live" (false — public keys) and "EHF emits full ISO timestamps" (false — already date-only).
