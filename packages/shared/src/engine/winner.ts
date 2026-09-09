import { modeOf, type GameSession } from '../domain/session.js';
import type { TeamId } from '../domain/team.js';

/**
 * Winner once a mode's own target has been reached, or null. This is the only
 * way a game can end before the question bank runs out.
 */
export function targetReached(session: GameSession): TeamId | null {
  return modeOf(session).victor(session.modeState, session.rules, session);
}

/**
 * Winner when the question bank runs out or the host ends the match. A genuine
 * draw is possible when both sides sit at the same progress.
 */
export function winnerOnExhaustion(session: GameSession): TeamId | 'draw' {
  return modeOf(session).winnerOnExhaustion(session.modeState, session);
}

/** True once the last round of the configured bank has been played. */
export function isLastQuestion(session: GameSession): boolean {
  return session.currentQuestionIndex >= session.totalQuestions - 1;
}
