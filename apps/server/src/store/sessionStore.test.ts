import { describe, expect, it, vi } from 'vitest';
import { createGame, createSequentialIdFactory, type GameId, type RoomCode } from '@mtow/shared';
import { constantProvider } from '@mtow/shared/testing';
import { createInMemorySessionStore } from './sessionStore.js';
import { allocateRoomCode } from './roomCodes.js';
import { createTimerService } from '../services/timerService.js';
import { createLogger } from '../logger.js';

const T0 = 1_000_000;

/** `prefix` keeps ids distinct when a test needs more than one game. */
function entry(now = T0, prefix = 'a-') {
  const session = createGame({
    totalQuestions: 3,
    ids: createSequentialIdFactory(prefix),
    now,
  });
  return { session, provider: constantProvider(), touchedAt: now };
}

describe('in-memory session store', () => {
  it('finds a game by id and by room code', () => {
    const store = createInMemorySessionStore();
    const created = entry();
    store.create(created);

    expect(store.byId(created.session.gameId)?.session.gameId).toBe(created.session.gameId);
    expect(store.byRoomCode(created.session.roomCode)?.session.gameId).toBe(created.session.gameId);
    expect(store.size()).toBe(1);
  });

  it('returns undefined for unknown lookups', () => {
    const store = createInMemorySessionStore();
    expect(store.byId('nope' as GameId)).toBeUndefined();
    expect(store.byRoomCode('NOPE' as RoomCode)).toBeUndefined();
  });

  it('replaces the session on save and refreshes the activity time', () => {
    const store = createInMemorySessionStore();
    const created = entry();
    store.create(created);

    store.save({ ...created.session, ropePosition: 0.5 }, T0 + 5000);

    expect(store.byId(created.session.gameId)?.session.ropePosition).toBe(0.5);
    expect(store.byId(created.session.gameId)?.touchedAt).toBe(T0 + 5000);
    // The stateful question provider survives the save.
    expect(store.byId(created.session.gameId)?.provider).toBe(created.provider);
  });

  it('ignores a save for a game it does not hold', () => {
    const store = createInMemorySessionStore();
    store.save(entry().session, T0);
    expect(store.size()).toBe(0);
  });

  it('frees the room code when a game is deleted', () => {
    const store = createInMemorySessionStore();
    const created = entry();
    store.create(created);

    expect(store.hasRoomCode(created.session.roomCode)).toBe(true);
    store.delete(created.session.gameId);
    expect(store.hasRoomCode(created.session.roomCode)).toBe(false);
    expect(store.byRoomCode(created.session.roomCode)).toBeUndefined();
  });

  it('reaps only games idle for longer than the ttl', () => {
    const store = createInMemorySessionStore();
    const stale = entry(T0, 'stale-');
    const fresh = entry(T0, 'fresh-');
    store.create(stale);
    store.create(fresh);
    store.save(fresh.session, T0 + 9000);

    const reaped = store.reap(T0 + 10_000, 5000);

    expect(reaped).toEqual([stale.session.gameId]);
    expect(store.byId(stale.session.gameId)).toBeUndefined();
    expect(store.byId(fresh.session.gameId)).toBeDefined();
  });
});

describe('allocateRoomCode', () => {
  it('avoids a code already in use', () => {
    const store = createInMemorySessionStore();
    const created = entry();
    store.create(created);

    let call = 0;
    const ids = {
      ...createSequentialIdFactory(),
      // Hand out the taken code first, then a free one.
      roomCode: () => (call++ === 0 ? created.session.roomCode : ('FREE01' as RoomCode)),
    };

    expect(allocateRoomCode(store, ids)).toBe('FREE01');
  });

  it('throws rather than looping forever when every code collides', () => {
    const store = createInMemorySessionStore();
    const created = entry();
    store.create(created);

    const ids = { ...createSequentialIdFactory(), roomCode: () => created.session.roomCode };
    expect(() => allocateRoomCode(store, ids)).toThrow(/room code/i);
  });
});

describe('timer service', () => {
  it('arms nothing for a game with no deadline', () => {
    const store = createInMemorySessionStore();
    const created = entry();
    store.create(created);

    const timers = createTimerService({
      store,
      logger: createLogger('error'),
      onAdvance: () => {},
    });

    // A lobby game has no clock running.
    timers.schedule(created.session.gameId);
    expect(timers.pending()).toBe(0);
  });

  it('arms one timer per game and cancels it cleanly', () => {
    vi.useFakeTimers();
    try {
      const store = createInMemorySessionStore();
      const created = entry();
      // A countdown gives the game a deadline to wake up for.
      const withCountdown = {
        ...created,
        session: {
          ...created.session,
          status: 'countdown' as const,
          countdownEndsAt: Date.now() + 5000,
        },
      };
      store.create(withCountdown);

      const timers = createTimerService({
        store,
        logger: createLogger('error'),
        onAdvance: () => {},
      });

      timers.schedule(withCountdown.session.gameId);
      expect(timers.pending()).toBe(1);

      // Re-arming is idempotent rather than additive.
      timers.schedule(withCountdown.session.gameId);
      expect(timers.pending()).toBe(1);

      timers.cancel(withCountdown.session.gameId);
      expect(timers.pending()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('advances the game and reports events when the deadline arrives', () => {
    vi.useFakeTimers();
    try {
      const store = createInMemorySessionStore();
      const created = entry();
      const startAt = Date.now();
      store.create({
        ...created,
        session: {
          ...created.session,
          status: 'countdown',
          startedAt: startAt,
          countdownEndsAt: startAt + 1000,
        },
      });

      const seen: string[] = [];
      const timers = createTimerService({
        store,
        logger: createLogger('error'),
        onAdvance: (_session, events) => seen.push(...events.map((e) => e.type)),
      });

      timers.schedule(created.session.gameId);
      vi.advanceTimersByTime(1200);

      expect(seen).toContain('question_started');
      expect(store.byId(created.session.gameId)?.session.status).toBe('active');
    } finally {
      vi.useRealTimers();
    }
  });
});
