import { memo } from 'react';
import type { TeamId } from '@mtow/shared';

export type TugOfWarCharactersProps = {
  teamId: TeamId;
  /** How many figures to draw, capped by the caller. */
  count: number;
};

/** Degrees a figure leans at rest, before any strain from a landed pull. */
const REST_LEAN = 3;
/** Extra degrees at full brace, before the per-figure stagger. */
const BRACE_LEAN = 8;

const FILL: Record<TeamId, { body: string; dark: string; band: string }> = {
  blue: { body: '#2f6bf3', dark: '#173eae', band: '#bed4ff' },
  red: { body: '#ef3344', dark: '#b81627', band: '#ffc5c9' },
};

/**
 * Placeholder team figures.
 *
 * Intentionally simple inline SVG so the arena is complete without external
 * art: real illustrations can replace the body of this component without any
 * other file changing, because the lean is driven entirely by the `--lean-*`
 * custom property that `useArenaMotion` writes, never by a prop. That is also
 * why this component does not rerender when a team lands a pull.
 */
export const TugOfWarCharacters = memo(function TugOfWarCharacters({
  teamId,
  count,
}: TugOfWarCharactersProps) {
  const fill = FILL[teamId];
  // Blue braces to the left, red to the right.
  const direction = teamId === 'blue' ? -1 : 1;
  const lean = `var(--lean-${teamId})`;

  return (
    <div className="flex items-end" style={{ gap: 4 }}>
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <svg
          key={i}
          width={46}
          height={72}
          viewBox="0 0 46 72"
          className="drop-shadow-sm"
          style={{
            // Rest lean plus strain, scaled by `--lean-*`. Figures further from
            // the rope lean a little more, which reads as a staggered heave.
            transform: `rotate(calc(${direction * REST_LEAN}deg + ${lean} * ${
              direction * (BRACE_LEAN + i * 1.5)
            }deg))`,
            transition: 'transform var(--rope-settle) var(--rope-ease)',
            transformOrigin: '50% 100%',
          }}
          aria-hidden
        >
          {/* Back leg braced against the ground */}
          <path
            d={direction === -1 ? 'M24 46 L10 68 L18 70 L28 50 Z' : 'M22 46 L36 68 L28 70 L18 50 Z'}
            fill={fill.dark}
          />
          {/* Front leg */}
          <path
            d={direction === -1 ? 'M24 46 L26 68 L34 68 L30 46 Z' : 'M22 46 L20 68 L12 68 L16 46 Z'}
            fill={fill.body}
          />
          {/* Torso, leaning away from the rope */}
          <rect x={15} y={22} width={16} height={26} rx={7} fill={fill.body} />
          <rect x={15} y={34} width={16} height={5} fill={fill.band} />
          {/* Head */}
          <circle cx={23} cy={15} r={9} fill="#ffe0bd" />
          <path d="M14 12 a9 9 0 0 1 18 0 z" fill={fill.dark} />
          {/* Arms gripping toward the rope */}
          <rect
            x={direction === -1 ? 28 : 4}
            y={26}
            width={14}
            height={5}
            rx={2.5}
            fill="#ffe0bd"
          />
        </svg>
      ))}
    </div>
  );
});
