import type { GameSession } from '../domain/session.js';
import type { TeamId } from '../domain/team.js';
import { ropeWinner } from '../rules/rope.js';

/**
 * Winner once the rope has reached the threshold, or null. This is the only way
 * a game can end early.
 */
export function ropeVictory(session: GameSession): TeamId | null {
  return ropeWinner(session.rules, session.ropePosition);
}

/**
 * Winner when the question bank runs out: whichever side the rope favours. A
 * rope resting exactly at centre is a genuine draw.
 */
export function winnerOnExhaustion(session: GameSession): TeamId | 'draw' {
  if (session.ropePosition < 0) return 'blue';
  if (session.ropePosition > 0) return 'red';
  return 'draw';
}

/** True once the last round of the configured bank has been played. */
export function isLastQuestion(session: GameSession): boolean {
  return session.currentQuestionIndex >= session.totalQuestions - 1;
}
