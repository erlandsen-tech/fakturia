# Fakturio brand → fakturia codebase

Handoff for Claude Code. Implements the Fakturio brand (paper, clay, sage, ink — surreal still-life illustrations) on top of the existing `erlandsen-tech/fakturia` Next.js 14 + Tailwind v4 + shadcn/ui repo.

Read chapters in order. Each chapter ends with a **commit message** Claude Code should use.

## Decisions already made (override any if you disagree)

1. **Brand name in UI.** Repo + package name stay `fakturia`; **all user-facing copy + the wordmark say "Fakturio"** (matches the brand doc you approved). Domain stays `fakturio.no`. The package rename is out of scope.
2. **Tokens layer.** Tailwind v4 `@theme` block in `src/app/globals.css` is rewritten in **OKLCH**; the legacy slate palette is removed. shadcn semantic tokens (`background`, `foreground`, `primary`, `accent`, etc.) are *remapped* to brand colors so existing shadcn components don't have to change.
3. **Fonts.** `next/font` self-hosts **Instrument Serif** (display, italics), **Inter Tight** (UI), **JetBrains Mono** (numbers). Inter is removed. Tabular figures on by default for `.font-mono`.
4. **Dark mode.** Brand is paper-on-ink — implemented as light-by-default with an optional dark override. We're shipping **light only for v1**; the `.dark` block is kept structurally so `next-themes` keeps working but defaults to light. Toggle hidden until v2.
5. **i18n.** Norwegian (`nb-NO`) is the primary; English (`en`) is a parallel locale. `src/lib/i18n.ts` is extended into a small key-table loader keyed by `nb`/`en`, picked from `cookies().get('locale')` on the server. No `next-intl` — keep it small.
6. **Illustrations.** 5 surreal SVG components live in `src/components/brand/illustrations/`. Hand-tuned, no runtime deps. Each accepts `{ size, palette, className }` so they can be themed.
7. **Public invoice page.** New route `src/app/i/[token]/page.tsx` — recipient-facing. Server component. Reads invoice by share token, no auth.
8. **PDF.** `src/components/InvoicePDF.tsx` (react-pdf) is restyled to the new paper aesthetic; structure unchanged so existing API routes still work.

## Chapter index

| # | File | Topic |
|---|---|---|
| 01 | [01-foundations.md](./01-foundations.md) | `globals.css`, fonts in `layout.tsx`, paper-noise utility |
| 02 | [02-brand-atoms.md](./02-brand-atoms.md) | `Wordmark`, `Mark`, button `clay` variant, navbar rebrand |
| 03 | [03-illustrations.md](./03-illustrations.md) | 5 SVG components + index |
| 04 | [04-landing.md](./04-landing.md) | `src/app/page.tsx` rewrite |
| 05 | [05-public-invoice.md](./05-public-invoice.md) | New `src/app/i/[token]/page.tsx` route |
| 06 | [06-dashboard.md](./06-dashboard.md) | Dashboard restyle (paper, clay accent, mono numbers) |
| 07 | [07-create-invoice.md](./07-create-invoice.md) | `invoices/create` form rebrand + AI assist sidebar |
| 08 | [08-pdf-email.md](./08-pdf-email.md) | `InvoicePDF.tsx` restyle + transactional email template |
| 09 | [09-i18n-navbar.md](./09-i18n-navbar.md) | i18n keys (nb + en), navbar update |
| 10 | [10-qa.md](./10-qa.md) | QA checklist + visual regression notes |

## Dependencies to add

```bash
npm install next-themes  # already present, confirm
# nothing else strictly required — illustrations are inline SVG, fonts come via next/font/google
```

The brand intentionally avoids `framer-motion`, icon kits, or heavy chart libs. Lucide stays for navigation icons.

## Final reference: source design files

Visual ground truth lives in the design project at `Fakturio Brand.html` (paper canvas with all artboards). Every code snippet in this handoff is a 1:1 port of one of those artboards — when in doubt, that file is the spec.

---

Start with chapter 01.
