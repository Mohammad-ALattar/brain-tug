import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../../design/teamTheme';
import {
  useBrainRaceFinishers,
  useGameMode,
  usePlayers,
  useQuestionIndex,
  useRoundLabel,
  useStatus,
  useTeamName,
  useTeamScore,
  useTotalQuestions,
} from '../../../store/selectors';
import { GameTimer } from './GameTimer';

/** Team badge with live player count, as in the reference header. */
const TeamBadge = memo(function TeamBadge({ teamId }: { teamId: TeamId }) {
  const { t } = useTranslation('game');
  const theme = TEAM_THEME[teamId];
  const name = useTeamName(teamId);
  const players = usePlayers();
  const count = players.filter((p) => p.teamId === teamId && p.connected).length;

  return (
    <div className={`flex items-center gap-2.5 rounded-chip ${theme.solid} px-3.5 py-2`}>
      <div className="grid h-8 w-8 place-items-center rounded-full bg-white/25">
        <span className="font-display text-sm font-extrabold text-white">
          {name.slice(0, 1).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0">
        <p className="max-w-[150px] truncate font-display text-sm font-extrabold uppercase leading-none tracking-wide text-white">
          {name}
        </p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-white/80">
          {count} {t(count === 1 ? 'arena.header.player' : 'arena.header.players')}
        </p>
      </div>
    </div>
  );
});

/** Large score readout. Subscribes to a single number. */
const ScoreBadge = memo(function ScoreBadge({ teamId }: { teamId: TeamId }) {
  const { t } = useTranslation('game');
  const score = useTeamScore(teamId);
  const name = useTeamName(teamId);
  const theme = TEAM_THEME[teamId];

  return (
    <div
      className="flex flex-col items-center"
      role="status"
      aria-label={t('arena.header.scoreAria', { name })}
      aria-live="polite"
    >
      <span className={`tabular font-display text-[34px] font-extrabold leading-none ${theme.text}`}>
        {score}
      </span>
      <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {t('arena.header.score')}
      </span>
    </div>
  );
});

/** Brain Race: team correct answers in the header. */
const CorrectBadge = memo(function CorrectBadge({ teamId }: { teamId: TeamId }) {
  const { t } = useTranslation('game');
  const score = useTeamScore(teamId);
  const name = useTeamName(teamId);
  const theme = TEAM_THEME[teamId];

  return (
    <div
      className="flex flex-col items-center"
      role="status"
      aria-label={t('arena.header.correctAria', { name })}
      aria-live="polite"
    >
      <span className={`tabular font-display text-[28px] font-extrabold leading-none ${theme.text}`}>
        {score}
      </span>
      <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {t('arena.header.correct')}
      </span>
    </div>
  );
});

/** Brain Race: finishers progress toward the team win condition. */
const FinishersBadge = memo(function FinishersBadge({ teamId }: { teamId: TeamId }) {
  const { t } = useTranslation('game');
  const finishers = useBrainRaceFinishers(teamId);
  const name = useTeamName(teamId);
  const theme = TEAM_THEME[teamId];

  return (
    <div
      className="flex flex-col items-center"
      role="status"
      aria-label={t('arena.header.finishersAria', { name })}
      aria-live="polite"
    >
      <span className={`tabular font-display text-[28px] font-extrabold leading-none ${theme.text}`}>
        {finishers.finished}
        <span className="text-xl text-ink-muted"> / {finishers.required}</span>
      </span>
      <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {t('arena.header.finishers')}
      </span>
    </div>
  );
});

const BrainRaceTeamMetrics = memo(function BrainRaceTeamMetrics({ teamId }: { teamId: TeamId }) {
  return (
    <div className="flex items-center gap-3">
      <CorrectBadge teamId={teamId} />
      <FinishersBadge teamId={teamId} />
    </div>
  );
});

/** The full-width header: teams, scores, question counter and countdown. */
export const TopGameHeader = memo(function TopGameHeader() {
  const { t } = useTranslation('game');
  const index = useQuestionIndex();
  const total = useTotalQuestions();
  const label = useRoundLabel();
  const status = useStatus();
  const mode = useGameMode();
  const isRace = mode === 'brain_race';

  return (
    <header className="bt-panel flex h-[88px] items-center gap-4 px-4">
      <TeamBadge teamId="blue" />
      {isRace ? (
        <BrainRaceTeamMetrics teamId="blue" />
      ) : (
        <ScoreBadge teamId="blue" />
      )}

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="rounded-chip bg-ink px-4 py-1.5">
          <span className="tabular font-display text-sm font-extrabold uppercase tracking-wide text-white">
            {status === 'lobby'
              ? t('arena.header.waitingLobby')
              : t('arena.header.question', { current: Math.max(1, index + 1), total })}
          </span>
        </div>
        <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
          {label}
        </p>
      </div>

      <GameTimer />

      {isRace ? (
        <BrainRaceTeamMetrics teamId="red" />
      ) : (
        <ScoreBadge teamId="red" />
      )}
      <TeamBadge teamId="red" />
    </header>
  );
});
