import { advance, nextDeadline, type EngineEvent, type GameId, type GameSession } from '@braintug/shared';
import type { SessionStore } from '../store/sessionStore.js';
import type { Logger } from '../logger.js';

export type TimerService = {
  /**
   * Re-arms the timer for a game after any state change. Idempotent: call it
   * freely after every command.
   */
  schedule(gameId: GameId): void;
  cancel(gameId: GameId): void;
  cancelAll(): void;
  /** Number of games with an armed timer, for tests and health checks. */
  pending(): number;
};

export type TimerServiceDeps = {
  store: SessionStore;
  logger: Logger;
  /**
   * Called after the engine advances, with the events it produced so the
   * gateway can fan out `question_started`, `game_finished` and friends rather
   * than only a state snapshot.
   */
  onAdvance: (session: GameSession, events: EngineEvent[]) => void;
  now?: () => number;
};

/**
 * Owns wall-clock scheduling so the engine can stay pure.
 *
 * One timeout per game, set to the engine's own `nextDeadline`, rather than a
 * global polling interval. A game with 40 students still costs one timer, and an
 * idle game costs none.
 */
export function createTimerService(deps: TimerServiceDeps): TimerService {
  const timers = new Map<GameId, NodeJS.Timeout>();
  const now = deps.now ?? (() => Date.now());

  const cancel = (gameId: GameId): void => {
    const timer = timers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      timers.delete(gameId);
    }
  };

  const fire = (gameId: GameId): void => {
    timers.delete(gameId);
    const entry = deps.store.byId(gameId);
    if (!entry) return;

    const at = now();
    const result = advance(entry.session, entry.dealer, at);

    if (result.session !== entry.session) {
      deps.store.save(result.session, at);
      deps.onAdvance(result.session, result.events);
      // The transition may have opened a new deadline (next round, round end).
      schedule(gameId);
      return;
    }

    // The deadline passed but the engine had nothing to do. Re-arming on a
    // zero delay would spin the event loop, so only re-arm for a future
    // deadline and make the stall visible instead.
    const deadline = nextDeadline(entry.session);
    if (deadline !== null && deadline > at) {
      schedule(gameId);
    } else if (deadline !== null) {
      deps.logger.warn('Timer fired with no engine progress; not re-arming', {
        gameId,
        status: entry.session.status,
        deadline,
        at,
      });
    }
  };

  const schedule = (gameId: GameId): void => {
    cancel(gameId);
    const entry = deps.store.byId(gameId);
    if (!entry) return;

    const deadline = nextDeadline(entry.session);
    if (deadline === null) return;

    // A deadline already in the past fires on the next tick rather than never.
    const delay = Math.max(0, deadline - now());
    const timer = setTimeout(() => {
      try {
        fire(gameId);
      } catch (error) {
        deps.logger.error('Timer advance failed', { gameId, error });
      }
    }, delay);
    // Never hold the process open just for a game clock.
    timer.unref?.();
    timers.set(gameId, timer);
  };

  return {
    schedule,
    cancel,
    cancelAll() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
    pending() {
      return timers.size;
    },
  };
}
