import type { AnswerOutcome } from '../domain/answer.js';
import type { AnswerDraft, PublicRound } from '../domain/game.js';
import type { GameId, HostToken, PlayerId, PlayerToken, RoomCode } from '../domain/ids.js';
import type { GameResult } from '../domain/result.js';
import type { GameStateView, PublicPlayer } from '../domain/session.js';
import type { TeamId } from '../domain/team.js';
import type { ModeState } from '../modes/types.js';
import type { RoundResolution } from '../engine/types.js';
import type {
  AnswerDraftPayload,
  ClockSyncPayload,
  CreateGamePayload,
  HostActionPayload,
  JoinGamePayload,
  MovePlayerPayload,
  RejoinGamePayload,
  RejoinHostPayload,
  RemovePlayerPayload,
  SubmitAnswerPayload,
  SwitchTeamPayload,
  WatchArenaPayload,
} from './schemas.js';

/** Standard envelope for every acknowledged command. */
export type Ack<T> = { ok: true; data: T } | { ok: false; error: string; reason?: string };

export type CreateGameAck = {
  gameId: GameId;
  roomCode: RoomCode;
  /** The host secret. Returned only here, only to the creator. */
  hostToken: HostToken;
  state: GameStateView;
};

export type JoinGameAck = {
  gameId: GameId;
  roomCode: RoomCode;
  playerId: PlayerId;
  /** The player secret, used to reclaim this seat after a reconnect. */
  playerToken: PlayerToken;
  teamId: TeamId;
  state: GameStateView;
  /**
   * The final summary when attaching to a game that has already finished.
   *
   * Every attach ack carries this, because `game_finished` fires once and a
   * client that was not connected at that instant would otherwise see a
   * finished match with nothing to show for it.
   */
  result: GameResult | null;
};

/**
 * Returned when the host reattaches. Deliberately does not re-issue the host
 * token: the caller already had to present it to get here.
 */
export type HostAttachAck = {
  gameId: GameId;
  roomCode: RoomCode;
  state: GameStateView;
  result: GameResult | null;
};

export type WatchArenaAck = {
  gameId: GameId;
  roomCode: RoomCode;
  state: GameStateView;
  /** True when a valid host token was supplied. */
  isHost: boolean;
  result: GameResult | null;
};

export type ClockSyncAck = {
  /** Echoed so the client can measure round-trip time. */
  clientSentAt: number;
  serverTime: number;
};

/**
 * Payload map for events the server pushes. Kept deliberately small: state
 * updates carry the compact `GameStateView`, and richer per-event data (a
 * progress delta, an answer outcome) travels separately so the arena can
 * animate without re-reading the whole state.
 */
export type ServerToClientEvents = {
  player_joined: (payload: { player: PublicPlayer }) => void;
  player_left: (payload: { playerId: PlayerId; teamId: TeamId }) => void;
  player_reconnected: (payload: { playerId: PlayerId }) => void;
  team_joined: (payload: { playerId: PlayerId; teamId: TeamId }) => void;
  countdown_started: (payload: { endsAt: number }) => void;
  question_started: (payload: { round: PublicRound }) => void;
  /** Sent only to the submitting player. */
  answer_result: (payload: { playerId: PlayerId; teamId: TeamId; outcome: AnswerOutcome }) => void;
  progress_applied: (payload: {
    teamId: TeamId;
    playerId: PlayerId;
    gain: number;
    streak: number;
    score: number;
    modeState: ModeState;
  }) => void;
  /** Sent only to the classroom display, for the mirrored keypad. */
  draft_updated: (payload: { teamId: TeamId; draft: AnswerDraft }) => void;
  round_resolved: (payload: {
    index: number;
    reason: RoundResolution;
    nextRoundAt: number | null;
    revealed: Record<TeamId, string>;
  }) => void;
  game_state_updated: (payload: { state: GameStateView }) => void;
  game_paused: (payload: { remainingMs: number }) => void;
  game_resumed: (payload: { endsAt: number }) => void;
  question_skipped: (payload: { index: number }) => void;
  game_finished: (payload: { result: GameResult; state: GameStateView }) => void;
  game_error: (payload: { message: string; reason?: string }) => void;
};

/** Payload map for commands clients send, with their acknowledgement shapes. */
export type ClientToServerEvents = {
  create_game: (payload: CreateGamePayload, ack: (res: Ack<CreateGameAck>) => void) => void;
  join_game: (payload: JoinGamePayload, ack: (res: Ack<JoinGameAck>) => void) => void;
  rejoin_game: (payload: RejoinGamePayload, ack: (res: Ack<JoinGameAck>) => void) => void;
  rejoin_host: (payload: RejoinHostPayload, ack: (res: Ack<HostAttachAck>) => void) => void;
  watch_arena: (payload: WatchArenaPayload, ack: (res: Ack<WatchArenaAck>) => void) => void;
  switch_team: (payload: SwitchTeamPayload, ack: (res: Ack<null>) => void) => void;
  start_game: (payload: HostActionPayload, ack: (res: Ack<null>) => void) => void;
  submit_answer: (payload: SubmitAnswerPayload, ack: (res: Ack<AnswerOutcome>) => void) => void;
  answer_draft: (payload: AnswerDraftPayload) => void;
  pause_game: (payload: HostActionPayload, ack: (res: Ack<null>) => void) => void;
  resume_game: (payload: HostActionPayload, ack: (res: Ack<null>) => void) => void;
  skip_question: (payload: HostActionPayload, ack: (res: Ack<null>) => void) => void;
  end_game: (payload: HostActionPayload, ack: (res: Ack<null>) => void) => void;
  remove_player: (payload: RemovePlayerPayload, ack: (res: Ack<null>) => void) => void;
  move_player: (payload: MovePlayerPayload, ack: (res: Ack<null>) => void) => void;
  clock_sync: (payload: ClockSyncPayload, ack: (res: Ack<ClockSyncAck>) => void) => void;
};
