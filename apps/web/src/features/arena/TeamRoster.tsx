import { memo } from 'react';
import type { TeamId } from '@mtow/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { useActiveResponders, useTeamPlayers } from '../../store/selectors';

export type TeamRosterProps = {
  teamId: TeamId;
};

/** The `TEAM ROSTER` and `ACTIVE RESPONDERS` columns from the reference. */
export const TeamRoster = memo(function TeamRoster({ teamId }: TeamRosterProps) {
  const roster = useTeamPlayers(teamId);
  const active = useActiveResponders(teamId);
  const theme = TEAM_THEME[teamId];
  const activeIds = new Set(active.map((p) => p.id));

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">
          Team roster ({roster.length})
        </h3>
        <ul className="mt-1.5 space-y-1">
          {roster.length === 0 && (
            <li className="text-[11px] italic text-ink-faint">No players yet</li>
          )}
          {roster.slice(0, 6).map((player) => (
            <li key={player.id} className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  player.connected ? 'bg-emerald-500' : 'bg-ink-faint'
                }`}
              />
              <span className={`truncate ${player.connected ? 'text-ink' : 'text-ink-faint'}`}>
                {player.name}
              </span>
            </li>
          ))}
          {roster.length > 6 && (
            <li className="text-[11px] font-bold text-ink-faint">
              +{roster.length - 6} more
            </li>
          )}
        </ul>
      </div>

      <div>
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-faint">
          Active responders
        </h3>
        <ul className="mt-1.5 space-y-1">
          {active.length === 0 && (
            <li className="text-[11px] italic text-ink-faint">All answered</li>
          )}
          {active.slice(0, 6).map((player) => (
            <li
              key={player.id}
              className={`truncate text-[11px] font-bold ${
                activeIds.has(player.id) ? theme.text : 'text-ink-faint'
              }`}
            >
              {player.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});
