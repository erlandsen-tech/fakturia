# 09 — i18n keys + locale provider

The repo already has `src/lib/i18n.ts` (a thin `t()` function). Extend it into a tiny key-table + provider so the same call works on server and client, and we can ship `nb` + `en` from day one.

## File: `src/lib/i18n.ts` (REPLACE)

```ts
"use client";
import { createContext, useContext, type ReactNode } from "react";

export type Locale = "nb" | "en";

const dict: Record<Locale, Record<string, string>> = {
  nb: {
    // — global —
    "Sign In":  "Logg inn",
    "Sign Out": "Logg ut",
    "Dashboard": "Dashbord",
    "Invoices": "Fakturaer",
    "Clients":  "Kunder",
    "Settings": "Innstillinger",

    // — landing —
    "landing.eyebrow":           "For norske enkeltpersonforetak",
    "landing.heroLineA":         "Send",
    "landing.heroEm1":           "fakturaen",
    "landing.heroLineB":         "kom deg",
    "landing.heroEm2":           "ut",
    "landing.heroSub":
      "Fakturio er et fakturaverktøy for folk som heller vil holde på med arbeidet sitt. Lag, send, og få betalt — uten et regnskapsstudie først.",
    "landing.ctaPrimary":        "Prøv gratis — 3 fakturaer",
    "landing.ctaSecondary":      "Se en demo",

    "landing.manifestoEyebrow":  "Manifest",
    "landing.manifestoA":        "Du er en frilanser, ikke en regnskapsfører.",
    "landing.manifestoEm":       "Fakturering burde ta to minutter",
    "landing.manifestoB":        " — ikke to timer hver søndag kveld.",

    "landing.value1Title":       "Send på 60 sekunder",
    "landing.value1Body":        "Velg kunden, skriv linjene, trykk send. Fakturaen er på vei før kaffen er kald.",
    "landing.value2Title":       "Få betalt raskere",
    "landing.value2Body":        "Vipps, kort, BankID. Mottakeren betaler i to klikk — og du ser det med en gang.",
    "landing.value3Title":       "Be AI gjøre det",
    "landing.value3Body":        "MCP-server inkludert. La Claude eller ChatGPT lage og sende faktura fra samtalen.",

    "landing.mcpEyebrow":        "Nytt · MCP for AI-agenter",
    "landing.mcpQuote":          "\"Send faktura til Olav på 12 480 for designarbeidet.\"",
    "landing.mcpBody":
      "Koble Claude, ChatGPT eller Cursor direkte til kontoen din. Be om det med ord, og fakturaen er sendt — med kunde, linjer, mva og forfall riktig satt.",

    "landing.pricingEyebrow":    "Pris",
    "landing.pricingTitle":      "Betal når du sender, eller fast.",
    "pricing.tier1": "Stykk", "pricing.unit1": "kr / faktura",
    "pricing.note1": "Kjøp i poser à 5, 10 eller 25.",
    "pricing.btn1":  "Kjøp pose",
    "pricing.tier2": "Vekst", "pricing.unit2": "kr / mnd",
    "pricing.note2": "50 fakturaer i måneden. MCP-tilgang.",
    "pricing.btn2":  "Start abonnement",
    "pricing.tier3": "Ubegrenset", "pricing.unit3": "kr / mnd",
    "pricing.note3": "Ingen tak. AI-agenter inkludert.",
    "pricing.btn3":  "Velg ubegrenset",
    "pricing.best":  "Best for de fleste",

    "footer.tagline": "Lagd i Trondheim med uvanlig mye omsorg.",
    "footer.privacy": "Personvern",
    "footer.terms":   "Vilkår",
    "footer.status":  "Status",
  },
  en: {
    "Sign In":  "Sign in",
    "Sign Out": "Sign out",
    "Dashboard": "Dashboard",
    "Invoices": "Invoices",
    "Clients":  "Clients",
    "Settings": "Settings",

    "landing.eyebrow":           "For Norwegian sole proprietors",
    "landing.heroLineA":         "Send",
    "landing.heroEm1":           "the invoice",
    "landing.heroLineB":         "go",
    "landing.heroEm2":           "outside",
    "landing.heroSub":
      "Fakturio is invoicing for people who'd rather get on with the work. Make, send, and get paid — without an accounting degree first.",
    "landing.ctaPrimary":        "Try free — 3 invoices",
    "landing.ctaSecondary":      "Watch a demo",

    "landing.manifestoEyebrow":  "Manifesto",
    "landing.manifestoA":        "You're a freelancer, not a bookkeeper.",
    "landing.manifestoEm":       "Invoicing should take two minutes",
    "landing.manifestoB":        " — not two hours every Sunday night.",

    "landing.value1Title":       "Send in 60 seconds",
    "landing.value1Body":        "Pick the client, write the lines, hit send. The invoice is on its way before your coffee gets cold.",
    "landing.value2Title":       "Get paid faster",
    "landing.value2Body":        "Vipps, card, BankID. They pay in two clicks — and you see it instantly.",
    "landing.value3Title":       "Let AI do it",
    "landing.value3Body":        "MCP server included. Have Claude or ChatGPT draft and send invoices from chat.",

    "landing.mcpEyebrow":        "New · MCP for AI agents",
    "landing.mcpQuote":          "\"Send Olav an invoice for 12,480 for the design work.\"",
    "landing.mcpBody":
      "Connect Claude, ChatGPT, or Cursor directly. Ask in words — the invoice goes out with the client, lines, VAT and due date set correctly.",

    "landing.pricingEyebrow":    "Pricing",
    "landing.pricingTitle":      "Pay per invoice — or flat.",
    "pricing.tier1": "Single", "pricing.unit1": "kr / invoice",
    "pricing.note1": "Bundles of 5, 10 or 25.",
    "pricing.btn1":  "Buy a bundle",
    "pricing.tier2": "Growth", "pricing.unit2": "kr / mo",
    "pricing.note2": "50 invoices a month. MCP access.",
    "pricing.btn2":  "Start subscription",
    "pricing.tier3": "Unlimited", "pricing.unit3": "kr / mo",
    "pricing.note3": "No cap. AI agents included.",
    "pricing.btn3":  "Choose unlimited",
    "pricing.best":  "Best for most",

    "footer.tagline": "Made in Trondheim with unusual care.",
    "footer.privacy": "Privacy",
    "footer.terms":   "Terms",
    "footer.status":  "Status",
  },
};

const LocaleContext = createContext<Locale>("nb");
export function LocaleProvider({ value, children }: { value: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useLocale() { return useContext(LocaleContext); }

/**
 * Translate. Falls back to the key if missing.
 * Works in client components via the provider; in server components
 * it reads `cookies().get("locale")` per-request — see the server overload below.
 */
export function t(key: string, locale: Locale = "nb"): string {
  return dict[locale]?.[key] ?? dict.nb[key] ?? key;
}
```

