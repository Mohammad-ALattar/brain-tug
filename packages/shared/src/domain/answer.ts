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
  /** Exactly what the student submitted, kept for the teacher's review. */
  value: number;
  correct: boolean;
  /** Milliseconds from question start to submission, measured server-side. */
  elapsedMs: number;
  submittedAt: number;
};

/** Outcome of a submission, returned directly to the submitting player. */
export type AnswerOutcome =
  | {
      status: 'correct';
      questionId: QuestionId;
      /** Rope distance this answer won, in normalised units. */
      pull: number;
      /** Points added to the team score. */
      points: number;
      /** Team streak after this answer. */
      streak: number;
      elapsedMs: number;
    }
  | {
      status: 'incorrect';
      questionId: QuestionId;
      /** Revealed only after the player has spent their attempt. */
      correctAnswer: number;
      elapsedMs: number;
    }
  | {
      status: 'rejected';
      reason: RejectionReason;
    };
