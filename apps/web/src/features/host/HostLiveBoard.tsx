import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import type { GameModeId, GameSession, ModeState, TeamId } from '@braintug/shared';
import { displayLeadGapMetres, displayLeader, displayTeamFinishers } from '@braintug/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { useModeCopy } from '../../i18n/useModeCopy';
import {
  useBrainRaceFinishers,
  useGameMode,
  useModeState,
  usePlayers,
  useQuestionIndex,
  useTeamName,
  useTeamScore,
  useTeamStreak,
  useTotalQuestions,
} from '../../store/selectors';
import { useGameStore } from '../../store/gameStore';

/**
 * A compact repeat of what the class is watching, so a teacher facing the room
 * does not have to turn around to see the state of the match.
 */
export function HostLiveBoard() {
  const { t } = useTranslation('game');
  const index = useQuestionIndex();
  const total = useTotalQuestions();
  const players = usePlayers();
  const mode = useGameMode();
  const modeState = useModeState();
  const state = useGameStore((s) => s.state);
  const connected = players.filter((p) => p.connected).length;

  return (
    <section className="bt-panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
          {t('arena.liveBoard.title')}
        </h2>
        <p className="tabular text-xs font-bold text-ink-muted">
          {index >= 0
            ? t('arena.liveBoard.questionOf', { current: index + 1, total })
            : t('arena.liveBoard.questionCount', { total })}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <TeamTile teamId="blue" />
        <TeamTile teamId="red" />
      </div>

      <p className="mt-3 text-center text-xs font-bold text-ink-muted">
        <LeadStatus mode={mode} modeState={modeState} state={state} />
      </p>

      <p className="mt-1 text-center text-[11px] font-semibold text-ink-faint">
        {t('arena.liveBoard.devicesConnected', {
          connected,
          total: players.length,
        })}
      </p>
    </section>
  );
}

function finishersSessionSlice(
  view: NonNullable<ReturnType<typeof useGameStore.getState>['state']>,
): Pick<GameSession, 'teams' | 'players'> {
  return {
    teams: view.teams,
    players: Object.fromEntries(view.players.map((player) => [player.id, player])) as GameSession['players'],
  };
}

function LeadStatus({
  mode,
  modeState,
  state,
}: {
  mode: GameModeId;
  modeState: ModeState | null;
  state: ReturnType<typeof useGameStore.getState>['state'];
}): ReactNode {
  const { t } = useTranslation('game');
  const copy = useModeCopy(mode);

  if (!modeState || !state) return copy.level;

  if (mode === 'brain_race' && modeState.kind === 'brain_race') {
    const sessionSlice = finishersSessionSlice(state);
    const blue = displayTeamFinishers(
      modeState,
      sessionSlice as GameSession,
      'blue',
      state.rules.winThreshold,
    );
    const red = displayTeamFinishers(
      modeState,
      sessionSlice as GameSession,
      'red',
      state.rules.winThreshold,
    );

    if (blue.finished === red.finished) return copy.level;

    const leader: TeamId = blue.finished > red.finished ? 'blue' : 'red';
    const gap = Math.abs(blue.finished - red.finished);
    const leaderName = leader === 'blue' ? state.teams.blue.name : state.teams.red.name;

    return (
      <Trans
        t={t}
        i18nKey="arena.liveBoard.aheadByFinishers"
        count={gap}
        values={{ name: leaderName, gap }}
        components={[
          <span className={TEAM_THEME[leader].text} />,
          <span className="tabular" />,
        ]}
      />
    );
  }

  const leader = displayLeader(modeState);
  if (leader === null) return copy.level;

  const leaderName = leader === 'blue' ? state.teams.blue.name : state.teams.red.name;
  const metres = displayLeadGapMetres(modeState);

  return (
    <Trans
      t={t}
      i18nKey="arena.liveBoard.aheadByMetres"
      values={{ name: leaderName, metres: metres.toFixed(copy.gapDigits) }}
      components={[
        <span className={TEAM_THEME[leader].text} />,
        <span className="tabular" />,
      ]}
    />
  );
}

function TeamTile({ teamId }: { teamId: TeamId }) {
  const { t } = useTranslation('game');
  const theme = TEAM_THEME[teamId];
  const mode = useGameMode();
  const name = useTeamName(teamId);
  const finishers = useBrainRaceFinishers(teamId);
  const correctCount = useGameStore((s) => s.state?.teams[teamId].correctCount ?? 0);
  const score = useTeamScore(teamId);
  const streak = useTeamStreak(teamId);

  if (mode === 'brain_race') {
    return (
      <div className={`rounded-card border ${theme.border} ${theme.tint} px-3 py-2.5`}>
        <p className={`truncate text-xs font-extrabold ${theme.textStrong}`}>{name}</p>
        <p className={`tabular font-display text-3xl font-extrabold leading-none ${theme.text}`}>
          {finishers.finished}
          <span className="text-xl text-ink-muted"> / {finishers.required}</span>
        </p>
        <p className="tabular mt-0.5 text-[11px] font-bold text-ink-faint">
          {t('arena.liveBoard.correctCount', { count: correctCount })}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-card border ${theme.border} ${theme.tint} px-3 py-2.5`}>
      <p className={`truncate text-xs font-extrabold ${theme.textStrong}`}>{name}</p>
      <p className={`tabular font-display text-3xl font-extrabold leading-none ${theme.text}`}>
        {score}
      </p>
      <p className="tabular mt-0.5 text-[11px] font-bold text-ink-faint">
        {t('arena.liveBoard.streak', { count: streak })}
      </p>
    </div>
  );
}
