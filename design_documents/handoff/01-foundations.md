# 01 - Foundations: tokens, fonts, paper

Replaces the slate shadcn defaults with the Fakturio brand tokens, swaps Inter for the brand type pairing, and adds the paper-noise utility used by every page.

## File: `src/app/globals.css` (REPLACE entire file)

```css
@import "tailwindcss";

/*
  Fakturio brand tokens.
  Paper / clay / sage / sun / plum + ink scale.
  shadcn semantic tokens are remapped to these so existing shadcn components inherit the brand for free.
*/

@theme {
  /* - Raw brand palette (use directly via bg-paper, text-clay, etc.) - */
  --color-paper:      oklch(0.946 0.028 78);     /* #F4ECDC - primary canvas */
  --color-paper-2:    oklch(0.911 0.039 78);     /* #EADFC9 - recessed */
  --color-paper-3:    oklch(0.873 0.048 78);     /* #E0D2B6 - heavier surfaces */
  --color-ink:        oklch(0.196 0.012 60);     /* #1A1815 - primary text */
  --color-ink-2:      oklch(0.293 0.014 60);     /* #3B362E - secondary text */
  --color-ink-3:      oklch(0.461 0.014 60);     /* #6B645A - muted */
  --color-ink-mute:   oklch(0.624 0.014 60);     /* #9A9286 - captions */

  --color-clay:       oklch(0.626 0.171 38);     /* #DC4F2C - primary warm accent */
  --color-clay-deep:  oklch(0.526 0.156 35);     /* #B23B1F - pressed */
  --color-clay-tint:  oklch(0.852 0.066 38);     /* #F2C9B8 */

  --color-sage:       oklch(0.526 0.034 122);    /* #6F7A5E - moss */
  --color-sage-tint:  oklch(0.836 0.030 122);    /* #C8CDB8 */

  --color-sun:        oklch(0.788 0.122 80);     /* #E5B14C - old gold */
  --color-sun-tint:   oklch(0.882 0.083 86);     /* #F0D8A0 */

  --color-plum:       oklch(0.402 0.061 13);     /* #6B3F4D */

  --color-status-paid:    oklch(0.483 0.038 138); /* #4F6B4D */
  --color-status-overdue: oklch(0.526 0.156 35);  /* #B23B1F */
  --color-status-sent:    oklch(0.460 0.030 256); /* #4D5B6B */
  --color-status-draft:   oklch(0.624 0.014 60);  /* #9A9286 */

  /* - shadcn semantic tokens, remapped to brand - */
  --color-background:           var(--color-paper);
  --color-foreground:           var(--color-ink);
  --color-card:                 var(--color-paper);
  --color-card-foreground:      var(--color-ink);
  --color-popover:              var(--color-paper);
  --color-popover-foreground:   var(--color-ink);
  --color-primary:              var(--color-ink);
  --color-primary-foreground:   var(--color-paper);
  --color-secondary:            var(--color-paper-2);
  --color-secondary-foreground: var(--color-ink);
  --color-muted:                var(--color-paper-2);
  --color-muted-foreground:     var(--color-ink-3);
  --color-accent:               var(--color-clay);
  --color-accent-foreground:    oklch(1 0 0);
  --color-destructive:          var(--color-status-overdue);
  --color-destructive-foreground: oklch(1 0 0);
  --color-border:               oklch(0.196 0.012 60 / 0.12);
  --color-input:                oklch(0.196 0.012 60 / 0.16);
  --color-ring:                 var(--color-clay);

  /* - Type stack (next/font wires the actual @font-face) - */
  --font-sans:    var(--font-inter-tight), "Inter", system-ui, -apple-system, sans-serif;
  --font-serif:   var(--font-instrument-serif), "Iowan Old Style", Georgia, serif;
  --font-mono:    var(--font-jetbrains-mono), ui-monospace, "Roboto Mono", monospace;

  /* - Radii (gentle, mostly square - paper, not material) - */
  --radius:       4px;   /* default */
  --radius-sm:    2px;
  --radius-md:    4px;
  --radius-lg:    8px;
  --radius-xl:    14px;
  --radius-pill:  999px;

  /* - Shadows that read as paper - */
  --shadow-paper: 0 1px 0 oklch(0.196 0.012 60 / 0.04), 0 8px 24px -12px oklch(0.196 0.012 60 / 0.18);
  --shadow-lift:  0 1px 0 oklch(0.196 0.012 60 / 0.06), 0 24px 48px -20px oklch(0.196 0.012 60 / 0.28);
  --shadow-deep:  0 30px 60px -30px oklch(0.196 0.012 60 / 0.45);
}

@variant dark (&:is(.dark *));

.dark {
  /* Inverted: ink-on-paper becomes paper-on-ink. v2-only - currently unreachable. */
  --color-background:           var(--color-ink);
  --color-foreground:           var(--color-paper);
  --color-card:                 oklch(0.265 0.014 60);
  --color-card-foreground:      var(--color-paper);
  --color-primary:              var(--color-paper);
  --color-primary-foreground:   var(--color-ink);
  --color-secondary:            oklch(0.265 0.014 60);
  --color-secondary-foreground: var(--color-paper);
  --color-muted:                oklch(0.265 0.014 60);
  --color-muted-foreground:     var(--color-ink-mute);
  --color-accent:               var(--color-clay);
  --color-accent-foreground:    oklch(1 0 0);
  --color-border:               oklch(0.946 0.028 78 / 0.12);
  --color-input:                oklch(0.946 0.028 78 / 0.16);
}

@layer base {
  * { @apply border-border; }
  html, body {
    @apply bg-background text-foreground;
    font-feature-settings: "ss01", "cv11";
  }
  body { -webkit-font-smoothing: antialiased; }
  h1, h2, h3, h4 { letter-spacing: -0.02em; }
}

@layer utilities {
  /* Type role helpers - used everywhere instead of font-* classes when expressing role */
  .font-display  { font-family: var(--font-serif); font-weight: 400; letter-spacing: -0.01em; }
  .font-numeric  { font-family: var(--font-mono); font-feature-settings: "tnum"; }
  .cap {
    font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 500;
  }
  .hairline { border: 0; border-top: 1px solid currentColor; opacity: 0.12; }

  /* Paper background with subtle warm radial washes + SVG noise.
     Drop this on full-bleed sections. Performance: noise SVG is 200x200 tile, ~1KB. */
  .bg-paper-grain {
    background-color: var(--color-paper);
    background-image:
      radial-gradient(circle at 20% 30%, color-mix(in oklch, var(--color-clay) 12%, transparent), transparent 40%),
      radial-gradient(circle at 80% 70%, color-mix(in oklch, var(--color-sage) 14%, transparent), transparent 40%),
      url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.09 0 0 0 0 0.08 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  }
}
```

