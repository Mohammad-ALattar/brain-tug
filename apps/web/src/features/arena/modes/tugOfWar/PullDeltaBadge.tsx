import { useState } from 'react';
import { ropeToMetres } from '@braintug/shared';
import { useLastProgress, useTeamName } from '../../../../store/selectors';
import { useTugModeState } from './selectors';

/**
 * The floating `+1.2m RED` badge from the reference.
 *
 * Keyed on the gain's monotonic key so each pull mounts a fresh badge and its
 * CSS animation restarts, then unmounts itself.
 */
export function PullDeltaBadge() {
  const lastProgress = useLastProgress();
  const tug = useTugModeState();
  const blueName = useTeamName('blue');
  const redName = useTeamName('red');
  const [dismissedKey, setDismissedKey] = useState<number | null>(null);

  if (!lastProgress || !tug || dismissedKey === lastProgress.key) return null;

  const metres = ropeToMetres(tug, lastProgress.gain);
  const isBlue = lastProgress.teamId === 'blue';
  const name = isBlue ? blueName : redName;

  return (
    <div
      key={lastProgress.key}
      onAnimationEnd={() => setDismissedKey(lastProgress.key)}
      className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 animate-[pullFloat_1.6s_ease-out_forwards]"
    >
      <div
        className={[
          'flex items-center gap-1.5 rounded-chip px-3 py-1.5 shadow-panel',
          isBlue ? 'bg-blueteam-600' : 'bg-redteam-600',
        ].join(' ')}
      >
        <span className="tabular font-display text-sm font-extrabold text-white">
          {isBlue ? '\u2212' : '+'}
          {metres.toFixed(1)}m
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/85">
          {name}
        </span>
        {lastProgress.streak >= 3 && (
          <span className="tabular rounded-chip bg-timer px-1.5 text-[10px] font-extrabold text-amber-900">
            {lastProgress.streak}x
          </span>
        )}
      </div>
    </div>
  );
}
