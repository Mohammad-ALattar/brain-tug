import type { GameId, GameSession, HostToken, PlayerId, TeamId } from '@braintug/shared';

/**
 * What a socket has proven about itself. Populated on join and never taken from
 * a per-message payload, so a client cannot claim a different identity by
 * putting someone else's id in a command.
 */
export type SocketIdentity = {
  gameId: GameId;
  /** Set once the socket has authenticated as a player. */
  playerId?: PlayerId;
  teamId?: TeamId;
  /** True once a valid host token has been presented. */
  isHost: boolean;
  /** True for classroom display sockets. */
  isArena: boolean;
};

/**
 * Constant-time-ish token comparison. Tokens are 32+ random characters so a
 * timing attack is not a realistic threat here, but length-first comparison
 * costs nothing and avoids the obvious early-exit.
 */
export function tokensMatch(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

export function isValidHostToken(session: GameSession, token: string | undefined): boolean {
  if (!token) return false;
  return tokensMatch(session.hostToken as HostToken as string, token);
}

/**
 * Confirms the socket may issue host commands for this game. Checked on every
 * host action rather than trusted from the connection, so a socket that never
 * presented the token cannot pause or end someone else's match.
 */
export function authoriseHost(
  session: GameSession,
  identity: SocketIdentity | undefined,
  token: string | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!identity || identity.gameId !== session.gameId) {
    return { ok: false, error: 'You are not connected to this game.' };
  }
  // Two independent conditions, so a leaked token alone is not enough: the
  // socket must also have registered as a host, which only happens by creating
  // the game or by presenting the token to `watch_arena`. A student socket that
  // joined as a player can therefore never issue host commands.
  if (!identity.isHost) {
    return { ok: false, error: 'This connection is not signed in as the teacher.' };
  }
  if (!isValidHostToken(session, token)) {
    return { ok: false, error: 'Only the teacher who created this game can do that.' };
  }
  return { ok: true };
}

/** Confirms the socket is a seated player of this game. */
export function authorisePlayer(
  session: GameSession,
  identity: SocketIdentity | undefined,
): { ok: true; playerId: PlayerId } | { ok: false; error: string } {
  if (!identity || identity.gameId !== session.gameId || !identity.playerId) {
    return { ok: false, error: 'You have not joined this game.' };
  }
  if (!session.players[identity.playerId]) {
    return { ok: false, error: 'You are no longer in this game.' };
  }
  return { ok: true, playerId: identity.playerId };
}
