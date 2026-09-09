import type { HostToken, RoomCode } from '@braintug/shared';

/**
 * The host token is the credential for every privileged action, so it is kept in
 * `sessionStorage` rather than `localStorage`: a teacher's match should not
 * survive as an authority on a shared classroom machine after the tab closes.
 */
const key = (roomCode: RoomCode): string => `braintug:host:${roomCode}`;

export function storeHostToken(roomCode: RoomCode, token: HostToken): void {
  try {
    sessionStorage.setItem(key(roomCode), token);
  } catch {
    // Private browsing can refuse storage; the in-memory token still works.
  }
}

export function readHostToken(roomCode: RoomCode): HostToken | null {
  try {
    return (sessionStorage.getItem(key(roomCode)) as HostToken | null) ?? null;
  } catch {
    return null;
  }
}

export function clearHostToken(roomCode: RoomCode): void {
  try {
    sessionStorage.removeItem(key(roomCode));
  } catch {
    // Nothing to do.
  }
}

/**
 * Which room this tab is currently hosting.
 *
 * The `/host` route carries no room code in its URL, so without this a teacher
 * whose tablet slept would land back on the setup form with a match still
 * running and no way to reach it.
 */
const currentKey = 'braintug:host:current';

export function storeCurrentRoom(roomCode: RoomCode): void {
  try {
    sessionStorage.setItem(currentKey, roomCode);
  } catch {
    // Nothing to do.
  }
}

export function readCurrentRoom(): RoomCode | null {
  try {
    return (sessionStorage.getItem(currentKey) as RoomCode | null) ?? null;
  } catch {
    return null;
  }
}

export function clearCurrentRoom(): void {
  try {
    sessionStorage.removeItem(currentKey);
  } catch {
    // Nothing to do.
  }
}
