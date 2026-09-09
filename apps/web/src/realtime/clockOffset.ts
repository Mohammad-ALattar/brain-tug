import type { ClockSyncAck } from '@braintug/shared';
import { request } from './socket';

/**
 * The server sends absolute deadlines, so every client needs to know how far its
 * own clock is from the server's. This module owns that estimate.
 *
 * Correcting on the client keeps the server free of per-socket clock state, and
 * means a laptop with a badly-set clock still shows the right countdown.
 */
let offsetMs = 0;
let sampled = false;

/** Best-of-N sampling: the lowest round-trip gives the least-skewed estimate. */
const SAMPLES = 5;

export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function clockOffsetMs(): number {
  return offsetMs;
}

export function hasSyncedClock(): boolean {
  return sampled;
}

export async function syncClock(): Promise<number> {
  let best = Number.POSITIVE_INFINITY;
  let bestOffset = offsetMs;

  for (let i = 0; i < SAMPLES; i += 1) {
    const clientSentAt = Date.now();
    try {
      const ack = await request<ClockSyncAck>('clock_sync', { clientSentAt });
      const receivedAt = Date.now();
      const roundTrip = receivedAt - clientSentAt;
      if (roundTrip < best) {
        best = roundTrip;
        // Assume the response took half the round trip to come back.
        bestOffset = ack.serverTime + roundTrip / 2 - receivedAt;
      }
    } catch {
      // A failed sample is not fatal; an unsynced clock is only slightly wrong.
      break;
    }
  }

  if (Number.isFinite(best)) {
    offsetMs = bestOffset;
    sampled = true;
  }
  return offsetMs;
}

/** Test seam. */
export function __setClockOffset(value: number): void {
  offsetMs = value;
  sampled = true;
}
