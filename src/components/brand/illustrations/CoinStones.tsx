import { defaultPalette, type IllustrationProps } from "./types";

export function CoinStones({ size = 320, palette, className }: IllustrationProps) {
  const p = { ...defaultPalette, ...palette };
  return (
    <svg
      viewBox="0 0 320 320"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Stack of balanced river stones with engraved totals"
    >
      <ellipse cx="160" cy="290" rx="110" ry="7" fill={p.ink} opacity="0.12" />
      <ellipse cx="160" cy="265" rx="95" ry="22" fill={p.sage} stroke={p.ink} strokeWidth="2" />
      <path
        d="M70 260 Q160 280 250 260"
        stroke={p.ink}
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
      <ellipse cx="155" cy="225" rx="72" ry="18" fill={p.sun} stroke={p.ink} strokeWidth="2" />
      <path
        d="M88 222 Q155 235 222 222"
        stroke={p.ink}
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
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
