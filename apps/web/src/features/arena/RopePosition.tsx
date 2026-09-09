import { memo } from 'react';
import type { GameRules } from '@braintug/shared';

export type RopePositionProps = {
  rules: GameRules;
};

/**
 * The distance scale above the field: `-4m Advantage`, `CENTER 0m`, `+4m
 * Advantage`, plus the tick marks between them. Static once the rules are known,
 * so it renders exactly once per game.
 */
export const RopePosition = memo(function RopePosition({ rules }: RopePositionProps) {
  const half = rules.arenaHalfMetres;
  // A tick per metre, from -half to +half.
  const ticks = Array.from({ length: half * 2 + 1 }, (_, i) => i - half);

  return (
    <div className="select-none">
      <div className="flex items-end justify-between px-1">
        <span className="rounded-chip bg-blueteam-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-blueteam-800">
          &minus;{half}m advantage
        </span>
        <span className="rounded-chip border border-paper-line bg-paper-card px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
          center 0m
        </span>
        <span className="rounded-chip bg-redteam-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-redteam-800">
          +{half}m advantage
        </span>
      </div>

      <div className="relative mt-2 h-6">
        {ticks.map((metre) => {
          const fraction = (metre + half) / (half * 2);
          const isCentre = metre === 0;
          const isGoal = Math.abs(metre) === half;
          return (
            <div
              key={metre}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${fraction * 100}%` }}
            >
              <div
                className={[
                  'w-[2px] rounded-full',
                  isGoal ? 'h-4 bg-ink/50' : isCentre ? 'h-4 bg-ink/40' : 'h-2 bg-ink/15',
                ].join(' ')}
              />
              {(isCentre || isGoal || metre % 2 === 0) && (
                <span className="tabular mt-0.5 text-[9px] font-bold text-ink-faint">
                  {metre > 0 ? `+${metre}` : metre}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
