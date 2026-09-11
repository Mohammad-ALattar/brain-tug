import { memo } from 'react';
import { useTranslation } from 'react-i18next';

export type RopePositionProps = {
  halfMetres: number;
};

export const RopePosition = memo(function RopePosition({ halfMetres }: RopePositionProps) {
  const { t } = useTranslation('game');
  const half = halfMetres;
  const ticks = Array.from({ length: half * 2 + 1 }, (_, i) => i - half);

  return (
    <div className="select-none">
      <div className="flex items-end justify-between px-1">
        <span className="rounded-chip bg-blueteam-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-blueteam-800">
          &minus;{t('arena.tug.advantage', { metres: half })}
        </span>
        <span className="rounded-chip border border-paper-line bg-paper-card px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
          {t('arena.tug.center')}
        </span>
        <span className="rounded-chip bg-redteam-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-redteam-800">
          +{t('arena.tug.advantage', { metres: half })}
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
