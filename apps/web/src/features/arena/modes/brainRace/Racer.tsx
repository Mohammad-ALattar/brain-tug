import { memo } from 'react';

import type { TeamId } from '@braintug/shared';

import { TEAM_THEME } from '../../../../design/teamTheme';

import { playerInitials, racerTokenSize } from './racePresentation';

export type RacerProps = {
  slotIndex: number;
  teamId: TeamId;
  playerName: string;
  laneHeight: number;
};

/** The token that travels along a lane. Position is CSS, never an inline transform. */
export const Racer = memo(function Racer({ slotIndex, teamId, playerName, laneHeight }: RacerProps) {
  const theme = TEAM_THEME[teamId];
  const { px, textClass } = racerTokenSize(laneHeight);
  const initials = playerInitials(playerName);

  return (
    <div
      data-race-index={slotIndex}
      className={`bt-racer-slot bt-boost-${teamId} absolute bottom-1.5 left-2 z-10`}
      aria-hidden
    >
      <div
        className={`grid place-items-center rounded-full border-4 border-white shadow-panel ${theme.solid}`}
        style={{ width: px, height: px }}
      >
        <span className={`font-display font-extrabold text-white ${textClass}`}>{initials}</span>
      </div>
    </div>
  );
});
