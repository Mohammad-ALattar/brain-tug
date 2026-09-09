import { memo } from 'react';

import type { PlayerId, TeamId } from '@braintug/shared';

import { playerMetres } from '@braintug/shared';

import { Chip } from '../../../../components/Chip';

import { TEAM_THEME } from '../../../../design/teamTheme';

import { useRacePlayerProgress } from '../../../../store/selectors';

import { useRaceModeState } from './selectors';

import { Racer } from './Racer';

export type PlayerRaceLaneProps = {
  slotIndex: number;
  playerId: PlayerId;
  teamId: TeamId;
  playerName: string;
  laneHeight: number;
  isLeading: boolean;
  showOvertake: boolean;
};

export const PlayerRaceLane = memo(function PlayerRaceLane({
  slotIndex,
  playerId,
  teamId,
  playerName,
  laneHeight,
  isLeading,
  showOvertake,
}: PlayerRaceLaneProps) {
  const theme = TEAM_THEME[teamId];
  const race = useRaceModeState();
  const progress = useRacePlayerProgress(playerId);
  const metres = race ? playerMetres(race, playerId) : 0;
  const track = race?.trackMetres ?? 1000;
  const finished = progress >= 1;
  const compact = laneHeight < 72;

  return (
    <div
      className={[
        'relative overflow-hidden rounded-card border',
        theme.border,
        teamId === 'blue' ? 'bg-track-blue' : 'bg-track-red',
        isLeading ? 'ring-2 ring-amber-400/80 ring-offset-1' : '',
        showOvertake ? 'animate-[raceOvertakePulse_1s_ease-out]' : '',
      ].join(' ')}
      style={{ height: laneHeight }}
      aria-label={`${playerName} ${metres.toFixed(0)} metres of ${track}`}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(17,26,46,0.06) 0 2px, rgba(17,26,46,0) 2px 48px)',
        }}
      />

      <div
        className={`absolute left-2 z-20 flex max-w-[calc(100%-4.5rem)] items-center gap-1.5 ${compact ? 'top-1' : 'top-2'}`}
      >
        <span
          className={`truncate rounded-chip px-2 py-0.5 font-extrabold uppercase tracking-wide text-white ${theme.solid} ${compact ? 'text-[10px]' : 'text-xs'}`}
        >
          {playerName}
        </span>
        <span
          className={`tabular shrink-0 rounded-chip bg-white/90 px-2 py-0.5 font-extrabold text-ink ${compact ? 'text-[10px]' : 'text-xs'}`}
        >
          {metres.toFixed(0)}m / {track}m
        </span>
        {isLeading && !finished ? <Chip tone="timer">Leading</Chip> : null}
        {finished ? <Chip tone="good">Finished</Chip> : null}
        {showOvertake ? <Chip tone="warn">Overtake</Chip> : null}
      </div>

      <Racer
        slotIndex={slotIndex}
        teamId={teamId}
        playerName={playerName}
        laneHeight={laneHeight}
      />
    </div>
  );
});
