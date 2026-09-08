import { ropeToMetres } from '@mtow/shared';
import { useResult, useRules } from '../../store/selectors';

const REASON_LABEL: Record<string, string> = {
  rope_victory: 'Rope pulled across the line',
  questions_exhausted: 'All questions played',
  ended_by_host: 'Match ended by the teacher',
};

/** Full-screen result overlay shown on the classroom display when a game ends. */
export function VictoryScreen() {
  const result = useResult();
  const rules = useRules();

  if (!result) return null;

  const isDraw = result.winner === 'draw' || result.winner === null;
  const winnerTeam = isDraw ? null : result.teams[result.winner as 'blue' | 'red'];
  const accent = isDraw
    ? 'bg-ink'
    : result.winner === 'blue'
      ? 'bg-blueteam-600'
      : 'bg-redteam-600';

  const topPlayer = result.players.find((p) => p.playerId === result.topPlayerId) ?? null;

  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-ink/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Match result"
    >
      {/* The card lands rather than appearing, so the room looks up. Reduced
          motion collapses the keyframe to nothing via the global rule. */}
      <div className="w-[900px] animate-[victoryRise_0.5s_cubic-bezier(0.22,0.61,0.36,1)_both] overflow-hidden rounded-panel bg-paper-card shadow-panel">
        <div className={`${accent} px-8 py-6 text-center`}>
          <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-white/70">
            {REASON_LABEL[result.reason] ?? 'Match over'}
          </p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase text-white">
            {isDraw ? 'A perfect draw' : `${winnerTeam?.name} win!`}
          </h1>
          {!isDraw && rules && (
            <p className="tabular mt-2 text-lg font-bold text-white/85">
              Rope finished {Math.abs(ropeToMetres(rules, result.finalRopePosition)).toFixed(1)}m
              from centre
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 p-8">
          {(['blue', 'red'] as const).map((teamId) => {
            const team = result.teams[teamId];
            const isWinner = result.winner === teamId;
            return (
              <div
                key={teamId}
                className={[
                  'rounded-card border-2 p-5',
                  isWinner
                    ? teamId === 'blue'
                      ? 'border-blueteam-400 bg-blueteam-50'
                      : 'border-redteam-400 bg-redteam-50'
                    : 'border-paper-line bg-paper-sunk',
                ].join(' ')}
              >
                <p className="font-display text-xl font-extrabold uppercase text-ink">
                  {team.name}
                </p>
                <p className="tabular mt-2 font-display text-5xl font-extrabold text-ink">
                  {team.score}
                </p>
                <dl className="mt-3 space-y-1 text-sm font-semibold text-ink-muted">
                  <Row label="Correct" value={team.correctCount} />
                  <Row label="Incorrect" value={team.incorrectCount} />
                  <Row label="Accuracy" value={`${Math.round(team.accuracy * 100)}%`} />
                  <Row label="Best streak" value={team.bestStreak} />
                </dl>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-paper-line bg-paper-sunk px-8 py-4">
          <p className="text-sm font-bold text-ink-muted">
            {result.questionsPlayed} of {result.totalQuestions} questions played
          </p>
          {topPlayer && (
            <p className="text-sm font-bold text-ink">
              Strongest puller:{' '}
              <span className="font-extrabold">{topPlayer.name}</span>{' '}
              <span className="text-ink-muted">
                ({topPlayer.correctCount} correct)
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="tabular font-extrabold text-ink">{value}</dd>
    </div>
  );
}
