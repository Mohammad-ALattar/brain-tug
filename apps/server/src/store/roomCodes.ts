import { defaultIdFactory, type IdFactory, type RoomCode } from '@braintug/shared';
import type { SessionStore } from './sessionStore.js';

/** Room codes are short and human-readable, so collisions must be retried. */
const MAX_ATTEMPTS = 50;

export function allocateRoomCode(
  store: SessionStore,
  ids: IdFactory = defaultIdFactory,
): RoomCode {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = ids.roomCode();
    if (!store.hasRoomCode(code)) return code;
  }
  throw new Error('Unable to allocate a free room code');
}
