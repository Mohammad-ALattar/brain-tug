import type { PlayerToken, RoomCode } from '@mtow/shared';

/**
 * A student's seat, remembered per room code.
 *
 * Unlike the host token this lives in `localStorage`, because the failure this
 * guards against is a phone locking, a browser evicting a background tab or a
 * child closing the page mid-match. Losing the token means losing the seat, the
 * name and the accumulated score, so it has to survive more than the tab. The
 * token only ever authorises acting as that one player in that one game.
 */
const tokenKey = (roomCode: RoomCode): string => `mtow:player:${roomCode}`;
const nameKey = 'mtow:playerName';

export function storePlayerToken(roomCode: RoomCode, token: PlayerToken): void {
  try {
    localStorage.setItem(tokenKey(roomCode), token);
  } catch {
    // Private browsing can refuse storage; the live socket still works.
  }
}

export function readPlayerToken(roomCode: RoomCode): PlayerToken | null {
  try {
    return (localStorage.getItem(tokenKey(roomCode)) as PlayerToken | null) ?? null;
  } catch {
    return null;
  }
}

export function clearPlayerToken(roomCode: RoomCode): void {
  try {
    localStorage.removeItem(tokenKey(roomCode));
  } catch {
    // Nothing to do.
  }
}

/** Remembered so a student rejoining a later match does not retype their name. */
export function storePlayerName(name: string): void {
  try {
    localStorage.setItem(nameKey, name);
  } catch {
    // Nothing to do.
  }
}

export function readPlayerName(): string {
  try {
    return localStorage.getItem(nameKey) ?? '';
  } catch {
    return '';
  }
}