## File: `src/app/layout.tsx` (REPLACE)

```tsx
import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "sonner";
import Navbar from "@/components/navbar";
import { LocaleProvider } from "@/lib/i18n";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-tight",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fakturio - fakturering for folk som heller vil gjøre noe annet",
  description:
    "Et fakturaverktøy for norske enkeltpersonforetak. Vennlig, varmt, og gjort på 60 sekunder.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (cookies().get("locale")?.value ?? "nb") as "nb" | "en";

  return (
    <html
      lang={locale === "en" ? "en" : "nb-NO"}
      className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans bg-paper text-ink">
        <LocaleProvider value={locale}>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster
            toastOptions={{
              className:
                "!bg-ink !text-paper !border-0 !rounded-sm !shadow-lift font-sans",
            }}
          />
        </LocaleProvider>
      </body>
    </html>
  );
}
```

> `LocaleProvider` is defined in chapter 09. If you implement chapters out of order, stub it as `({ children }) => <>{children}</>` for now.

## Why this works

- **Tailwind v4 reads `@theme` directly** - no `tailwind.config.js` needed; the existing setup keeps its `components.json` cssVariables=true wiring, so all shadcn components automatically pick up the new `--color-primary` etc.
- **OKLCH** keeps the warm-paper palette stable across displays and lets us derive tints with `color-mix(in oklch, ...)`.
- **next/font variables** flow into `--font-*` so utilities like `font-display` resolve correctly server-side without FOUT.
- **Border-radius scale** is intentionally tight (2/4/8/14) - paper-feel, not iOS rounded-rect.

## Commit

```
foundations: rewrite tokens to Fakturio brand (paper/clay/ink), swap fonts to Instrument Serif + Inter Tight + JetBrains Mono, add paper-grain utility
```

Continue → [02-brand-atoms.md](./02-brand-atoms.md)
