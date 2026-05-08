import { defaultPalette, type IllustrationProps } from "./types";

export function CitrusCalc({ size = 320, palette, className }: IllustrationProps) {
  const p = { ...defaultPalette, ...palette };
  return (
    <svg
      viewBox="0 0 320 320"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Bisected lemon with calculator buttons in each segment"
    >
      <ellipse cx="160" cy="270" rx="100" ry="9" fill={p.ink} opacity="0.12" />
      <ellipse
        cx="164"
        cy="164"
        rx="120"
        ry="118"
        fill={p.sage}
        opacity="0.35"
        transform="translate(5 4)"
      />
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
