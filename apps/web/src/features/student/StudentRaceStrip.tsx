import { memo } from 'react';
import { playerMetres } from '@braintug/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { useMe, useModeState, useRacePlayerProgress } from '../../store/selectors';

export type StudentRaceStripProps = {
  playerName: string;
  teamId: 'blue' | 'red';
};

/** Compact personal race progress — no leaderboard, just this student's lane. */
export const StudentRaceStrip = memo(function StudentRaceStrip({
  playerName,
  teamId,
}: StudentRaceStripProps) {
  const theme = TEAM_THEME[teamId];
  const me = useMe();
  const modeState = useModeState();
  const progress = useRacePlayerProgress(me?.playerId ?? ('' as never));

  if (modeState?.kind !== 'brain_race' || !me) return null;

  const metres = playerMetres(modeState, me.playerId);
  const track = modeState.trackMetres;
  const pct = Math.min(100, Math.round(progress * 100));

  return (
    <section
      className={`rounded-card border ${theme.border} ${theme.tint} px-4 py-2.5`}
      aria-label={`${playerName} ${metres.toFixed(0)} metres of ${track}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-display text-sm font-extrabold text-ink">{playerName}</p>
        <p className="tabular shrink-0 font-display text-base font-extrabold text-ink">
          {metres.toFixed(0)}m
          <span className="text-sm font-bold text-ink-muted"> / {track}m</span>
        </p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-line"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${theme.solid}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
});
