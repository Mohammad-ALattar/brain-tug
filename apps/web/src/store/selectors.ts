import { useMemo } from 'react';
import type { PlayerId, PublicPlayer, TeamId } from '@mtow/shared';
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
export const useRopePosition = () => useGameStore((s) => s.state?.ropePosition ?? 0);
export const useWinner = () => useGameStore((s) => s.state?.winner ?? null);
export const useResult = () => useGameStore((s) => s.result);
export const useLastPull = () => useGameStore((s) => s.lastPull);
export const useMe = () => useGameStore((s) => s.me);
export const useMyOutcome = () => useGameStore((s) => s.myOutcome);

export const useTeamScore = (teamId: TeamId) =>
  useGameStore((s) => s.state?.teams[teamId].score ?? 0);

export const useTeamStreak = (teamId: TeamId) =>
  useGameStore((s) => s.state?.teams[teamId].streak ?? 0);

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
  useGameStore((s) => s.state?.currentQuestion?.[teamId].prompt ?? null);

export const useTeamQuestionId = (teamId: TeamId) =>
  useGameStore((s) => s.state?.currentQuestion?.[teamId].id ?? null);

export const useTeamLocked = (teamId: TeamId) =>
  useGameStore((s) => s.state?.round?.teams[teamId].locked ?? false);

export const useTeamLockedBy = (teamId: TeamId) =>
  useGameStore((s) => s.state?.round?.teams[teamId].lockedByPlayerId ?? null);

export const useTeamLockedValue = (teamId: TeamId) =>
  useGameStore((s) => s.state?.round?.teams[teamId].lockedValue ?? null);

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

/**
 * Stable empty fallbacks.
 *
 * A selector passed to `useGameStore` must return the same reference when
 * nothing changed. Zustand reads it through `useSyncExternalStore`, which
 * re-reads the snapshot after every render and re-renders again if the
 * reference moved, so a fresh `[]` here is an infinite loop rather than a
 * wasted allocation.
 */
const EMPTY_PLAYERS: PublicPlayer[] = [];
const EMPTY_IDS: PlayerId[] = [];

/**
 * Roster for one team.
 *
 * Filtering happens in `useMemo` rather than inside the store selector for the
 * reason above: the selector returns the store's own stable `players` array and
 * the derived list is recomputed only when that array actually changes.
 */
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
