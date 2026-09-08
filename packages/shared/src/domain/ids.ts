import { customAlphabet, nanoid } from 'nanoid';

export type GameId = string & { readonly __brand: 'GameId' };
export type PlayerId = string & { readonly __brand: 'PlayerId' };
export type QuestionId = string & { readonly __brand: 'QuestionId' };
export type RoomCode = string & { readonly __brand: 'RoomCode' };
/** Secret proving the bearer is the host of a game. Never broadcast. */
export type HostToken = string & { readonly __brand: 'HostToken' };
/** Secret proving the bearer is a specific player. Never broadcast. */
export type PlayerToken = string & { readonly __brand: 'PlayerToken' };

/**
 * Room codes are read aloud and typed by children, so the alphabet excludes
 * characters that are easily confused: 0/O, 1/I/L, 5/S, 2/Z, 8/B.
 */
const ROOM_CODE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';
const roomCodeNanoid = customAlphabet(ROOM_CODE_ALPHABET, 6);

/**
 * Every id the engine mints comes from here so tests can inject a deterministic
 * factory and assert on exact state. The engine never calls `nanoid` directly.
 */
export type IdFactory = {
  gameId(): GameId;
  playerId(): PlayerId;
  questionId(): QuestionId;
  roomCode(): RoomCode;
  hostToken(): HostToken;
  playerToken(): PlayerToken;
};

export const defaultIdFactory: IdFactory = {
  gameId: () => `g_${nanoid(12)}` as GameId,
  playerId: () => `p_${nanoid(12)}` as PlayerId,
  questionId: () => `q_${nanoid(12)}` as QuestionId,
  // Formatted as ABC-123 in the reference; stored without the dash.
  roomCode: () => roomCodeNanoid() as RoomCode,
  hostToken: () => `ht_${nanoid(32)}` as HostToken,
  playerToken: () => `pt_${nanoid(32)}` as PlayerToken,
};

/** Builds a counter-based factory for reproducible tests. */
export function createSequentialIdFactory(prefix = ''): IdFactory {
  const counters = new Map<string, number>();
  const next = (kind: string): string => {
    const n = (counters.get(kind) ?? 0) + 1;
    counters.set(kind, n);
    return `${prefix}${kind}${n}`;
  };
  return {
    gameId: () => next('game') as GameId,
    playerId: () => next('player') as PlayerId,
    questionId: () => next('question') as QuestionId,
    roomCode: () => next('ROOM') as RoomCode,
    hostToken: () => next('host') as HostToken,
    playerToken: () => next('ptok') as PlayerToken,
  };
}

/** Normalises user-typed room codes: strips dashes/spaces and upper-cases. */
export function normaliseRoomCode(input: string): RoomCode {
  return input.replace(/[\s-]/g, '').toUpperCase() as RoomCode;
}

/** Renders a stored room code for display, as `ABC-123` in the reference. */
export function formatRoomCode(code: RoomCode): string {
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)}-${code.slice(mid)}`;
}
