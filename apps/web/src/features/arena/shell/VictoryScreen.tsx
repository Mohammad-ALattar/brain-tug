import { displayFinishMetres, resultTeamFinishers } from '@braintug/shared';
import { useTranslation } from 'react-i18next';
import { useModeCopy } from '../../../i18n/useModeCopy';
import { getResultReasonLabel } from '../../../i18n/useResultCopy';
import { useResult } from '../../../store/selectors';

/** Full-screen result overlay shown on the classroom display when a game ends. */
export function VictoryScreen() {
  const { t } = useTranslation('game');
  const result = useResult();
  const copy = useModeCopy(result?.mode ?? 'tug_of_war');

  if (!result) return null;

  const reasonLabel = getResultReasonLabel(result, t);

  const winner = result.winner;
  const isDraw = winner === 'draw' || winner === null;
  const winnerTeam = winner === 'blue' || winner === 'red' ? result.teams[winner] : null;
  const accent = isDraw
    ? 'bg-ink'
    : result.winner === 'blue'
      ? 'bg-blueteam-600'
      : 'bg-redteam-600';

  const topPlayer = result.players.find((p) => p.playerId === result.topPlayerId) ?? null;
  const finishMetres = displayFinishMetres(result);
  const isRace = result.mode === 'brain_race';

  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-ink/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('results.matchResult')}
    >
      <div className="w-[900px] animate-[victoryRise_0.5s_cubic-bezier(0.22,0.61,0.36,1)_both] overflow-hidden rounded-panel bg-paper-card shadow-panel">
        <div className={`${accent} px-8 py-6 text-center`}>
          <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-white/70">
            {reasonLabel}
          </p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase text-white">
            {isDraw
              ? t('results.perfectDraw')
              : t('results.teamWins', { name: winnerTeam?.name ?? '' })}
          </h1>
          {!isDraw && finishMetres !== null ? (
            <p className="tabular mt-2 text-lg font-bold text-white/85">
              {copy.finishLine(finishMetres)}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4 p-8">
          {(['blue', 'red'] as const).map((teamId) => {
            const team = result.teams[teamId];
            const isWinner = result.winner === teamId;
            const finishers = isRace ? resultTeamFinishers(result, teamId) : null;
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
                  {isRace ? (
                    <>
                      {finishers!.finished}
                      <span className="text-3xl text-ink-muted"> / {finishers!.required}</span>
                    </>
                  ) : (
                    team.score
                  )}
                </p>
                {isRace ? (
                  <p className="mt-1 text-xs font-bold text-ink-muted">{t('arena.race.finishers')}</p>
                ) : null}
                <dl className="mt-3 space-y-1 text-sm font-semibold text-ink-muted">
                  <Row label={t('results.stats.correct')} value={team.correctCount} />
                  <Row label={t('results.stats.incorrect')} value={team.incorrectCount} />
                  <Row
                    label={t('results.stats.accuracy')}
                    value={`${Math.round(team.accuracy * 100)}%`}
                  />
                  <Row label={t('results.stats.bestStreak')} value={team.bestStreak} />
                </dl>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-paper-line bg-paper-sunk px-8 py-4">
          <p className="text-sm font-bold text-ink-muted">
            {t('results.questionsPlayed', {
              played: result.questionsPlayed,
              total: result.totalQuestions,
            })}
          </p>
          {topPlayer && (
            <p className="text-sm font-bold text-ink">
              {copy.topContributor}: <span className="font-extrabold">{topPlayer.name}</span>{' '}
              <span className="text-ink-muted">
                {t('results.topContributorCorrect', { count: topPlayer.correctCount })}
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

