import { defaultPalette, type IllustrationProps } from "./types";

export function InkwellTide({ size = 320, palette, className }: IllustrationProps) {
  const p = { ...defaultPalette, ...palette };
  return (
    <svg
      viewBox="0 0 320 320"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Inkwell with a wave spilling out, tiny boat on the crest"
    >
      <ellipse cx="160" cy="280" rx="100" ry="8" fill={p.ink} opacity="0.12" />
      <path
        d="M100 150 L100 260 Q100 275 115 275 L205 275 Q220 275 220 260 L220 150 Z"
        fill={p.paper}
        stroke={p.ink}
        strokeWidth="2.5"
      />
      <ellipse cx="160" cy="150" rx="60" ry="10" fill={p.paper} stroke={p.ink} strokeWidth="2.5" />
      <ellipse cx="160" cy="150" rx="55" ry="8" fill={p.ink} />
      <path
        d="M150 145 Q140 100 100 80 Q80 70 60 90 Q70 60 110 50 Q160 45 180 90 Q200 130 175 145 Z"
        fill={p.clay}
        stroke={p.ink}
        strokeWidth="2"
      />
      <path
        d="M115 75 Q100 65 92 80 Q80 75 75 92 Q90 88 105 88 Q108 80 115 75 Z"
        fill={p.sun}
        stroke={p.ink}
        strokeWidth="1.2"
      />
      <path
        d="M105 88 L125 88 L120 96 L110 96 Z"
        fill={p.paper}
        stroke={p.ink}
        strokeWidth="1.5"
      />
      <line x1="115" y1="88" x2="115" y2="70" stroke={p.ink} strokeWidth="1.2" />
      <path d="M115 70 L128 86 L115 84 Z" fill={p.sage} stroke={p.ink} strokeWidth="1" />
      <rect x="120" y="200" width="80" height="36" fill={p.paper} stroke={p.ink} strokeWidth="1" />
      <text
        x="160"
        y="215"
        fontFamily="var(--font-serif)"
        fontSize="13"
        textAnchor="middle"
        fill={p.ink}
      >
        Faktura
      </text>
      <text
        x="160"
        y="228"
        fontFamily="var(--font-mono)"
        fontSize="8"
        textAnchor="middle"
        fill={p.ink}
        opacity="0.6"
      >
        No. 2026-014
      </text>
      <circle cx="225" cy="120" r="3" fill={p.clay} />
      <circle cx="240" cy="135" r="2" fill={p.clay} />
      <ellipse cx="55" cy="180" rx="3" ry="5" fill={p.ink} opacity="0.7" />
    </svg>
  );
}
