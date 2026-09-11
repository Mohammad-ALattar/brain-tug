import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import {
  QUESTION_BANKS,
  createGame,
  createQuestionDealer,
  createQuestionSource,
  defaultIdFactory,
  disconnectPlayer,
  endGame,
  joinGame,
  normaliseRoomCode,
  pauseGame,
  playerIdForToken,
  reconnectPlayer,
  removePlayer,
  resumeGame,
  setAnswerDraft,
  skipQuestion,
  startGame,
  submitAnswer,
  switchTeam,
  toGameStateView,
  type Ack,
  type ClientToServerEvents,
  type EngineEvent,
  type GameId,
  type GameSession,
  type PlayerId,
  type PlayerToken,
  type RoomCode,
  type ServerToClientEvents,
  type TeamId,
} from '@braintug/shared';
import {
  answerDraftSchema,
  clockSyncSchema,
  createGameSchema,
  hostActionSchema,
  joinGameSchema,
  movePlayerSchema,
  rejoinGameSchema,
  rejoinHostSchema,
  removePlayerSchema,
  submitAnswerSchema,
  switchTeamSchema,
  watchArenaSchema,
} from '@braintug/shared';
import { corsOriginCheck, type ServerConfig } from '../config.js';
import type { Logger } from '../logger.js';
import { allocateRoomCode } from '../store/roomCodes.js';
import { createInMemorySessionStore, type SessionStore } from '../store/sessionStore.js';
import { createTimerService } from '../services/timerService.js';
import { handleClockSync } from '../services/clockSync.js';
import { authoriseHost, authorisePlayer, isValidHostToken, type SocketIdentity } from './auth.js';
import { dispatchEvents, type GameServer, type GameSocket } from './broadcast.js';
import { rooms } from './rooms.js';

export type Gateway = {
  io: GameServer;
  store: SessionStore;
  close: () => Promise<void>;
};

const fail = (error: string, reason?: string): Ack<never> =>
  reason === undefined ? { ok: false, error } : { ok: false, error, reason };

