import type { Server, Socket } from 'socket.io';
import {
  toGameStateView,
  type ClientToServerEvents,
  type EngineEvent,
  type GameSession,
  type PlayerId,
  type ServerToClientEvents,
} from '@braintug/shared';
import { rooms } from './rooms.js';

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Engine events that describe a structural change, after which clients are also
 * sent a fresh compact state snapshot.
 *
 * Deliberately excludes `progress_applied`, `answer_result` and `draft_updated`:
 * those are the high-frequency gameplay events, and each carries everything a
 * client needs, so a full snapshot per answer would be wasted bandwidth.
 */
const STRUCTURAL_EVENTS = new Set<EngineEvent['type']>([
  'player_joined',
  'player_left',
  'player_reconnected',
  'team_joined',
  'countdown_started',
  'question_started',
  'round_resolved',
  'game_paused',
  'game_resumed',
  'game_finished',
  'state_changed',
]);

/**
 * Routes engine events to their correct audience.
 *
 * `playerSocketsById` lets an outcome be delivered privately to the one player
 * who submitted, rather than to their team or the room.
 */
export function dispatchEvents(
  io: GameServer,
  session: GameSession,
  events: EngineEvent[],
  playerSocketsById: Map<PlayerId, Set<string>>,
): void {
  const gameId = session.gameId;
  let needsSnapshot = false;

  for (const event of events) {
    if (STRUCTURAL_EVENTS.has(event.type)) needsSnapshot = true;

    switch (event.type) {
      case 'player_joined':
        io.to(rooms.game(gameId)).emit('player_joined', { player: event.player });
        break;

      case 'player_left':
        io.to(rooms.game(gameId)).emit('player_left', {
          playerId: event.playerId,
          teamId: event.teamId,
        });
        break;

      case 'player_reconnected':
        io.to(rooms.game(gameId)).emit('player_reconnected', { playerId: event.playerId });
        break;

      case 'team_joined':
        io.to(rooms.game(gameId)).emit('team_joined', {
          playerId: event.playerId,
          teamId: event.teamId,
        });
        break;

      case 'countdown_started':
        io.to(rooms.game(gameId)).emit('countdown_started', { endsAt: event.endsAt });
        break;

      case 'question_started':
        // Both teams' prompts go to everyone because the classroom display shows
        // both by design. Knowing the other team's prompt confers no advantage:
        // answering it is refused as a stale question.
        io.to(rooms.game(gameId)).emit('question_started', { round: event.round });
        break;

      case 'answer_result': {
        // Private to the submitter. Sending this to the room would leak the
        // correct answer to every other student the moment one of them is wrong.
        for (const socketId of playerSocketsById.get(event.playerId) ?? []) {
          io.to(socketId).emit('answer_result', {
            playerId: event.playerId,
            teamId: event.teamId,
            outcome: event.outcome,
          });
        }
        break;
      }

      case 'progress_applied':
        io.to(rooms.game(gameId)).emit('progress_applied', {
          teamId: event.teamId,
          playerId: event.playerId,
          gain: event.gain,
          streak: event.streak,
          score: event.score,
          modeState: event.modeState,
        });
        break;

      case 'draft_updated':
        // Only the classroom display mirrors in-progress typing.
        io.to(rooms.arena(gameId)).emit('draft_updated', {
          teamId: event.teamId,
          draft: event.draft,
        });
        break;

      case 'round_resolved':
        io.to(rooms.game(gameId)).emit('round_resolved', {
          index: event.index,
          reason: event.reason,
          nextRoundAt: event.nextRoundAt,
          revealed: event.revealed,
        });
        if (event.reason === 'skipped') {
          io.to(rooms.game(gameId)).emit('question_skipped', { index: event.index });
        }
        break;

      case 'game_paused':
        io.to(rooms.game(gameId)).emit('game_paused', { remainingMs: event.remainingMs });
        break;

      case 'game_resumed':
        io.to(rooms.game(gameId)).emit('game_resumed', { endsAt: event.endsAt });
        break;

      case 'game_finished':
        io.to(rooms.game(gameId)).emit('game_finished', {
          result: event.result,
          state: toGameStateView(session),
        });
        break;

      case 'state_changed':
        break;
    }
  }

  if (needsSnapshot) {
    io.to(rooms.game(gameId)).emit('game_state_updated', { state: toGameStateView(session) });
  }
}
