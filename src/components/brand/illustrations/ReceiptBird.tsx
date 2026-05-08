import { defaultPalette, type IllustrationProps } from "./types";

export function ReceiptBird({ size = 320, palette, className }: IllustrationProps) {
  const p = { ...defaultPalette, ...palette };
  return (
    <svg
      viewBox="0 0 320 320"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Folded paper crane made from a receipt"
    >
      <ellipse cx="170" cy="270" rx="90" ry="8" fill={p.ink} opacity="0.15" />
      <path
        d="M70 200 L160 80 L260 130 L210 240 Z"
        fill={p.clay}
        opacity="0.55"
        transform="translate(4 3)"
      />
      <path
        d="M65 195 L155 75 L255 125 L205 235 Z"
        fill={p.paper}
        stroke={p.ink}
        strokeWidth="2"
      />
      <path
        d="M155 75 L205 235 M155 75 L65 195 M255 125 L205 235 M155 75 L255 125"
        stroke={p.ink}
        strokeWidth="1.5"
        fill="none"
      />
      <g stroke={p.ink} strokeWidth="1" opacity="0.6">
        <line x1="100" y1="170" x2="170" y2="155" />
        <line x1="105" y1="180" x2="180" y2="170" />
        <line x1="110" y1="190" x2="160" y2="200" />
        <line x1="180" y1="120" x2="230" y2="135" />
        <line x1="185" y1="135" x2="225" y2="150" />
      </g>
      <path d="M65 195 L40 200 L62 205 Z" fill={p.sun} stroke={p.ink} strokeWidth="1.5" />
      <circle cx="80" cy="190" r="2.5" fill={p.ink} />
      <path
        d="M180 230 L175 270 M165 270 L185 270 M210 230 L215 270 M205 270 L225 270"
        stroke={p.ink}
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M250 90 Q280 70 290 100 Q270 110 250 90 Z" fill={p.sage} opacity="0.8" />
      <line x1="250" y1="90" x2="285" y2="95" stroke={p.ink} strokeWidth="0.8" />
    </svg>
  );
}
