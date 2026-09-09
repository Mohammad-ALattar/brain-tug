import type { ClockSyncAck, ClockSyncPayload } from '@braintug/shared';

/**
 * The server broadcasts absolute deadlines (`endsAt`) rather than countdowns, so
 * every client needs an estimate of the server clock. This handshake gives them
 * one: the client sends its own clock, the server echoes it alongside its own,
 * and the client derives `offset = serverTime + rtt/2 - clientReceivedAt`.
 *
 * Keeping the correction on the client means the server never has to track
 * per-socket clock state.
 */
export function handleClockSync(payload: ClockSyncPayload, now: number): ClockSyncAck {
  return {
    clientSentAt: payload.clientSentAt,
    serverTime: now,
  };
}
