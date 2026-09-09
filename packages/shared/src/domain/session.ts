import { revealAnswer } from '../content/answer.js';
import { toPublicQuestion } from '../content/question.js';
import type { GameMode, ModeState } from '../modes/types.js';
import { GAME_MODE } from '../modes/registry.js';
import type { AnswerRecord } from './answer.js';
import type { GameConfig, GameStatus, PublicRound, Round } from './game.js';
import type { GameId, HostToken, PlayerId, PlayerToken, RoomCode } from './ids.js';
import type { Player } from './player.js';
import type { GameResult } from './result.js';
import type { GameRules } from '../rules/rules.js';
import type { Team, TeamId } from './team.js';

/**
 * The authoritative game record. This shape never leaves the server: it holds
 * question answers, the host secret and the player token table. Clients receive
 * `GameStateView` instead.
 */
export type GameSession = {
  gameId: GameId;
  roomCode: RoomCode;
  hostToken: HostToken;
  status: GameStatus;
  config: GameConfig;
  rules: GameRules;
  /**
   * Everything specific to the mode being played: the rope in a tug of war, the
   * lanes in a race. Its `kind` always matches `config.mode`.
   */
  modeState: ModeState;
  teams: Record<TeamId, Team>;
  players: Record<PlayerId, Player>;
  /** Token -> player, so a reconnecting student reclaims their existing seat. */
  playerTokens: Record<PlayerToken, PlayerId>;
  /** The in-flight round, or null in lobby/countdown/finished. */
  round: Round | null;
  /** Zero-based index of the current round. */
  currentQuestionIndex: number;
  totalQuestions: number;
  winner: TeamId | 'draw' | null;
  /** Every submission, for the teacher's post-match review. */
  answers: AnswerRecord[];
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  /** While paused, the round's remaining milliseconds are frozen here. */
  pausedRemainingMs: number | null;
  /** Absolute time the pre-game countdown ends. */
  countdownEndsAt: number | null;
  /** Absolute time the next round should begin, during the inter-round beat. */
  nextRoundAt: number | null;
  /**
   * The final summary, once the game has finished, and null before that.
   *
   * Kept on the session rather than existing only as a `game_finished` event so
   * that reattaching after the match still yields it. A student whose phone
   * slept, a teacher who reloaded the dashboard, or a projector opened late
   * would otherwise be stuck looking at a finished game with no scores.
   */
  result: GameResult | null;
};

/** The mode a session is being played under. */
export function modeOf(session: GameSession): GameMode {
  return GAME_MODE[session.config.mode];
}

/** Player projection safe to broadcast: no tokens. */
export type PublicPlayer = {
  id: PlayerId;
  name: string;
  teamId: TeamId;
  connected: boolean;
  correctCount: number;
  incorrectCount: number;
  contribution: number;
  streak: number;
};

/**
 * The compact state broadcast to clients. Deliberately excludes question
 * answers, the host token and the token table, and carries `roundEndsAt` as an
 * absolute server timestamp instead of a countdown so no per-tick broadcast is
 * needed (see `timeRemainingMs`).
 */
export type GameStateView = {
  gameId: GameId;
  roomCode: RoomCode;
  status: GameStatus;
  config: GameConfig;
  rules: GameRules;
  modeState: ModeState;
  teams: Record<TeamId, Team>;
  players: PublicPlayer[];
  /** One question per team, or null outside an active round. */
  currentQuestion: Record<TeamId, PublicRound['teams'][TeamId]['question']> | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  /** Absolute server time the round ends. Clients count down locally to this. */
  roundEndsAt: number | null;
  /** Frozen remaining milliseconds while paused. */
  pausedRemainingMs: number | null;
  countdownEndsAt: number | null;
  nextRoundAt: number | null;
  round: PublicRound | null;
  winner: TeamId | 'draw' | null;
};

export function toPublicPlayer(player: Player): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    teamId: player.teamId,
    connected: player.connected,
    correctCount: player.correctCount,
    incorrectCount: player.incorrectCount,
    contribution: player.contribution,
    streak: player.streak,
  };
}

export function toPublicRound(round: Round): PublicRound {
  return {
    index: round.index,
    startedAt: round.startedAt,
    endsAt: round.endsAt,
    assignment: round.assignment,
    teams: {
      blue: publicRoundTeam(round, 'blue'),
      red: publicRoundTeam(round, 'red'),
    },
  };
}

function publicRoundTeam(round: Round, teamId: TeamId): PublicRound['teams'][TeamId] {
  const team = round.teams[teamId];
  // Showing a locked team's answer on the classroom display is safe only when
  // the two teams hold different questions. Under a shared question it would
  // tell everyone still typing exactly what to type.
  const canReveal = round.assignment === 'per_team' && team.locked;

  return {
    question: toPublicQuestion(team.question),
    locked: team.locked,
    lockedByPlayerId: team.lockedByPlayerId,
    attemptedPlayerIds: [...team.attemptedPlayerIds],
    revealedAnswer: canReveal ? revealAnswer(team.question) : null,
  };
}

/**
 * Builds the broadcast projection. This is the only path from `GameSession` to
 * the wire, which is what makes the answer-redaction guarantee enforceable.
 */
export function toGameStateView(session: GameSession): GameStateView {
  const round = session.round ? toPublicRound(session.round) : null;

  return {
    gameId: session.gameId,
    roomCode: session.roomCode,
    status: session.status,
    config: session.config,
    rules: session.rules,
    modeState: session.modeState,
    teams: session.teams,
    players: Object.values(session.players).map(toPublicPlayer),
    currentQuestion: round ? { blue: round.teams.blue.question, red: round.teams.red.question } : null,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: session.totalQuestions,
    roundEndsAt: session.round?.endsAt ?? null,
    pausedRemainingMs: session.pausedRemainingMs,
    countdownEndsAt: session.countdownEndsAt,
    nextRoundAt: session.nextRoundAt,
    round,
    winner: session.winner,
  };
}

/**
 * Milliseconds left in the round. Derived on the client from `roundEndsAt` and
 * the locally-estimated server clock, so it costs no bandwidth.
 */
export function timeRemainingMs(view: GameStateView, now: number): number {
  if (view.status === 'paused') return view.pausedRemainingMs ?? 0;
  if (view.roundEndsAt === null) return 0;
  return Math.max(0, view.roundEndsAt - now);
}
