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
