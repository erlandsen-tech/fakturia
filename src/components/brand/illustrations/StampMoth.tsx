import { defaultPalette, type IllustrationProps } from "./types";

export function StampMoth({ size = 320, palette, className }: IllustrationProps) {
  const p = { ...defaultPalette, ...palette };
  const perfTop = Array.from({ length: 12 }, (_, i) => 88 + i * 12.7);
  const perfSide = Array.from({ length: 15 }, (_, i) => 58 + i * 12.85);
  return (
    <svg
      viewBox="0 0 320 320"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Postage stamp with moth wings"
    >
      <ellipse cx="160" cy="280" rx="80" ry="6" fill={p.ink} opacity="0.12" />
      <rect x="92" y="62" width="140" height="180" fill={p.clay} opacity="0.5" />
      <rect x="88" y="58" width="140" height="180" fill={p.paper} stroke={p.ink} strokeWidth="2" />
      <g fill={p.paper} stroke={p.ink} strokeWidth="1">
        {perfTop.map((x) => (
          <circle key={`t${x}`} cx={x} cy="58" r="3" />
        ))}
        {perfTop.map((x) => (
          <circle key={`b${x}`} cx={x} cy="238" r="3" />
        ))}
        {perfSide.map((y) => (
          <circle key={`l${y}`} cx="88" cy={y} r="3" />
        ))}
        {perfSide.map((y) => (
          <circle key={`r${y}`} cx="228" cy={y} r="3" />
        ))}
      </g>
      <ellipse cx="158" cy="148" rx="8" ry="42" fill={p.ink} />
      <path
        d="M158 130 Q90 110 75 160 Q95 195 158 175 Z"
        fill={p.sun}
        stroke={p.ink}
        strokeWidth="1.5"
        opacity="0.9"
      />
      <path
        d="M158 130 Q226 110 241 160 Q221 195 158 175 Z"
        fill={p.sun}
        stroke={p.ink}
        strokeWidth="1.5"
        opacity="0.9"
      />
      <circle cx="105" cy="155" r="10" fill={p.plum} />
      <circle cx="105" cy="155" r="4" fill={p.paper} />
      <circle cx="211" cy="155" r="10" fill={p.plum} />
      <circle cx="211" cy="155" r="4" fill={p.paper} />
      <path
        d="M158 175 Q120 195 115 225 Q145 215 158 195 Z"
        fill={p.sage}
        stroke={p.ink}
        strokeWidth="1.2"
        opacity="0.85"
      />
      <path
        d="M158 175 Q196 195 201 225 Q171 215 158 195 Z"
        fill={p.sage}
        stroke={p.ink}
        strokeWidth="1.2"
        opacity="0.85"
      />
      <path
        d="M154 110 Q140 90 130 80 M162 110 Q176 90 186 80"
        stroke={p.ink}
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="130" cy="80" r="2" fill={p.ink} />
      <circle cx="186" cy="80" r="2" fill={p.ink} />
      <text
        x="158"
        y="270"
        fontFamily="var(--font-mono)"
        fontSize="10"
        textAnchor="middle"
        fill={p.ink}
        opacity="0.7"
      >
        POSTAGE · 1 KR · NORGE
      </text>
    </svg>
  );
}
