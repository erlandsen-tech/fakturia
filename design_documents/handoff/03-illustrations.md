# 03 — Illustrations: 5 surreal still-lifes

Five SVG illustrations live in `src/components/brand/illustrations/`. Each one is hand-tuned ink-line + flat watercolor wash, with slight off-register fills for a risograph feel.

**Theme rule, enforce in PRs:** never literal "money/coin/handshake/growth-chart" imagery. Translate the concept (an invoice, a payment, a balance) into a natural object — a folded paper bird, a bisected lemon-calculator, a stamp-moth, a stack of river stones, an inkwell tide.

## File: `src/components/brand/illustrations/types.ts` (NEW)

```ts
export interface IllustrationPalette {
  ink?: string;
  paper?: string;
  clay?: string;
  sage?: string;
  sun?: string;
  plum?: string;
}

export interface IllustrationProps {
  size?: number;
  palette?: IllustrationPalette;
  className?: string;
}

export const defaultPalette: Required<IllustrationPalette> = {
  ink:   "#1A1815",
  paper: "#F4ECDC",
  clay:  "#DC4F2C",
  sage:  "#6F7A5E",
  sun:   "#E5B14C",
  plum:  "#6B3F4D",
};
```

## File: `src/components/brand/illustrations/ReceiptBird.tsx` (NEW)

```tsx
import { defaultPalette, type IllustrationProps } from "./types";

export function ReceiptBird({ size = 320, palette, className }: IllustrationProps) {
  const p = { ...defaultPalette, ...palette };
  return (
    <svg viewBox="0 0 320 320" width={size} height={size} className={className} role="img" aria-label="Folded paper crane made from a receipt">
      <ellipse cx="170" cy="270" rx="90" ry="8" fill={p.ink} opacity="0.15" />
      <path d="M70 200 L160 80 L260 130 L210 240 Z" fill={p.clay} opacity="0.55" transform="translate(4 3)" />
      <path d="M65 195 L155 75 L255 125 L205 235 Z" fill={p.paper} stroke={p.ink} strokeWidth="2" />
      <path d="M155 75 L205 235 M155 75 L65 195 M255 125 L205 235 M155 75 L255 125" stroke={p.ink} strokeWidth="1.5" fill="none" />
      <g stroke={p.ink} strokeWidth="1" opacity="0.6">
        <line x1="100" y1="170" x2="170" y2="155" />
        <line x1="105" y1="180" x2="180" y2="170" />
        <line x1="110" y1="190" x2="160" y2="200" />
        <line x1="180" y1="120" x2="230" y2="135" />
        <line x1="185" y1="135" x2="225" y2="150" />
      </g>
      <path d="M65 195 L40 200 L62 205 Z" fill={p.sun} stroke={p.ink} strokeWidth="1.5" />
      <circle cx="80" cy="190" r="2.5" fill={p.ink} />
      <path d="M180 230 L175 270 M165 270 L185 270 M210 230 L215 270 M205 270 L225 270" stroke={p.ink} strokeWidth="1.5" fill="none" />
      <path d="M250 90 Q280 70 290 100 Q270 110 250 90 Z" fill={p.sage} opacity="0.8" />
      <line x1="250" y1="90" x2="285" y2="95" stroke={p.ink} strokeWidth="0.8" />
    </svg>
  );
}
```

## File: `src/components/brand/illustrations/CitrusCalc.tsx` (NEW)

```tsx
import { defaultPalette, type IllustrationProps } from "./types";

export function CitrusCalc({ size = 320, palette, className }: IllustrationProps) {
  const p = { ...defaultPalette, ...palette };
  return (
    <svg viewBox="0 0 320 320" width={size} height={size} className={className} role="img" aria-label="Bisected lemon with calculator buttons in each segment">
      <ellipse cx="160" cy="270" rx="100" ry="9" fill={p.ink} opacity="0.12" />
      <ellipse cx="164" cy="164" rx="120" ry="118" fill={p.sage} opacity="0.35" transform="translate(5 4)" />
      <ellipse cx="160" cy="160" rx="120" ry="118" fill={p.sun} stroke={p.ink} strokeWidth="2.5" />
      <ellipse cx="160" cy="160" rx="105" ry="103" fill={p.paper} stroke={p.ink} strokeWidth="1.5" />
      <g stroke={p.ink} strokeWidth="1" fill="none" opacity="0.7">
        <line x1="160" y1="60" x2="160" y2="260" />
        <line x1="60" y1="160" x2="260" y2="160" />
        <line x1="90" y1="90" x2="230" y2="230" />
        <line x1="230" y1="90" x2="90" y2="230" />
      </g>
      <g fontFamily="var(--font-mono)" fontSize="18" textAnchor="middle" fill={p.ink}>
        <text x="160" y="115">7</text>
        <text x="200" y="135">8</text>
        <text x="220" y="170">9</text>
        <text x="200" y="205">+</text>
        <text x="160" y="220">=</text>
        <text x="120" y="205">−</text>
        <text x="100" y="170">×</text>
        <text x="120" y="135">÷</text>
      </g>
      <circle cx="160" cy="160" r="6" fill={p.clay} />
      <path d="M160 42 Q200 20 220 50 Q190 60 160 42 Z" fill={p.sage} stroke={p.ink} strokeWidth="1.5" />
      <line x1="160" y1="42" x2="215" y2="50" stroke={p.ink} strokeWidth="0.8" />
    </svg>
  );
}
```

