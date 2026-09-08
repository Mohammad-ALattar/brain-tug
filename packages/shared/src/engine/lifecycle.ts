import { buildGameResult } from '../domain/result.js';
import type { GameSession } from '../domain/session.js';
import { TEAM_IDS, type TeamId } from '../domain/team.js';
import { ok, reject, type EngineOutcome } from './types.js';

export type StartGameOptions = {
  now: number;
  /**
   * Allows a match with an empty side. Off by default because a tug of war with
   * one team is unwinnable for the other; tests and demos opt in.
   */
  allowEmptyTeams?: boolean;
};

function connectedCount(session: GameSession, teamId: TeamId): number {
  return session.teams[teamId].playerIds.filter((id) => session.players[id]?.connected).length;
}

/**
 * Moves the game into the pre-question countdown. The first round is started by
 * the server's timer when `countdownEndsAt` arrives.
 */
export function startGame(session: GameSession, options: StartGameOptions): EngineOutcome {
  if (session.status !== 'lobby') {
    return reject('already_started', 'This game has already been started.');
  }
  if (!options.allowEmptyTeams) {
    const empty = TEAM_IDS.filter((teamId) => connectedCount(session, teamId) === 0);
    if (empty.length > 0) {
      return reject('invalid_config', 'Both teams need at least one player before starting.');
    }
  }

  const countdownEndsAt = options.now + session.config.countdownMs;
  const next: GameSession = {
    ...session,
    status: 'countdown',
    startedAt: options.now,
    countdownEndsAt,
  };

  return ok(next, [
    { type: 'countdown_started', endsAt: countdownEndsAt },
    { type: 'game_started', startedAt: options.now },
  ]);
}

/**
 * Freezes the round clock. The remaining milliseconds are stored rather than the
 * end time, so resuming restores exactly the time that was left.
 */
export function pauseGame(session: GameSession, now: number): EngineOutcome {
  if (session.status !== 'active') {
    return reject('game_not_active', 'Only an active game can be paused.');
  }
  const remainingMs = session.round ? Math.max(0, session.round.endsAt - now) : 0;
  const next: GameSession = { ...session, status: 'paused', pausedRemainingMs: remainingMs };
  return ok(next, [{ type: 'game_paused', remainingMs }]);
}

/** Restores the frozen clock by rebasing `endsAt` onto the current time. */
export function resumeGame(session: GameSession, now: number): EngineOutcome {
  if (session.status !== 'paused') {
    return reject('game_not_active', 'This game is not paused.');
  }

  const remainingMs = session.pausedRemainingMs ?? 0;
  const round = session.round;
  const next: GameSession = {
    ...session,
    status: 'active',
    pausedRemainingMs: null,
    round: round ? { ...round, endsAt: now + remainingMs } : null,
  };

  return ok(next, [{ type: 'game_resumed', endsAt: now + remainingMs }]);
}

/**
 * Host ends the match early. The rope decides the winner, exactly as it would on
 * question exhaustion, so ending early is never arbitrary.
 */
export function endGame(session: GameSession, now: number): EngineOutcome {
  if (session.status === 'finished') return ok(session);

  const winner: TeamId | 'draw' | null =
    session.startedAt === null
      ? null
      : session.ropePosition < 0
        ? 'blue'
        : session.ropePosition > 0
          ? 'red'
          : 'draw';

  const next: GameSession = {
    ...session,
    status: 'finished',
    winner,
    finishedAt: now,
    nextRoundAt: null,
    countdownEndsAt: null,
    pausedRemainingMs: null,
    result: null,
  };

  const result = buildGameResult(next, 'ended_by_host', now);
  return ok({ ...next, result }, [{ type: 'game_finished', result }]);
}
