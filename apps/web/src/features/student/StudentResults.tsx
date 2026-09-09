import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { Chip } from '../../components/Chip';
import { MODE_COPY } from '../arena/modeCopy';
import { useMe, useResult, useTeamName, useWinner } from '../../store/selectors';

export type StudentResultsProps = {
  teamId: TeamId;
  playerName: string;
  /** Releases this seat and returns to code entry, for the teacher's next match. */
  onLeave: () => void;
};

/**
 * The student's end-of-match card.
 *
 * Deliberately leads with their own contribution rather than the scoreboard: the
 * team result is already on the classroom display, and the thing a child cannot
 * see from their seat is what they personally added.
 */
export function StudentResults({ teamId, playerName, onLeave }: StudentResultsProps) {
  const result = useResult();
  const winner = useWinner();
  const me = useMe();
  const myTeamName = useTeamName(teamId);
  const theme = TEAM_THEME[teamId];

  const mine = result?.players.find((p) => p.playerId === me?.playerId) ?? null;
  const won = winner === teamId;
  const draw = winner === 'draw' || winner === null;

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className={`${theme.solid} px-4 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))]`}>
        <p className="text-center text-xs font-extrabold uppercase tracking-[0.2em] text-white/70">
          Final result
        </p>
        <p className="mt-1 text-center font-display text-3xl font-extrabold text-white">
          {draw ? "It's a draw" : won ? 'Your team won!' : 'Your team lost'}
        </p>
        <p className="mt-1 text-center text-sm font-bold text-white/80">{myTeamName}</p>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {result ? (
          <>
            <section className="bt-panel px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-extrabold text-ink">{playerName}</p>
                    {result.topPlayerId && result.topPlayerId === me?.playerId ? (
                      <Chip tone="good">{MODE_COPY[result.mode].topContributor}</Chip>
                    ) : null}
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Correct" value={String(mine?.correctCount ?? 0)} />
                <Stat label="Missed" value={String(mine?.incorrectCount ?? 0)} />
                <Stat
                  label="Accuracy"
                  value={mine ? `${Math.round(mine.accuracy * 100)}%` : '0%'}
                />
              </dl>
            </section>

            <section className="bt-card px-5 py-4">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
                Team scores
              </h2>
              <div className="mt-2 space-y-1.5">
                {(['blue', 'red'] as const).map((id) => (
                  <div key={id} className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${TEAM_THEME[id].text}`}>
                      {result.teams[id].name}
                    </span>
                    <span className="tabular font-display text-lg font-extrabold text-ink">
                      {result.teams[id].score}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <p className="text-center text-sm font-semibold text-ink-muted">
            Waiting for the final scores&hellip;
          </p>
        )}

        {/*
          The teacher's next match gets a new room code, so without this the
          student is stranded on a screen with nothing to press. Pushed to the
          bottom and styled quietly: it is the exit, not the point of the page.
        */}
        <button
          type="button"
          onClick={onLeave}
          className="bt-focus mt-auto h-14 shrink-0 touch-manipulation rounded-card border-2 border-paper-line bg-paper-card font-display text-base font-extrabold text-ink transition active:translate-y-px"
        >
          Join another game
        </button>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-paper-line bg-paper-sunk py-2">
      <dt className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">
        {label}
      </dt>
      <dd className="tabular mt-0.5 font-display text-xl font-extrabold text-ink">{value}</dd>
    </div>
  );
}
