import { cn } from "@/lib/utils";

interface WordmarkProps {
  size?: number;
  className?: string;
  inverted?: boolean;
  monochrome?: boolean;
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
      <span
        className={cn(
          monochrome ? (inverted ? "text-paper" : "text-ink") : "text-clay",
          "ml-px",
        )}
      >
        .
      </span>
    </span>
  );
}
