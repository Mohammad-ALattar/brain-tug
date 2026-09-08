import type { AddressInfo } from 'node:net';
import { io as createClient, type Socket } from 'socket.io-client';
import type {
  Ack,
  ClientToServerEvents,
  GameSession,
  RoomCode,
  ServerToClientEvents,
  TeamId,
} from '@mtow/shared';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';
import { startServer, type RunningServer } from '../server.js';

export type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

export type Harness = {
  url: string;
  server: RunningServer;
  /** Opens a client socket and resolves once connected. */
  connect: () => Promise<TestClient>;
  /** The authoritative session, so tests can read server-side truth. */
  session: (roomCode: RoomCode) => GameSession;
  stop: () => Promise<void>;
};

export async function startHarness(): Promise<Harness> {
  const config = { ...loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'error' }), port: 0 };
  const logger = createLogger('error');
  const server = startServer(config, logger);

  await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
  const address = server.httpServer.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;

  const clients: TestClient[] = [];

  return {
    url,
    server,

    async connect() {
      const client: TestClient = createClient(url, {
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
      });
      clients.push(client);
      await new Promise<void>((resolve, reject) => {
        client.once('connect', () => resolve());
        client.once('connect_error', reject);
      });
      return client;
    },

    session(roomCode) {
      const entry = server.gateway.store.byRoomCode(roomCode);
      if (!entry) throw new Error(`No session for room ${roomCode}`);
      return entry.session;
    },

    async stop() {
      for (const client of clients) client.disconnect();
      await server.shutdown();
    },
  };
}

/** Promise wrapper around an acknowledged emit. */
export function emit<E extends keyof ClientToServerEvents, T>(
  client: TestClient,
  event: E,
  payload: unknown,
): Promise<Ack<T>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ack of ${String(event)}`)), 5000);
    (client.emit as (e: E, p: unknown, ack: (res: Ack<T>) => void) => void)(
      event,
      payload,
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
    );
  });
}

/** Resolves with the next payload of `event`, or rejects on timeout. */
export function once<T>(client: TestClient, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ${event}`)),
      timeoutMs,
    );
    (client as unknown as { once: (e: string, cb: (p: T) => void) => void }).once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Asserts an ack succeeded and narrows it to its data. */
export function expectOk<T>(ack: Ack<T>): T {
  if (!ack.ok) throw new Error(`Expected ok ack, got error: ${ack.error}`);
  return ack.data;
}

/** The server-side correct answer for a team's current question. */
export function correctAnswer(session: GameSession, teamId: TeamId): number {
  const round = session.round;
  if (!round) throw new Error('No active round');
  return round.teams[teamId].question.answer;
}

export function currentQuestionId(session: GameSession, teamId: TeamId): string {
  const round = session.round;
  if (!round) throw new Error('No active round');
  return round.teams[teamId].question.id;
}
