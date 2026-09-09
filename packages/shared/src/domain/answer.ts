import type { PlayerId, QuestionId } from './ids.js';
import type { TeamId } from './team.js';

/** Why a submission was refused. Drives the student's feedback message. */
export const REJECTION_REASONS = [
  'game_not_active',
  'game_paused',
  'round_not_active',
  'stale_question',
  'team_already_locked',
  'player_already_answered',
  'time_expired',
  'malformed_answer',
  'not_a_player',
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

export type AnswerRecord = {
  playerId: PlayerId;
  teamId: TeamId;
  questionId: QuestionId;
  questionIndex: number;
  /**
   * What the student submitted, normalised for its question type: an option id,
   * `"true"`/`"false"`, or the typed value. Kept for the teacher's review and
   * for the per-option tally shown once a round resolves.
   */
  value: string;
  correct: boolean;
  /** Milliseconds from question start to submission, measured server-side. */
  elapsedMs: number;
  submittedAt: number;
};

/**
 * Outcome of a submission, returned directly to the submitting player.
 *
 * Note what an `incorrect` outcome does *not* carry: the correct answer. Their
 * team-mates may still be answering the same question, so the answer is held
 * back until the round resolves and released to everyone at once.
 */
export type AnswerOutcome =
  | {
      status: 'correct';
      questionId: QuestionId;
      /** Progress this answer won, as a fraction of the mode's full span. */
      gain: number;
      /** Points added to the team score. */
      points: number;
      /** Streak after this answer: team streak in Tug of War, player streak in Brain Race. */
      streak: number;
      elapsedMs: number;
    }
  | {
      status: 'incorrect';
      questionId: QuestionId;
      elapsedMs: number;
    }
  | {
      status: 'rejected';
      reason: RejectionReason;
    };
