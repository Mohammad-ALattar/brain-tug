import type { GameResult, TeamId } from '@braintug/shared';
import { displayMetresForGain, resultTeamFinishers } from '@braintug/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { Chip } from '../../components/Chip';
import { useTranslation } from 'react-i18next';
import { useModeCopy } from '../../i18n/useModeCopy';
import { getResultWonBy } from '../../i18n/useResultCopy';

export type GameResultsProps = {
  result: GameResult;
  onNewMatch: () => void;
};

/**
 * The teacher's post-match review.
 *
 * Ordered by contribution rather than raw correct answers, because that is
 * what actually moved the game: a hard question answered fast is worth more than
 * two easy ones answered late, and the ranking should say so.
 */
export function GameResults({ result, onNewMatch }: GameResultsProps) {
  const { t } = useTranslation('game');
  const winner = result.winner;
  const draw = winner === 'draw' || winner === null;
  const copy = useModeCopy(result.mode);
  const isRace = result.mode === 'brain_race';

  const ranked = [...result.players].sort(
    (a, b) => b.contribution - a.contribution || b.correctCount - a.correctCount,
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      <header className="text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-faint">
          Match over
        </p>
        <h1 className="mt-1 font-display text-4xl font-extrabold text-ink">
          {draw ? (
            'A draw'
          ) : (
            <span className={TEAM_THEME[winner as TeamId].text}>
              {result.teams[winner as TeamId].name} win
            </span>
          )}
        </h1>
        <p className="mt-1.5 text-sm font-semibold text-ink-muted">
          {draw
            ? t('results.bothTeamsLevel')
            : t('results.theyWon', { reason: getResultWonBy(result, t) })}{' '}
          {result.questionsPlayed} of {result.totalQuestions} questions played.
        </p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(['blue', 'red'] as const).map((teamId) => (
          <TeamCard key={teamId} teamId={teamId} result={result} />
        ))}
      </div>

      {isRace && result.finishOrder.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
            Finish order
          </h2>
          <ol className="mt-2 space-y-1.5">
            {result.finishOrder.map((entry, index) => {
              const theme = TEAM_THEME[entry.teamId];
              return (
                <li
                  key={entry.playerId}
                  className="flex items-center justify-between rounded-card border border-paper-line bg-paper-card px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="tabular w-5 text-xs font-extrabold text-ink-faint">
                      {index + 1}
                    </span>
                    <span aria-hidden className={`h-2 w-2 rounded-full ${theme.solid}`} />
                    <span className="font-bold text-ink">{entry.name}</span>
                  </span>
                  <span className={`text-xs font-extrabold uppercase ${theme.text}`}>
                    {result.teams[entry.teamId].name}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
          Players by contribution
        </h2>

        <table className="mt-2 w-full border-separate border-spacing-y-1.5 text-sm">
          <thead>
            <tr className="text-start text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">
              <th className="px-2.5 font-extrabold">Player</th>
              <th className="px-2 text-end font-extrabold">Right</th>
              <th className="px-2 text-end font-extrabold">Wrong</th>
              <th className="px-2 text-end font-extrabold">{copy.contributionColumn}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((player) => {
              const theme = TEAM_THEME[player.teamId];
              const metres = displayMetresForGain(result.finalModeState, player.contribution);
              return (
                <tr key={player.playerId} className="bg-paper-card">
                  <td className="rounded-s-card border-y border-s border-paper-line px-2.5 py-2">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className={`h-2 w-2 rounded-full ${theme.solid}`} />
                      <span className="font-bold text-ink">{player.name}</span>
                      {result.topPlayerId === player.playerId ? (
                        <Chip tone="good">{copy.topContributor}</Chip>
                      ) : null}
                    </span>
                  </td>
                  <td className="tabular border-y border-paper-line px-2 py-2 text-end font-bold text-ink">
                    {player.correctCount}
                  </td>
                  <td className="tabular border-y border-paper-line px-2 py-2 text-end font-bold text-ink-muted">
                    {player.incorrectCount}
                  </td>
                  <td className="tabular rounded-e-card border-y border-e border-paper-line px-2 py-2 text-end font-bold text-ink">
                    {metres.toFixed(1)}m
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {ranked.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-ink-faint">
            No players took part.
          </p>
        ) : null}
      </section>

      <button
        type="button"
        onClick={onNewMatch}
        className="bt-focus mt-7 h-14 w-full rounded-card bg-ink font-display text-lg font-extrabold text-white shadow-key transition active:translate-y-px"
      >
        Set up another match
      </button>
    </main>
  );
}

function TeamCard({ teamId, result }: { teamId: TeamId; result: GameResult }) {
  const theme = TEAM_THEME[teamId];
  const team = result.teams[teamId];
  const won = result.winner === teamId;
  const isRace = result.mode === 'brain_race';

  if (isRace) {
    const finishers = resultTeamFinishers(result, teamId);

    return (
      <div
        className={`rounded-panel border-2 ${won ? 'border-current' : theme.border} ${theme.tint} p-4`}
      >
        <div className="flex items-baseline justify-between">
          <h3 className={`font-display text-lg font-extrabold ${theme.textStrong}`}>{team.name}</h3>
          {won ? <Chip tone={theme.chip}>Winner</Chip> : null}
        </div>

        <p className={`tabular font-display text-4xl font-extrabold leading-none ${theme.text}`}>
          {finishers.finished}
          <span className="text-2xl text-ink-muted"> / {finishers.required}</span>
        </p>
        <p className="mt-1 text-xs font-bold text-ink-muted">finishers</p>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Right" value={String(team.correctCount)} />
          <Stat label="Accuracy" value={`${Math.round(team.accuracy * 100)}%`} />
          <Stat label="Best run" value={String(team.bestStreak)} />
        </dl>
      </div>
    );
  }

  return (
    <div
      className={`rounded-panel border-2 ${won ? 'border-current' : theme.border} ${theme.tint} p-4`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className={`font-display text-lg font-extrabold ${theme.textStrong}`}>{team.name}</h3>
        {won ? <Chip tone={theme.chip}>Winner</Chip> : null}
      </div>

      <p className={`tabular font-display text-4xl font-extrabold leading-none ${theme.text}`}>
        {team.score}
      </p>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Right" value={String(team.correctCount)} />
        <Stat label="Accuracy" value={`${Math.round(team.accuracy * 100)}%`} />
        <Stat label="Best run" value={String(team.bestStreak)} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-paper-line bg-paper-card py-1.5">
      <dt className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">
        {label}
      </dt>
      <dd className="tabular font-display text-base font-extrabold text-ink">{value}</dd>
    </div>
  );
}

