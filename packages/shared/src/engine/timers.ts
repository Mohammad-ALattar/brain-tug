import type { QuestionDealer } from '../content/dealer.js';
import type { GameSession } from '../domain/session.js';
import { expireRoundIfDue, startRound } from './rounds.js';
import type { EngineResult } from './types.js';

/**
 * The next absolute time the server must wake up for this game, or null when
 * nothing is scheduled. The timer service sets a single timeout to this instead
 * of polling, and the engine stays the sole owner of the schedule.
 */
export function nextDeadline(session: GameSession): number | null {
  switch (session.status) {
    case 'countdown':
      return session.countdownEndsAt;
    case 'active':
      if (session.nextRoundAt !== null) return session.nextRoundAt;
      return session.round && session.round.resolvedAt === null ? session.round.endsAt : null;
    case 'lobby':
    case 'paused':
    case 'finished':
      return null;
  }
}

/**
 * Applies every transition that has come due at `now`, in order, until the game
 * is stable. Driving a whole match is then just calling this in a loop, which is
 * exactly what both the server's timer service and the lifecycle tests do.
 */
export function advance(
  session: GameSession,
  dealer: QuestionDealer,
  now: number,
): EngineResult {
  let current = session;
  const events: EngineResult['events'] = [];

  // Bounded so a rules bug can never spin the server.
  for (let step = 0; step < 8; step += 1) {
    const before = current;

    if (current.status === 'countdown' && current.countdownEndsAt !== null && now >= current.countdownEndsAt) {
      const result = startRound(current, dealer, now);
      current = result.session;
      events.push(...result.events);
      continue;
    }

    if (current.status === 'active' && current.nextRoundAt !== null && now >= current.nextRoundAt) {
      const result = startRound(current, dealer, now);
      current = result.session;
      events.push(...result.events);
      continue;
    }

    if (current.status === 'active') {
      const result = expireRoundIfDue(current, now);
      if (result.session !== current) {
        current = result.session;
        events.push(...result.events);
        continue;
      }
    }

    if (current === before) break;
  }

  return { session: current, events };
}