## File: `src/components/brand/illustrations/StampMoth.tsx` (NEW)

```tsx
import { defaultPalette, type IllustrationProps } from "./types";

export function StampMoth({ size = 320, palette, className }: IllustrationProps) {
  const p = { ...defaultPalette, ...palette };
  const perfTop = Array.from({ length: 12 }, (_, i) => 88 + i * 12.7);
  const perfSide = Array.from({ length: 15 }, (_, i) => 58 + i * 12.85);
  return (
    <svg viewBox="0 0 320 320" width={size} height={size} className={className} role="img" aria-label="Postage stamp with moth wings">
      <ellipse cx="160" cy="280" rx="80" ry="6" fill={p.ink} opacity="0.12" />
      <rect x="92" y="62" width="140" height="180" fill={p.clay} opacity="0.5" />
      <rect x="88" y="58" width="140" height="180" fill={p.paper} stroke={p.ink} strokeWidth="2" />
      <g fill={p.paper} stroke={p.ink} strokeWidth="1">
        {perfTop.map((x) => <circle key={`t${x}`} cx={x} cy="58" r="3" />)}
        {perfTop.map((x) => <circle key={`b${x}`} cx={x} cy="238" r="3" />)}
        {perfSide.map((y) => <circle key={`l${y}`} cx="88" cy={y} r="3" />)}
        {perfSide.map((y) => <circle key={`r${y}`} cx="228" cy={y} r="3" />)}
      </g>
      <ellipse cx="158" cy="148" rx="8" ry="42" fill={p.ink} />
      <path d="M158 130 Q90 110 75 160 Q95 195 158 175 Z" fill={p.sun} stroke={p.ink} strokeWidth="1.5" opacity="0.9" />
      <path d="M158 130 Q226 110 241 160 Q221 195 158 175 Z" fill={p.sun} stroke={p.ink} strokeWidth="1.5" opacity="0.9" />
      <circle cx="105" cy="155" r="10" fill={p.plum} /><circle cx="105" cy="155" r="4" fill={p.paper} />
      <circle cx="211" cy="155" r="10" fill={p.plum} /><circle cx="211" cy="155" r="4" fill={p.paper} />
      <path d="M158 175 Q120 195 115 225 Q145 215 158 195 Z" fill={p.sage} stroke={p.ink} strokeWidth="1.2" opacity="0.85" />
      <path d="M158 175 Q196 195 201 225 Q171 215 158 195 Z" fill={p.sage} stroke={p.ink} strokeWidth="1.2" opacity="0.85" />
      <path d="M154 110 Q140 90 130 80 M162 110 Q176 90 186 80" stroke={p.ink} strokeWidth="1.5" fill="none" />
      <circle cx="130" cy="80" r="2" fill={p.ink} /><circle cx="186" cy="80" r="2" fill={p.ink} />
      <text x="158" y="270" fontFamily="var(--font-mono)" fontSize="10" textAnchor="middle" fill={p.ink} opacity="0.7">POSTAGE · 1 KR · NORGE</text>
    </svg>
  );
}
```

## File: `src/components/brand/illustrations/CoinStones.tsx` (NEW)

