import { revealAnswer } from '../content/answer.js';
import type { QuestionDealer } from '../content/dealer.js';
import { bothTeamsLocked, type Round, type RoundTeamState } from '../domain/game.js';
import { buildGameResult } from '../domain/result.js';
import { modeOf, toPublicRound, type GameSession } from '../domain/session.js';
import type { TeamId } from '../domain/team.js';
import { INTER_ROUND_MS } from '../rules/rules.js';
import type { EngineEvent, EngineResult, RoundResolution } from './types.js';
import { isLastQuestion, targetReached, winnerOnExhaustion } from './winner.js';

export function roundDurationMs(session: GameSession): number {
  return session.config.secondsPerQuestion * 1000;
}

function freshTeamState(question: RoundTeamState['question']): RoundTeamState {
  return {
    question,
    locked: false,
    lockedByPlayerId: null,
    lockedAt: null,
    attemptedPlayerIds: [],
    draft: null,
  };
}

function revealedFor(round: Round): Record<TeamId, string> {
  return {
    blue: revealAnswer(round.teams.blue.question),
    red: revealAnswer(round.teams.red.question),
  };
}

/**
 * Issues the next round: questions according to the mode's assignment, a shared
 * clock, and a shared index. Assumes the caller has already decided a round
 * should start.
 */
export function startRound(
  session: GameSession,
  dealer: QuestionDealer,
  now: number,
): EngineResult {
  const mode = modeOf(session);
  const dealt = dealer.deal(mode.questionAssignment);
  const round: Round = {
    index: session.currentQuestionIndex + 1,
    startedAt: now,
    endsAt: now + roundDurationMs(session),
    assignment: mode.questionAssignment,
    teams: {
      blue: freshTeamState(dealt.blue),
      red: freshTeamState(dealt.red),
    },
    resolvedAt: null,
  };

  const next: GameSession = {
    ...session,
    status: 'active',
    round,
    currentQuestionIndex: round.index,
    countdownEndsAt: null,
    nextRoundAt: null,
    pausedRemainingMs: null,
  };

  return { session: next, events: [{ type: 'question_started', round: toPublicRound(round) }] };
}

/**
 * Closes the current round and decides what happens next: finish on a target
 * reached, finish when the bank is exhausted, or schedule the next round.
 *
 * This does not start the next round itself. The server's timer service calls
 * `startRound` when `nextRoundAt` arrives, which keeps the reducer free of
 * scheduling concerns.
 */
export function resolveRound(
  session: GameSession,
  reason: RoundResolution,
  now: number,
): EngineResult {
  const round = session.round;
  if (!round || round.resolvedAt !== null) return { session, events: [] };

  const resolved: Round = { ...round, resolvedAt: now };
  const events: EngineEvent[] = [];
  const revealed = revealedFor(resolved);

  const victor = targetReached(session);
  if (victor !== null) {
    const finished: GameSession = {
      ...session,
      round: resolved,
      status: 'finished',
      winner: victor,
      finishedAt: now,
      nextRoundAt: null,
      result: null,
    };
    const result = buildGameResult(finished, 'target_reached', now);
    events.push({
      type: 'round_resolved',
      index: round.index,
      reason,
      nextRoundAt: null,
      revealed,
    });
    events.push({ type: 'game_finished', result });
    return { session: { ...finished, result }, events };
  }

  if (isLastQuestion(session)) {
    const winner = winnerOnExhaustion(session);
    const finished: GameSession = {
      ...session,
      round: resolved,
      status: 'finished',
      winner,
      finishedAt: now,
      nextRoundAt: null,
      result: null,
    };
    const result = buildGameResult(finished, 'questions_exhausted', now);
    events.push({
      type: 'round_resolved',
      index: round.index,
      reason,
      nextRoundAt: null,
      revealed,
    });
    events.push({ type: 'game_finished', result });
    return { session: { ...finished, result }, events };
  }

  const nextRoundAt = now + INTER_ROUND_MS;
  const next: GameSession = { ...session, round: resolved, nextRoundAt };
  events.push({
    type: 'round_resolved',
    index: round.index,
    reason,
    nextRoundAt,
    revealed,
  });
  return { session: next, events };
}

/**
 * Resolves the round if the clock has run out. Called by the server's timer and
 * also defensively before any answer is accepted, so a late submission can never
 * slip through on a stale round.
 */
export function expireRoundIfDue(session: GameSession, now: number): EngineResult {
  const round = session.round;
  if (session.status !== 'active' || !round || round.resolvedAt !== null) {
    return { session, events: [] };
  }
  if (now < round.endsAt) return { session, events: [] };
  return resolveRound(session, 'timeout', now);
}

/**
 * True when a team is locked, or every connected player on it has already spent
 * their attempt, so the team can contribute nothing further.
 */
function teamIsDone(session: GameSession, teamId: TeamId): boolean {
  const round = session.round;
  if (!round) return true;
  const teamRound = round.teams[teamId];
  if (teamRound.locked) return true;

  const eligible = session.teams[teamId].playerIds.filter(
    (id) => session.players[id]?.connected,
  );
  // An empty side can never answer, so it never blocks the round from closing.
  if (eligible.length === 0) return true;
  return eligible.every((id) => teamRound.attemptedPlayerIds.includes(id));
}

/**
 * Applied immediately after any submission. Reaching the mode's win target ends
 * the match at once rather than waiting for the round to close; otherwise the
 * round closes early once neither team can answer again, which spares the class
 * from sitting through dead air.
 */
export function settleAfterAnswer(session: GameSession, now: number): EngineResult {
  const round = session.round;
  if (!round || round.resolvedAt !== null) return { session, events: [] };

  if (targetReached(session) !== null) return resolveRound(session, 'victory', now);
  if (modeOf(session).locksTeamOnCorrect && bothTeamsLocked(round)) {
    return resolveRound(session, 'both_locked', now);
  }
  if (teamIsDone(session, 'blue') && teamIsDone(session, 'red')) {
    return resolveRound(session, 'all_attempted', now);
  }
  return { session, events: [] };
}

/**
 * Host-initiated skip. Abandons the current round with no progress awarded to
 * either team, then follows the normal resolution path.
 */
export function skipQuestion(session: GameSession, now: number): EngineResult {
  if (session.status !== 'active' && session.status !== 'paused') {
    return { session, events: [] };
  }
  const base: GameSession =
    session.status === 'paused'
      ? { ...session, status: 'active', pausedRemainingMs: null }
      : session;
  return resolveRound(base, 'skipped', now);
}

/** Convenience wrapper so the server can chain reducers without unwrapping. */
export function chain(result: EngineResult, step: (s: GameSession) => EngineResult): EngineResult {
  const nextStep = step(result.session);
  return { session: nextStep.session, events: [...result.events, ...nextStep.events] };
}
