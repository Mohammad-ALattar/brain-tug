import type { GameId, GameSession, RoomCode } from '@mtow/shared';
import type { QuestionProvider } from '@mtow/shared';

/**
 * A live game plus the per-game collaborators the engine needs but does not own.
 * The question provider is stateful (it remembers recent prompts) so it lives
 * alongside the session rather than being rebuilt per round.
 */
export type SessionEntry = {
  session: GameSession;
  provider: QuestionProvider;
  /** Last time anything happened, used to reap abandoned rooms. */
  touchedAt: number;
};

/**
 * Storage seam. The in-memory implementation is correct for a single classroom;
 * a Redis-backed implementation can be dropped in behind this interface to scale
 * across processes without touching the gateway or the engine.
 */
export type SessionStore = {
  create(entry: SessionEntry): void;
  byId(gameId: GameId): SessionEntry | undefined;
  byRoomCode(roomCode: RoomCode): SessionEntry | undefined;
  /** Replaces the session for a game and refreshes its activity timestamp. */
  save(session: GameSession, now: number): void;
  delete(gameId: GameId): void;
  /** Room codes currently taken, so a new game can avoid a collision. */
  hasRoomCode(roomCode: RoomCode): boolean;
  /** Removes games untouched for longer than `ttlMs`, returning their ids. */
  reap(now: number, ttlMs: number): GameId[];
  size(): number;
};

export function createInMemorySessionStore(): SessionStore {
  const byGameId = new Map<GameId, SessionEntry>();
  const roomCodeToGameId = new Map<RoomCode, GameId>();

  return {
    create(entry) {
      byGameId.set(entry.session.gameId, entry);
      roomCodeToGameId.set(entry.session.roomCode, entry.session.gameId);
    },

    byId(gameId) {
      return byGameId.get(gameId);
    },

    byRoomCode(roomCode) {
      const gameId = roomCodeToGameId.get(roomCode);
      return gameId ? byGameId.get(gameId) : undefined;
    },

    save(session, now) {
      const existing = byGameId.get(session.gameId);
      if (!existing) return;
      byGameId.set(session.gameId, { ...existing, session, touchedAt: now });
    },

    delete(gameId) {
      const entry = byGameId.get(gameId);
      if (!entry) return;
      roomCodeToGameId.delete(entry.session.roomCode);
      byGameId.delete(gameId);
    },

    hasRoomCode(roomCode) {
      return roomCodeToGameId.has(roomCode);
    },

    reap(now, ttlMs) {
      const expired: GameId[] = [];
      for (const [gameId, entry] of byGameId) {
        if (now - entry.touchedAt > ttlMs) expired.push(gameId);
      }
      for (const gameId of expired) this.delete(gameId);
      return expired;
    },

    size() {
      return byGameId.size;
    },
  };
}