```tsx
import { defaultPalette, type IllustrationProps } from "./types";

export function CoinStones({ size = 320, palette, className }: IllustrationProps) {
  const p = { ...defaultPalette, ...palette };
  return (
    <svg viewBox="0 0 320 320" width={size} height={size} className={className} role="img" aria-label="Stack of balanced river stones with engraved totals">
      <ellipse cx="160" cy="290" rx="110" ry="7" fill={p.ink} opacity="0.12" />
      <ellipse cx="160" cy="265" rx="95" ry="22" fill={p.sage} stroke={p.ink} strokeWidth="2" />
      <path d="M70 260 Q160 280 250 260" stroke={p.ink} strokeWidth="0.8" fill="none" opacity="0.5" />
      <ellipse cx="155" cy="225" rx="72" ry="18" fill={p.sun} stroke={p.ink} strokeWidth="2" />
      <path d="M88 222 Q155 235 222 222" stroke={p.ink} strokeWidth="0.8" fill="none" opacity="0.5" />
      <ellipse cx="165" cy="190" rx="55" ry="14" fill={p.paper} stroke={p.ink} strokeWidth="2" />
      <ellipse cx="158" cy="160" rx="40" ry="11" fill={p.clay} stroke={p.ink} strokeWidth="2" />
      <ellipse cx="160" cy="135" rx="22" ry="7" fill={p.plum} stroke={p.ink} strokeWidth="1.5" />
      <g fontFamily="var(--font-mono)" textAnchor="middle">
        <text x="160" y="270" fontSize="10" fill={p.ink} opacity="0.5">12 480</text>
        <text x="155" y="229" fontSize="9" fill={p.ink} opacity="0.6">3 200</text>
        <text x="165" y="194" fontSize="8" fill={p.ink} opacity="0.6">1 850</text>
        <text x="158" y="163" fontSize="7" fill={p.paper}>980</text>
        <text x="160" y="138" fontSize="6" fill={p.paper}>kr</text>
      </g>
      <path d="M255 268 Q275 258 285 270 Q272 275 255 268 Z" fill={p.sage} opacity="0.7" />
    </svg>
  );
}
```

## File: `src/components/brand/illustrations/InkwellTide.tsx` (NEW)

```tsx
import { defaultPalette, type IllustrationProps } from "./types";

export function InkwellTide({ size = 320, palette, className }: IllustrationProps) {
  const p = { ...defaultPalette, ...palette };
  return (
    <svg viewBox="0 0 320 320" width={size} height={size} className={className} role="img" aria-label="Inkwell with a wave spilling out, tiny boat on the crest">
      <ellipse cx="160" cy="280" rx="100" ry="8" fill={p.ink} opacity="0.12" />
      <path d="M100 150 L100 260 Q100 275 115 275 L205 275 Q220 275 220 260 L220 150 Z" fill={p.paper} stroke={p.ink} strokeWidth="2.5" />
      <ellipse cx="160" cy="150" rx="60" ry="10" fill={p.paper} stroke={p.ink} strokeWidth="2.5" />
      <ellipse cx="160" cy="150" rx="55" ry="8" fill={p.ink} />
      <path d="M150 145 Q140 100 100 80 Q80 70 60 90 Q70 60 110 50 Q160 45 180 90 Q200 130 175 145 Z" fill={p.clay} stroke={p.ink} strokeWidth="2" />
      <path d="M115 75 Q100 65 92 80 Q80 75 75 92 Q90 88 105 88 Q108 80 115 75 Z" fill={p.sun} stroke={p.ink} strokeWidth="1.2" />
      <path d="M105 88 L125 88 L120 96 L110 96 Z" fill={p.paper} stroke={p.ink} strokeWidth="1.5" />
      <line x1="115" y1="88" x2="115" y2="70" stroke={p.ink} strokeWidth="1.2" />
      <path d="M115 70 L128 86 L115 84 Z" fill={p.sage} stroke={p.ink} strokeWidth="1" />
      <rect x="120" y="200" width="80" height="36" fill={p.paper} stroke={p.ink} strokeWidth="1" />
      <text x="160" y="215" fontFamily="var(--font-serif)" fontSize="13" textAnchor="middle" fill={p.ink}>Faktura</text>
      <text x="160" y="228" fontFamily="var(--font-mono)" fontSize="8" textAnchor="middle" fill={p.ink} opacity="0.6">No. 2026-014</text>
      <circle cx="225" cy="120" r="3" fill={p.clay} />
      <circle cx="240" cy="135" r="2" fill={p.clay} />
      <ellipse cx="55" cy="180" rx="3" ry="5" fill={p.ink} opacity="0.7" />
    </svg>
  );
}
```

## File: `src/components/brand/illustrations/index.ts` (NEW)

```ts
export { ReceiptBird } from "./ReceiptBird";
export { CitrusCalc } from "./CitrusCalc";
export { StampMoth } from "./StampMoth";
export { CoinStones } from "./CoinStones";
export { InkwellTide } from "./InkwellTide";
export type { IllustrationProps, IllustrationPalette } from "./types";
```

## Commit

```
brand: add 5 surreal still-life illustrations (ReceiptBird, CitrusCalc, StampMoth, CoinStones, InkwellTide)
```

Continue → [04-landing.md](./04-landing.md)
