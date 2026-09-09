import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@braintug/shared';

export type GameClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

let socket: GameClientSocket | null = null;

/**
 * One socket per browser tab, shared by every hook. Reconnection is left on:
 * classroom wifi drops and phones sleeping are the normal case, and the server
 * restores a seat from the stored player token.
 */
export function getSocket(): GameClientSocket {
  socket ??= io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });
  return socket;
}

/** Promise wrapper around an acknowledged emit, with a timeout. */
export function request<T>(
  event: keyof ClientToServerEvents,
  payload: unknown,
  timeoutMs = 8000,
): Promise<T> {
  const client = getSocket();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The server did not respond.')), timeoutMs);
    (
      client.emit as unknown as (
        e: string,
        p: unknown,
        ack: (res: { ok: true; data: T } | { ok: false; error: string; reason?: string }) => void,
      ) => void
    )(event, payload, (res) => {
      clearTimeout(timer);
      if (res.ok) resolve(res.data);
      else reject(Object.assign(new Error(res.error), { reason: res.reason }));
    });
  });
}

/** Fire-and-forget emit for high-frequency, low-value messages like drafts. */
export function notify(event: keyof ClientToServerEvents, payload: unknown): void {
  (getSocket().emit as unknown as (e: string, p: unknown) => void)(event, payload);
}
