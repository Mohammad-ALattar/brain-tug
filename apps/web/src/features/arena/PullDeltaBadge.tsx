import { useState } from 'react';
import { ropeToMetres } from '@mtow/shared';
import { useLastPull, useRules, useTeamName } from '../../store/selectors';

/**
 * The floating `+1.2m RED` badge from the reference.
 *
 * Keyed on the pull's monotonic key so each pull mounts a fresh badge and its
 * CSS animation restarts, then unmounts itself. This is the one place a
 * short-lived piece of React state is the right tool: the badge's whole purpose
 * is to appear and disappear.
 *
 * Dismissal is driven by `animationend` rather than a matching `setTimeout`,
 * so the lifetime cannot drift from the keyframe duration, and a badge on a
 * backgrounded tab does not vanish before it has been seen.
 */
export function PullDeltaBadge() {
  const lastPull = useLastPull();
  const rules = useRules();
  const blueName = useTeamName('blue');
  const redName = useTeamName('red');
  const [dismissedKey, setDismissedKey] = useState<number | null>(null);

  if (!lastPull || !rules || dismissedKey === lastPull.key) return null;

  const metres = ropeToMetres(rules, lastPull.pull);
  const isBlue = lastPull.teamId === 'blue';
  const name = isBlue ? blueName : redName;

  return (
    <div
      key={lastPull.key}
      onAnimationEnd={() => setDismissedKey(lastPull.key)}
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
        {lastPull.streak >= 3 && (
          <span className="tabular rounded-chip bg-timer px-1.5 text-[10px] font-extrabold text-amber-900">
            {lastPull.streak}x
          </span>
        )}
      </div>
    </div>
  );
}
