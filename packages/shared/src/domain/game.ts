import type { PlayerId, QuestionId } from './ids.js';
import type { Question, PublicQuestion, OperationChoice, Difficulty } from './question.js';
import type { TeamId } from './team.js';

/**
 * `countdown` is the "get ready" beat between the host pressing start and the
 * first question appearing. `paused` freezes the round clock without discarding it.
 */
export const GAME_STATUSES = ['lobby', 'countdown', 'active', 'paused', 'finished'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

/** Host-chosen match settings, fixed once the game starts. */
export type GameConfig = {
  operation: OperationChoice;
  difficulty: Difficulty;
  totalQuestions: number;
  /** Seconds allowed per round. */
  secondsPerQuestion: number;
  /** Length of the "get ready" beat before the first question, in milliseconds. */
  countdownMs: number;
  teamNames: Record<TeamId, string>;
  /** Label under the question counter, e.g. `Round 1 - Multiplication drill`. */
  roundLabel: string;
};

/**
 * Per-team state within a round. Each team gets its own question (confirmed from
 * the reference, where the two panels show different problems), but both teams
 * share the round index and clock.
 */
export type RoundTeamState = {
  question: Question;
  /** True once this team has answered correctly; they are done for the round. */
  locked: boolean;
  lockedByPlayerId: PlayerId | null;
  lockedAt: number | null;
  /** Players who have spent their single attempt this round. */
  attemptedPlayerIds: PlayerId[];
  /**
   * Live in-progress input from the most recent player to type, relayed to the
   * classroom display only so the TV keypad can mirror it.
   */
  draft: AnswerDraft | null;
};

export type AnswerDraft = {
  playerId: PlayerId;
  /** Digits typed so far, as a string to preserve leading zeroes while typing. */
  value: string;
  updatedAt: number;
};

export type Round = {
  /** Zero-based; the reference header shows `index + 1` of `totalQuestions`. */
  index: number;
  startedAt: number;
  /** Absolute server timestamp the round expires. Clients count down to this. */
  endsAt: number;
  teams: Record<TeamId, RoundTeamState>;
  /** Set when both teams locked or the clock expired. */
  resolvedAt: number | null;
};

/** Round projection sent to clients: questions with the answers stripped. */
export type PublicRound = {
  index: number;
  startedAt: number;
  endsAt: number;
  teams: Record<TeamId, PublicRoundTeamState>;
};

export type PublicRoundTeamState = {
  question: PublicQuestion;
  locked: boolean;
  lockedByPlayerId: PlayerId | null;
  attemptedPlayerIds: PlayerId[];
  /**
   * The value this team locked in, or null while they are still answering.
   *
   * Safe to publish because the two teams always hold different questions, so
   * one team's locked value tells the other nothing. This is what lets the
   * classroom display show `[20]` once a team is confirmed, while in-progress
   * typing stays masked.
   */
  lockedValue: number | null;
};

export function isRoundResolved(round: Round): boolean {
  return round.resolvedAt !== null;
}

export function bothTeamsLocked(round: Round): boolean {
  return round.teams.blue.locked && round.teams.red.locked;
}

export function questionIdFor(round: Round, teamId: TeamId): QuestionId {
  return round.teams[teamId].question.id;
}