export function attachGateway(
  httpServer: HttpServer,
  config: ServerConfig,
  logger: Logger,
): Gateway {
  const io: GameServer = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: corsOriginCheck(config.corsOrigins) },
    // Classroom wifi drops constantly; be patient before declaring a socket gone.
    pingTimeout: 25_000,
    pingInterval: 10_000,
  });

  const store = createInMemorySessionStore();
  const identities = new Map<string, SocketIdentity>();
  /** playerId -> socket ids, so an outcome can be delivered privately. */
  const playerSockets = new Map<PlayerId, Set<string>>();

  const now = (): number => Date.now();

  const broadcast = (session: GameSession, events: EngineEvent[]): void => {
    if (events.length === 0) return;
    dispatchEvents(io, session, events, playerSockets);
  };

  const timers = createTimerService({
    store,
    logger,
    // The timer service has already persisted the advanced session, so this only
    // has to fan the events out.
    onAdvance: (session, events) => broadcast(session, events),
  });

  /**
   * Applies an engine result: persists it, re-arms the clock, and fans out.
   * Every command handler funnels through here so none of them can forget a step.
   */
  const commit = (session: GameSession, events: EngineEvent[]): void => {
    const at = now();
    store.save(session, at);
    timers.schedule(session.gameId);
    broadcast(session, events);
  };

  const lookupByRoom = (roomCode: RoomCode) => store.byRoomCode(normaliseRoomCode(roomCode));

  io.on('connection', (socket: GameSocket) => {
    logger.debug('Socket connected', { id: socket.id });

    socket.on('clock_sync', (raw, ack) => {
      const parsed = clockSyncSchema.safeParse(raw);
      if (!parsed.success) return ack?.(fail('Malformed clock sync request.'));
      ack?.({ ok: true, data: handleClockSync(parsed.data, now()) });
    });

    socket.on('create_game', (raw, ack) => {
      const parsed = createGameSchema.safeParse(raw);
      if (!parsed.success) return ack?.(fail('Those game settings are not valid.'));

      const at = now();
      const options = parsed.data;
      const roomCode = allocateRoomCode(store);

      let session = createGame({
        language: options.language,
        mode: options.mode,
        subject: options.subject,
        operation: options.operation,
        difficulty: options.difficulty,
        totalQuestions: options.totalQuestions,
        secondsPerQuestion: options.secondsPerQuestion,
        countdownMs: options.countdownMs,
        teamNames: options.teamNames,
        rules: options.winThreshold ? { winThreshold: options.winThreshold } : undefined,
        trackMetres: options.trackMetres,
        finishersRequiredPerTeam: options.finishersRequiredPerTeam,
        now: at,
      });
      // Use the collision-checked code rather than the one the factory minted.
      session = { ...session, roomCode };

      const dealer = createQuestionDealer(
        createQuestionSource(
          {
            subject: options.subject,
            difficulty: options.difficulty,
            language: options.language,
            operation: options.operation,
          },
          { banks: QUESTION_BANKS, ids: defaultIdFactory },
        ),
      );

      store.create({ session, dealer, touchedAt: at });

      const identity: SocketIdentity = {
        gameId: session.gameId,
        isHost: true,
        isArena: false,
      };
      identities.set(socket.id, identity);
      void socket.join([rooms.game(session.gameId), rooms.host(session.gameId)]);

      logger.info('Game created', { gameId: session.gameId, roomCode: session.roomCode });

      ack?.({
        ok: true,
        data: {
          gameId: session.gameId,
          roomCode: session.roomCode,
          hostToken: session.hostToken,
          state: toGameStateView(session),
        },
      });
    });

    socket.on('rejoin_host', (raw, ack) => {
      const parsed = rejoinHostSchema.safeParse(raw);
      if (!parsed.success) return ack?.(fail('Malformed request.'));

      const entry = lookupByRoom(parsed.data.roomCode as RoomCode);
      if (!entry) return ack?.(fail('No game found with that room code.', 'no_such_game'));

      // Constant-time-ish token comparison lives in `isValidHostToken`; a wrong
      // token is indistinguishable from a missing game to the caller.
      if (!isValidHostToken(entry.session, parsed.data.hostToken)) {
        return ack?.(fail('Those host credentials are not valid.', 'not_host'));
      }

      const gameId = entry.session.gameId;
      identities.set(socket.id, { gameId, isHost: true, isArena: false });
      void socket.join([rooms.game(gameId), rooms.host(gameId)]);

      ack?.({
        ok: true,
        data: {
          gameId,
          roomCode: entry.session.roomCode,
          state: toGameStateView(entry.session),
          result: entry.session.result,
        },
      });
    });

    socket.on('watch_arena', (raw, ack) => {
      const parsed = watchArenaSchema.safeParse(raw);
      if (!parsed.success) return ack?.(fail('Malformed request.'));

      const entry = lookupByRoom(parsed.data.roomCode as RoomCode);
      if (!entry) return ack?.(fail('No game found with that room code.', 'no_such_game'));

      const isHost = isValidHostToken(entry.session, parsed.data.hostToken);
      const identity: SocketIdentity = {
        gameId: entry.session.gameId,
        isHost,
        isArena: true,
      };
      identities.set(socket.id, identity);

      const joinRooms = [rooms.game(entry.session.gameId), rooms.arena(entry.session.gameId)];
      if (isHost) joinRooms.push(rooms.host(entry.session.gameId));
      void socket.join(joinRooms);

      ack?.({
        ok: true,
        data: {
          gameId: entry.session.gameId,
          roomCode: entry.session.roomCode,
          state: toGameStateView(entry.session),
          isHost,
          result: entry.session.result,
        },
      });
    });

    socket.on('join_game', (raw, ack) => {
      const parsed = joinGameSchema.safeParse(raw);
      if (!parsed.success) return ack?.(fail('Please check your name and room code.'));

      const entry = lookupByRoom(parsed.data.roomCode as RoomCode);
      if (!entry) return ack?.(fail('No game found with that room code.', 'no_such_game'));

      const result = joinGame(entry.session, {
        name: parsed.data.name,
        teamId: parsed.data.teamId,
        now: now(),
      });
      if (!result.ok) return ack?.(fail(result.message, result.reason));
      if (!result.joined) return ack?.(fail('Could not join that game.'));

      const { playerId, playerToken, teamId } = result.joined;
      const gameId = result.session.gameId;

      identities.set(socket.id, { gameId, playerId, teamId, isHost: false, isArena: false });
      registerPlayerSocket(playerId, socket.id);
      void socket.join([rooms.game(gameId), rooms.players(gameId), rooms.team(gameId, teamId)]);

      commit(result.session, result.events);

      ack?.({
        ok: true,
        data: {
          gameId,
          roomCode: result.session.roomCode,
          playerId,
          playerToken,
          teamId,
          state: toGameStateView(result.session),
          result: result.session.result,
        },
      });
    });

    socket.on('rejoin_game', (raw, ack) => {
      const parsed = rejoinGameSchema.safeParse(raw);
      if (!parsed.success) return ack?.(fail('Malformed rejoin request.'));

      const entry = lookupByRoom(parsed.data.roomCode as RoomCode);
      if (!entry) return ack?.(fail('No game found with that room code.', 'no_such_game'));

      const playerId = playerIdForToken(entry.session, parsed.data.playerToken as PlayerToken);
      if (!playerId) return ack?.(fail('That seat is no longer available.', 'not_a_player'));

      const player = entry.session.players[playerId];
      if (!player) return ack?.(fail('That seat is no longer available.', 'not_a_player'));

      const result = reconnectPlayer(entry.session, playerId);
      if (!result.ok) return ack?.(fail(result.message, result.reason));

      const gameId = result.session.gameId;
      identities.set(socket.id, {
        gameId,
        playerId,
        teamId: player.teamId,
        isHost: false,
        isArena: false,
      });
      registerPlayerSocket(playerId, socket.id);
      void socket.join([
        rooms.game(gameId),
        rooms.players(gameId),
        rooms.team(gameId, player.teamId),
      ]);

      commit(result.session, result.events);

      ack?.({
        ok: true,
        data: {
          gameId,
          roomCode: result.session.roomCode,
          playerId,
          playerToken: parsed.data.playerToken as PlayerToken,
          teamId: player.teamId,
          state: toGameStateView(result.session),
          result: result.session.result,
        },
      });
    });

    socket.on('switch_team', (raw, ack) => {
      const parsed = switchTeamSchema.safeParse(raw);
      if (!parsed.success) return ack?.(fail('Malformed request.'));

      const context = requirePlayer(socket, ack);
      if (!context) return;

      const result = switchTeam(context.session, context.playerId, parsed.data.teamId);
      if (!result.ok) return ack?.(fail(result.message, result.reason));

      const gameId = context.session.gameId;
      void socket.leave(rooms.team(gameId, context.identity.teamId!));
      void socket.join(rooms.team(gameId, parsed.data.teamId));
      identities.set(socket.id, { ...context.identity, teamId: parsed.data.teamId });

      commit(result.session, result.events);
      ack?.({ ok: true, data: null });
    });

    socket.on('submit_answer', (raw, ack) => {
      const parsed = submitAnswerSchema.safeParse(raw);
      if (!parsed.success) {
        return ack?.({ ok: true, data: { status: 'rejected', reason: 'malformed_answer' } });
      }

      const context = requirePlayer(socket, ack);
      if (!context) return;

      // The engine re-checks the clock, the question id, the lock and the
      // attempt list; nothing here is taken on the client's word.
      const result = submitAnswer(context.session, {
        playerId: context.playerId,
        questionId: parsed.data.questionId as never,
        value: parsed.data.value,
        now: now(),
      });

      commit(result.session, result.events);
      ack?.({ ok: true, data: result.outcome });
    });

    socket.on('answer_draft', (raw) => {
      const parsed = answerDraftSchema.safeParse(raw);
      if (!parsed.success) return;

      const identity = identities.get(socket.id);
      if (!identity?.playerId) return;
      const entry = store.byId(identity.gameId);
      if (!entry) return;

      const result = setAnswerDraft(entry.session, {
        playerId: identity.playerId,
        value: parsed.data.value,
        now: now(),
      });
      if (result.events.length === 0) return;

      // Drafts are frequent and low-value: persist and relay, but never re-arm
      // the game clock or trigger a state snapshot for them.
      store.save(result.session, now());
      broadcast(result.session, result.events);
    });

    socket.on('start_game', (raw, ack) => {
      const context = requireHost(socket, raw, ack);
      if (!context) return;

      const result = startGame(context.session, { now: now() });
      if (!result.ok) return ack?.(fail(result.message, result.reason));

      commit(result.session, result.events);
      ack?.({ ok: true, data: null });
    });

    socket.on('pause_game', (raw, ack) => {
      const context = requireHost(socket, raw, ack);
      if (!context) return;

      const result = pauseGame(context.session, now());
      if (!result.ok) return ack?.(fail(result.message, result.reason));

      commit(result.session, result.events);
      ack?.({ ok: true, data: null });
    });

    socket.on('resume_game', (raw, ack) => {
      const context = requireHost(socket, raw, ack);
      if (!context) return;

      const result = resumeGame(context.session, now());
      if (!result.ok) return ack?.(fail(result.message, result.reason));

      commit(result.session, result.events);
      ack?.({ ok: true, data: null });
    });

    socket.on('skip_question', (raw, ack) => {
      const context = requireHost(socket, raw, ack);
      if (!context) return;

      const result = skipQuestion(context.session, now());
      commit(result.session, result.events);
      ack?.({ ok: true, data: null });
    });

    socket.on('end_game', (raw, ack) => {
      const context = requireHost(socket, raw, ack);
      if (!context) return;

      const result = endGame(context.session, now());
      if (!result.ok) return ack?.(fail(result.message, result.reason));

      timers.cancel(context.session.gameId);
      commit(result.session, result.events);
      ack?.({ ok: true, data: null });
    });

    socket.on('remove_player', (raw, ack) => {
      const parsed = removePlayerSchema.safeParse(raw);
      if (!parsed.success) return ack?.(fail('Malformed request.'));

      const context = requireHost(socket, parsed.data, ack);
      if (!context) return;

      const result = removePlayer(context.session, parsed.data.playerId as PlayerId);
      if (!result.ok) return ack?.(fail(result.message, result.reason));

      commit(result.session, result.events);
      ack?.({ ok: true, data: null });
    });

    socket.on('move_player', (raw, ack) => {
      const parsed = movePlayerSchema.safeParse(raw);
      if (!parsed.success) return ack?.(fail('Malformed request.'));

      const context = requireHost(socket, parsed.data, ack);
      if (!context) return;

      const playerId = parsed.data.playerId as PlayerId;
      const from = context.session.players[playerId]?.teamId;

      // The engine refuses this outside the lobby, so a host cannot hand a
      // player a second attempt by moving them mid-round.
      const result = switchTeam(context.session, playerId, parsed.data.teamId);
      if (!result.ok) return ack?.(fail(result.message, result.reason));

      if (from && from !== parsed.data.teamId) {
        movePlayerSockets(context.session.gameId, playerId, from, parsed.data.teamId);
      }

      commit(result.session, result.events);
      ack?.({ ok: true, data: null });
    });

    socket.on('disconnect', (reason) => {
      const identity = identities.get(socket.id);
      identities.delete(socket.id);
      if (!identity?.playerId) return;

      unregisterPlayerSocket(identity.playerId, socket.id);
      // Another tab or a fresh reconnect may still hold this seat.
      if ((playerSockets.get(identity.playerId)?.size ?? 0) > 0) return;

      const entry = store.byId(identity.gameId);
      if (!entry) return;

      const result = disconnectPlayer(entry.session, identity.playerId, now());
      if (!result.ok) return;

      logger.debug('Player disconnected', { playerId: identity.playerId, reason });
      commit(result.session, result.events);
    });
  });

  function registerPlayerSocket(playerId: PlayerId, socketId: string): void {
    const existing = playerSockets.get(playerId) ?? new Set<string>();
    existing.add(socketId);
    playerSockets.set(playerId, existing);
  }

  function unregisterPlayerSocket(playerId: PlayerId, socketId: string): void {
    const existing = playerSockets.get(playerId);
    if (!existing) return;
    existing.delete(socketId);
    if (existing.size === 0) playerSockets.delete(playerId);
  }

  /**
   * Re-homes a moved player's sockets, including any extra tab they have open.
   * Without this their phone would keep receiving the old team's messages, since
   * team rooms are what scope per-team delivery.
   */
  function movePlayerSockets(
    gameId: GameId,
    playerId: PlayerId,
    from: TeamId,
    to: TeamId,
  ): void {
    for (const socketId of playerSockets.get(playerId) ?? []) {
      const target = io.in(socketId);
      void target.socketsLeave(rooms.team(gameId, from));
      void target.socketsJoin(rooms.team(gameId, to));

      const identity = identities.get(socketId);
      if (identity) identities.set(socketId, { ...identity, teamId: to });
    }
  }

  /** Resolves and authorises the calling socket as a seated player. */
  function requirePlayer(
    socket: GameSocket,
    ack?: (res: Ack<never>) => void,
  ): { session: GameSession; playerId: PlayerId; identity: SocketIdentity } | null {
    const identity = identities.get(socket.id);
    if (!identity) {
      ack?.(fail('You have not joined a game.', 'not_a_player'));
      return null;
    }
    const entry = store.byId(identity.gameId);
    if (!entry) {
      ack?.(fail('That game no longer exists.', 'no_such_game'));
      return null;
    }
    const authorised = authorisePlayer(entry.session, identity);
    if (!authorised.ok) {
      ack?.(fail(authorised.error, 'not_a_player'));
      return null;
    }
    return { session: entry.session, playerId: authorised.playerId, identity };
  }

  /** Resolves and authorises the calling socket as the host, by token. */
  function requireHost(
    socket: GameSocket,
    raw: unknown,
    ack?: (res: Ack<never>) => void,
  ): { session: GameSession; identity: SocketIdentity } | null {
    const parsed = hostActionSchema.safeParse(raw);
    if (!parsed.success) {
      ack?.(fail('Missing host credentials.', 'not_host'));
      return null;
    }
    const identity = identities.get(socket.id);
    if (!identity) {
      ack?.(fail('You are not connected to a game.', 'not_host'));
      return null;
    }
    const entry = store.byId(identity.gameId);
    if (!entry) {
      ack?.(fail('That game no longer exists.', 'no_such_game'));
      return null;
    }
    const authorised = authoriseHost(entry.session, identity, parsed.data.hostToken);
    if (!authorised.ok) {
      ack?.(fail(authorised.error, 'not_host'));
      return null;
    }
    return { session: entry.session, identity };
  }

  const reaper = setInterval(() => {
    const removed = store.reap(now(), config.sessionTtlMs);
    for (const gameId of removed) {
      timers.cancel(gameId);
      logger.info('Reaped abandoned game', { gameId });
    }
  }, 60_000);
  reaper.unref?.();

  return {
    io,
    store,
    async close() {
      clearInterval(reaper);
      timers.cancelAll();
      await io.close();
    },
  };
}

export type { GameId };
