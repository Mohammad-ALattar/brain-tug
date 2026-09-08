import { memo } from 'react';
import type { TeamId } from '@mtow/shared';
import { formatRoomCode, streakTier } from '@mtow/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { Chip } from '../../components/Chip';
import {
  useConnection,
  useRoomCode,
  useRules,
  useTeamName,
  useTeamScore,
  useTeamStreak,
} from '../../store/selectors';

export type StudentStatusBarProps = {
  teamId: TeamId;
  playerName: string;
};

/** The persistent top strip: who you are, how your team is doing, and the link state. */
export const StudentStatusBar = memo(function StudentStatusBar({
  teamId,
  playerName,
}: StudentStatusBarProps) {
  const theme = TEAM_THEME[teamId];
  const opponent: TeamId = teamId === 'blue' ? 'red' : 'blue';

  const teamName = useTeamName(teamId);
  const myScore = useTeamScore(teamId);
  const theirScore = useTeamScore(opponent);
  const streak = useTeamStreak(teamId);
  const rules = useRules();
  const roomCode = useRoomCode();
  const connection = useConnection();

  const tier = rules ? streakTier(rules, streak) : null;

  return (
    <header className={`${theme.solid} px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-extrabold leading-tight text-white">
            {teamName}
          </p>
          <p className="truncate text-xs font-bold text-white/80">
            {playerName}
            {roomCode ? ` \u2022 ${formatRoomCode(roomCode)}` : ''}
          </p>
        </div>

        <div className="tabular shrink-0 text-right font-display text-2xl font-extrabold text-white">
          {myScore}
          <span className="px-1 text-base font-bold text-white/60">-</span>
          {theirScore}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {tier && tier.multiplier > 1 ? (
          <Chip tone="timer">
            {tier.label} &times;{tier.multiplier}
          </Chip>
        ) : null}
        {connection !== 'connected' ? (
          <Chip tone="warn">{connection === 'reconnecting' ? 'Reconnecting' : 'Offline'}</Chip>
        ) : null}
      </div>
    </header>
  );
});
