import { useMemo } from 'react';
import type { GameSession, PlayerId, PublicPlayer, PublicQuestion, TeamId } from '@braintug/shared';
import { displayTeamFinishers, playerProgress } from '@braintug/shared';
import { useGameStore } from './gameStore';

/**
 * Narrow selectors, one per piece of the UI.
 *
 * This is the concrete mechanism for keeping rerenders proportional to what
 * actually changed: the score badge subscribes to a number, so a roster change
 * or a draft keystroke does not re-render it.
 */

export const useConnection = () => useGameStore((s) => s.connection);
export const useGameError = () => useGameStore((s) => s.error);
export const useStatus = () => useGameStore((s) => s.state?.status ?? 'lobby');
export const useRoomCode = () => useGameStore((s) => s.state?.roomCode ?? null);
export const useGameMode = () => useGameStore((s) => s.state?.config.mode ?? 'tug_of_war');
export const useModeState = () => useGameStore((s) => s.state?.modeState ?? null);
export const useWinner = () => useGameStore((s) => s.state?.winner ?? null);
export const useResult = () => useGameStore((s) => s.result);
export const useLastProgress = () => useGameStore((s) => s.lastProgress);
export const useLastResolution = () => useGameStore((s) => s.lastResolution);
export const useMe = () => useGameStore((s) => s.me);
export const useMyOutcome = () => useGameStore((s) => s.myOutcome);

export const useTeamScore = (teamId: TeamId) =>
  useGameStore((s) => s.state?.teams[teamId].score ?? 0);

export const useTeamStreak = (teamId: TeamId) =>
  useGameStore((s) => s.state?.teams[teamId].streak ?? 0);

export const usePlayerStreak = (playerId: PlayerId) =>
  useGameStore((s) => s.state?.players.find((p) => p.id === playerId)?.streak ?? 0);

/** Highest personal streak among connected players on a team (Brain Race lanes). */
export function useTeamPlayerStreakPeak(teamId: TeamId): number {
  const players = usePlayers();
  return useMemo(() => {
    let peak = 0;
    for (const player of players) {
      if (player.teamId === teamId) peak = Math.max(peak, player.streak);
    }
    return peak;
  }, [players, teamId]);
}

export const useTeamName = (teamId: TeamId) =>
  useGameStore((s) => s.state?.teams[teamId].name ?? (teamId === 'blue' ? 'Blue' : 'Red'));

export const useTeamDraft = (teamId: TeamId) => useGameStore((s) => s.drafts[teamId]);

export const useQuestionIndex = () => useGameStore((s) => s.state?.currentQuestionIndex ?? -1);
export const useTotalQuestions = () => useGameStore((s) => s.state?.totalQuestions ?? 0);
export const useRoundLabel = () => useGameStore((s) => s.state?.config.roundLabel ?? '');
export const useRoundEndsAt = () => useGameStore((s) => s.state?.roundEndsAt ?? null);
export const usePausedRemaining = () => useGameStore((s) => s.state?.pausedRemainingMs ?? null);
export const useCountdownEndsAt = () => useGameStore((s) => s.state?.countdownEndsAt ?? null);
export const useSecondsPerQuestion = () =>
  useGameStore((s) => s.state?.config.secondsPerQuestion ?? 20);
export const useRules = () => useGameStore((s) => s.state?.rules ?? null);

/** The prompt shown in a team's question card. */
export const useTeamPrompt = (teamId: TeamId) =>
  useGameStore((s) => s.state?.currentQuestion?.[teamId]?.prompt ?? null);

export const useTeamQuestion = (teamId: TeamId): PublicQuestion | null =>
  useGameStore((s) => s.state?.currentQuestion?.[teamId] ?? null);

export const useTeamQuestionId = (teamId: TeamId) =>
  useGameStore((s) => s.state?.currentQuestion?.[teamId]?.id ?? null);

export const useTeamLocked = (teamId: TeamId) =>
  useGameStore((s) => s.state?.round?.teams[teamId].locked ?? false);

