import { memo } from 'react';
import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { usePlayers, useTeamName } from '../../store/selectors';

export type TeamHeaderProps = {
  teamId: TeamId;
  /** Shown as `Answer Terminal #1` / `#2` in the reference. */
  terminalNumber: number;
};

/** The coloured team block at the top of each side panel. */
export const TeamHeader = memo(function TeamHeader({ teamId, terminalNumber }: TeamHeaderProps) {
  const theme = TEAM_THEME[teamId];
  const name = useTeamName(teamId);
  const players = usePlayers();
  const connected = players.filter((p) => p.teamId === teamId && p.connected).length;

  return (
    <div className={`${theme.solid} flex items-center justify-between rounded-card px-4 py-3`}>
      <div className="min-w-0">
        <p className="truncate font-display text-lg font-extrabold uppercase leading-tight tracking-wide text-white">
          {name}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
          Answer terminal #{terminalNumber}
        </p>
      </div>
      <div className="shrink-0 rounded-chip bg-white/20 px-2.5 py-1 text-center">
        <span className="tabular block font-display text-base font-extrabold leading-none text-white">
          {connected}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wide text-white/80">live</span>
      </div>
    </div>
  );
});
