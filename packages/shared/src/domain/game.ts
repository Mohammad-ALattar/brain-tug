import type { QuestionAssignment } from '../content/dealer.js';
import type { ContentConfig } from '../content/source.js';
import type { PublicQuestion, Question } from '../content/question.js';
import type { GameModeId } from '../modes/types.js';
import type { PlayerId, QuestionId } from './ids.js';
import type { TeamId } from './team.js';

/**
 * `countdown` is the "get ready" beat between the host pressing start and the
 * first question appearing. `paused` freezes the round clock without discarding it.
 */
export const GAME_STATUSES = ['lobby', 'countdown', 'active', 'paused', 'finished'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

/** Host-chosen match settings, fixed once the game starts. */
export type GameConfig = {
  /** Which game is being played. The mode owns the rules that differ. */
  mode: GameModeId;
  /** What the questions are about, independent of the mode. */
  content: ContentConfig;
  totalQuestions: number;
  /** Seconds allowed per round. */
  secondsPerQuestion: number;
  /** Length of the "get ready" beat before the first question, in milliseconds. */
  countdownMs: number;
  teamNames: Record<TeamId, string>;
  /** Label under the question counter, e.g. `Science - Brain Race`. */
  roundLabel: string;
  /** Brain Race: finishers needed to win. Defaults from roster at start. */
  finishersRequiredPerTeam?: number;
};

/**
 * Per-team state within a round.
 *
 * Both teams always have an entry, even when the mode deals one shared question
 * to the whole class: in that case both entries hold the same `Question`, and
 * `Round.assignment` records which it was. Keeping the shape uniform is what
 * lets attempt tracking, draft mirroring and round closing stay mode-agnostic.
 */
export type RoundTeamState = {
  question: Question;
  /**
   * True once this team is closed out of the round. Only modes that lock on a
   * correct answer ever set it; a race leaves it false so every student's
   * answer still counts.
   */
  locked: boolean;
  lockedByPlayerId: PlayerId | null;
  lockedAt: number | null;
  /** Players who have spent their single attempt this round. */
  attemptedPlayerIds: PlayerId[];
  /**
   * Live in-progress input from the most recent player to type, relayed to the
   * classroom display only so the TV keypad can mirror it. Only ever set for
   * typed-answer questions.
   */
  draft: AnswerDraft | null;
};

export type AnswerDraft = {
  playerId: PlayerId;
  /** Characters typed so far, as a string to preserve leading zeroes. */
  value: string;
  updatedAt: number;
};

export type Round = {
  /** Zero-based; the reference header shows `index + 1` of `totalQuestions`. */
  index: number;
  startedAt: number;
  /** Absolute server timestamp the round expires. Clients count down to this. */
  endsAt: number;
  /** How this round's questions were dealt, which decides what is safe to publish. */
  assignment: QuestionAssignment;
  teams: Record<TeamId, RoundTeamState>;
  /** Set when the round closed, for any reason. */
  resolvedAt: number | null;
};

/** Round projection sent to clients: questions with the answers stripped. */
export type PublicRound = {
  index: number;
  startedAt: number;
  endsAt: number;
  assignment: QuestionAssignment;
  teams: Record<TeamId, PublicRoundTeamState>;
};

export type PublicRoundTeamState = {
  question: PublicQuestion;
  locked: boolean;
  lockedByPlayerId: PlayerId | null;
  attemptedPlayerIds: PlayerId[];
  /**
   * The answer this team locked in, or null while the round is still open.
   *
   * Published only for `per_team` rounds, where the two teams hold different
   * questions and one team's answer tells the other nothing. Under a shared
   * question this stays null however the round is going, because publishing it
   * would hand the answer to everyone still typing.
   */
  revealedAnswer: string | null;
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