export const useTeamLockedBy = (teamId: TeamId) =>
  useGameStore((s) => s.state?.round?.teams[teamId].lockedByPlayerId ?? null);

export const useTeamRevealedAnswer = (teamId: TeamId) =>
  useGameStore((s) => s.state?.round?.teams[teamId].revealedAnswer ?? null);

export const useNextRoundAt = () => useGameStore((s) => s.state?.nextRoundAt ?? null);

/** This client's own team, when it is a student. */
export const useMyTeamId = () => useGameStore((s) => s.me?.teamId ?? null);

/**
 * Whether this student has already spent their single attempt on this round.
 *
 * Derived rather than tracked locally so a reconnecting phone that missed its
 * own `answer_result` still comes back locked out.
 */
export const useIHaveAttempted = () =>
  useGameStore((s) => {
    const me = s.me;
    if (!me || !s.state?.round) return false;
    return s.state.round.teams[me.teamId].attemptedPlayerIds.includes(me.playerId);
  });

export const usePlayers = () => useGameStore((s) => s.state?.players ?? EMPTY_PLAYERS);

const EMPTY_PLAYERS: PublicPlayer[] = [];
const EMPTY_IDS: PlayerId[] = [];

export function useTeamPlayers(teamId: TeamId): PublicPlayer[] {
  const players = usePlayers();
  return useMemo(() => players.filter((p) => p.teamId === teamId), [players, teamId]);
}

/** Players on a team who have not yet used their attempt this round. */
export function useActiveResponders(teamId: TeamId): PublicPlayer[] {
  const players = usePlayers();
  const attempted = useGameStore(
    (s) => s.state?.round?.teams[teamId].attemptedPlayerIds ?? EMPTY_IDS,
  );

  return useMemo(() => {
    const spent = new Set(attempted);
    return players.filter((p) => p.teamId === teamId && p.connected && !spent.has(p.id));
  }, [players, attempted, teamId]);
}

export function useAttemptedCount(teamId: TeamId): { attempted: number; seated: number } {
  const seated = useTeamPlayers(teamId).filter((p) => p.connected).length;
  const attempted = useGameStore(
    (s) => s.state?.round?.teams[teamId].attemptedPlayerIds.length ?? 0,
  );
  return { attempted, seated };
}

/** Connected players who have spent their attempt on the current round. */
export function useRoundAnswerProgress(): { answered: number; seated: number } {
  const players = usePlayers();
  const blueAttempted = useGameStore(
    (s) => s.state?.round?.teams.blue.attemptedPlayerIds.length ?? 0,
  );
  const redAttempted = useGameStore(
    (s) => s.state?.round?.teams.red.attemptedPlayerIds.length ?? 0,
  );
  const seated = players.filter((p) => p.connected).length;
  return { answered: blueAttempted + redAttempted, seated };
}

function finishersSessionSlice(
  view: NonNullable<ReturnType<typeof useGameStore.getState>['state']>,
): Pick<GameSession, 'teams' | 'players'> {
  return {
    teams: view.teams,
    players: Object.fromEntries(view.players.map((player) => [player.id, player])) as GameSession['players'],
  };
}

export const useRacePlayerProgress = (playerId: PlayerId) =>
  useGameStore((s) => {
    const modeState = s.state?.modeState;
    if (modeState?.kind !== 'brain_race') return 0;
    return playerProgress(modeState, playerId);
  });

export function useBrainRaceFinishers(teamId: TeamId): { finished: number; required: number } {
  const finished = useGameStore((s) => {
    const view = s.state;
    if (!view || view.modeState?.kind !== 'brain_race') return 0;
    return displayTeamFinishers(
      view.modeState,
      finishersSessionSlice(view) as GameSession,
      teamId,
      view.rules.winThreshold,
    ).finished;
  });
  const required = useGameStore((s) => {
    const view = s.state;
    if (!view || view.modeState?.kind !== 'brain_race') return 0;
    return displayTeamFinishers(
      view.modeState,
      finishersSessionSlice(view) as GameSession,
      teamId,
      view.rules.winThreshold,
    ).required;
  });
  return { finished, required };
}
