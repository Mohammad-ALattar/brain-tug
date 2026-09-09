import type { TeamId } from '@braintug/shared';
import { leadingTeam, ropeToMetres } from '@braintug/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import {
  usePlayers,
  useQuestionIndex,
  useRopePosition,
  useRules,
  useTeamName,
  useTeamScore,
  useTeamStreak,
  useTotalQuestions,
} from '../../store/selectors';

/**
 * A compact repeat of what the class is watching, so a teacher facing the room
 * does not have to turn around to see the state of the match.
 */
export function HostLiveBoard() {
  const index = useQuestionIndex();
  const total = useTotalQuestions();
  const rope = useRopePosition();
  const rules = useRules();
  const players = usePlayers();

  const leader = leadingTeam(rope);
  const metres = rules ? Math.abs(ropeToMetres(rules, rope)) : 0;

  return (
    <section className="bt-panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
          Live
        </h2>
        <p className="tabular text-xs font-bold text-ink-muted">
          {index >= 0 ? `Question ${index + 1} of ${total}` : `${total} questions`}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <TeamTile teamId="blue" />
        <TeamTile teamId="red" />
      </div>

      <p className="mt-3 text-center text-xs font-bold text-ink-muted">
        {leader === null ? (
          'Rope at the centre'
        ) : (
          <>
            <span className={TEAM_THEME[leader].text}>
              {leader === 'blue' ? 'Blue' : 'Red'}
            </span>{' '}
            ahead by <span className="tabular">{metres.toFixed(1)}m</span>
          </>
        )}
      </p>

      <p className="mt-1 text-center text-[11px] font-semibold text-ink-faint">
        {players.filter((p) => p.connected).length} of {players.length} devices connected
      </p>
    </section>
  );
}

function TeamTile({ teamId }: { teamId: TeamId }) {
  const theme = TEAM_THEME[teamId];
  const name = useTeamName(teamId);
  const score = useTeamScore(teamId);
  const streak = useTeamStreak(teamId);

  return (
    <div className={`rounded-card border ${theme.border} ${theme.tint} px-3 py-2.5`}>
      <p className={`truncate text-xs font-extrabold ${theme.textStrong}`}>{name}</p>
      <p className={`tabular font-display text-3xl font-extrabold leading-none ${theme.text}`}>
        {score}
      </p>
      <p className="tabular mt-0.5 text-[11px] font-bold text-ink-faint">streak {streak}</p>
    </div>
  );
}
