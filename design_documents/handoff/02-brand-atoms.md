# 02 - Brand atoms: Wordmark, Mark, Button variants, Navbar

The smallest reusable brand pieces. Wordmark + Mark are SVG-free (CSS-only) so they scale perfectly at any DPR. Button gains a `clay` variant. Navbar is rebranded.

## File: `src/components/brand/Wordmark.tsx` (NEW)

```tsx
import { cn } from "@/lib/utils";

interface WordmarkProps {
  size?: number;            // multiplier; 1 = ~32px tall
  className?: string;
  inverted?: boolean;       // paper-on-ink contexts
  monochrome?: boolean;     // hide the clay dot
}

/**
 * "Fakturio." - italic F, roman "akturio", clay period.
 * Pure CSS, no SVG. Scales with the size multiplier.
 */
export function Wordmark({ size = 1, className, inverted, monochrome }: WordmarkProps) {
  return (
    <span
      className={cn(
        "font-display inline-flex items-baseline leading-none tracking-[-0.015em] select-none",
        inverted ? "text-paper" : "text-ink",
        className,
      )}
      style={{ fontSize: `${size * 32}px` }}
      aria-label="Fakturio"
    >
      <span className="italic">F</span>
      <span>akturio</span>
      <span className={cn(monochrome ? (inverted ? "text-paper" : "text-ink") : "text-clay", "ml-px")}>
        .
      </span>
    </span>
  );
}
```

## File: `src/components/brand/Mark.tsx` (NEW)

```tsx
import { cn } from "@/lib/utils";

interface MarkProps {
  size?: number;
  className?: string;
}

/**
 * Square ink chip with an italic F and a clay dot.
 * Folded-corner detail in the top-right hints at "paper".
 */
export function Mark({ size = 40, className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("flex-shrink-0", className)}
      aria-label="Fakturio mark"
      role="img"
    >
      <rect x="4" y="4" width="56" height="56" rx="2" fill="var(--color-ink)" />
      <path d="M44 4 L60 20 L44 20 Z" fill="var(--color-paper)" opacity="0.18" />
      <path d="M44 4 L60 20" stroke="var(--color-paper)" strokeWidth="0.6" opacity="0.4" />
      <text
        x="14"
        y="48"
        fontFamily="var(--font-serif)"
        fontStyle="italic"
        fontSize="42"
        fill="var(--color-paper)"
      >
        F
      </text>
      <circle cx="50" cy="48" r="3.5" fill="var(--color-clay)" />
    </svg>
  );
}
```

## File: `src/components/ui/button.tsx` (PATCH - add `clay` variant + brand sizing)

The shadcn-generated file uses `cva`. Replace the `variants` block (keep the rest of the file as shadcn ships it):

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-[transform,background-color,color] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-ink text-paper hover:bg-ink-2",
        clay: "bg-clay text-white hover:bg-clay-deep",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-ink/16 bg-transparent text-ink hover:bg-ink/[.04]",
        secondary: "bg-paper-2 text-ink hover:bg-paper-3",
        ghost: "text-ink hover:bg-ink/[.04]",
        link: "text-clay underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-[18px] py-3",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-14 px-7 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
```

> Sizing rationale: 44px min hit target on mobile (`h-11`); 56px hero CTA (`h-14`); 36px compact (`h-9`). The 13/14/15 px progression follows the brand's UI scale.

## File: `src/components/navbar.tsx` (REPLACE wordmark/text only)

Surgical edits - keep all auth + routing logic. Two changes:

1. Replace the text logo:

```tsx
// before
<Link href={user ? "/dashboard" : "/"} className="text-2xl font-bold">
  Fakturia
</Link>

// after
import { Wordmark } from "@/components/brand/Wordmark";
import { Mark } from "@/components/brand/Mark";

<Link
  href={user ? "/dashboard" : "/"}
  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
>
  <Mark size={28} />
  <Wordmark size={0.7} />
</Link>
```

2. Replace the header chrome:

```tsx
// before
<header className="border-b border-border">
  <div className="container mx-auto py-4 flex justify-between items-center">

// after
<header className="border-b border-ink/10 bg-paper/80 backdrop-blur-sm sticky top-0 z-40">
  <div className="container mx-auto py-4 px-6 flex justify-between items-center">
```

3. Update the nav-link className for active state - clay underline instead of slate primary:

```tsx
// in each <Link> className arg, swap text-primary for text-clay
className={cn(
  "font-medium text-sm transition-colors",
  pathname === "/dashboard"
    ? "text-ink border-b-2 border-clay pb-0.5"
    : "text-ink-3 hover:text-ink",
)}
```

## Commit

```
brand: add Wordmark + Mark, extend button with clay variant + paper sizing, rebrand navbar
```

Continue → [03-illustrations.md](./03-illustrations.md)
