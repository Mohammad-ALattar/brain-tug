import { memo } from 'react';
import { leadingTeam, ropeToMetres } from '@braintug/shared';
import { useGameStore } from '../../../../store/gameStore';
import { useTeamName } from '../../../../store/selectors';
import { useTugModeState } from './selectors';

/**
 * The banner under the rope: `RED DRAGONS PULLING! (SCORE ADVANTAGE +1)`.
 *
 * Reports both quantities the reference shows, which are genuinely different:
 * rope distance is the weighted pull total, score advantage is the raw count of
 * correct answers.
 */
export const PullingBanner = memo(function PullingBanner() {
  const tug = useTugModeState();
  const ropePosition = tug?.ropePosition ?? 0;
  const blueScore = useGameStore((s) => s.state?.teams.blue.score ?? 0);
  const redScore = useGameStore((s) => s.state?.teams.red.score ?? 0);
  const blueName = useTeamName('blue');
  const redName = useTeamName('red');

  const leader = leadingTeam(ropePosition);

  if (!tug || leader === null) {
    return (
      <div className="flex h-9 items-center justify-center rounded-chip border border-paper-line bg-paper-card px-4">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-ink-muted">
          Rope at centre &mdash; all square
        </p>
      </div>
    );
  }

  const name = leader === 'blue' ? blueName : redName;
  const metres = Math.abs(ropeToMetres(tug, ropePosition));
  const scoreAdvantage = Math.abs(blueScore - redScore);
  const tone = leader === 'blue' ? 'bg-blueteam-600 text-white' : 'bg-redteam-600 text-white';

  return (
    <div
      className={`flex h-9 items-center justify-center gap-2 rounded-chip px-4 ${tone}`}
      aria-live="polite"
    >
      <span aria-hidden className="text-sm leading-none">
        {leader === 'blue' ? '\u25c0' : '\u25b6'}
      </span>
      <p className="text-[12px] font-extrabold uppercase tracking-wide">
        {name} pulling! <span className="tabular font-bold opacity-90">{metres.toFixed(1)}m</span>
        {scoreAdvantage > 0 && (
          <span className="tabular font-bold opacity-90">
            {' '}
            &middot; score advantage +{scoreAdvantage}
          </span>
        )}
      </p>
    </div>
  );
});