## Server-side `t()` — `src/lib/i18n.server.ts` (NEW)

For server components that don't have access to `useLocale()`:

```ts
import { cookies } from "next/headers";
import { t as base, type Locale } from "./i18n";

export function t(key: string): string {
  const locale = (cookies().get("locale")?.value ?? "nb") as Locale;
  return base(key, locale);
}
```

> Use `import { t } from "@/lib/i18n.server"` in server components, `import { t, useLocale } from "@/lib/i18n"` in client components.

## Locale switcher — `src/components/LocaleSwitcher.tsx` (NEW, optional)

```tsx
"use client";
import { useTransition } from "react";
import { useLocale } from "@/lib/i18n";

export function LocaleSwitcher() {
  const locale = useLocale();
  const [pending, start] = useTransition();
  function set(next: "nb" | "en") {
    start(() => {
      document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
      location.reload();
    });
  }
  return (
    <div className="flex gap-2 text-xs font-mono text-ink-3">
      <button onClick={() => set("nb")} disabled={locale === "nb" || pending} className={locale === "nb" ? "text-ink underline" : ""}>NB</button>
      <span>·</span>
      <button onClick={() => set("en")} disabled={locale === "en" || pending} className={locale === "en" ? "text-ink underline" : ""}>EN</button>
    </div>
  );
}
```

Drop `<LocaleSwitcher />` into the navbar (or footer) when you want users to flip locales.

## Commit

```
i18n: extend dictionary with landing/footer keys, add server-side t() + LocaleSwitcher
```

Continue → [10-qa.md](./10-qa.md)
