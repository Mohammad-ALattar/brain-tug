import type { Difficulty } from '../content/question.js';

/**
 * Every tunable number shared by all game modes lives here so the rules can be
 * reasoned about and tested in one place rather than being scattered through
 * the engine. Mode-specific dimensions (how long a rope is, how long a race
 * track is) live on the mode's own state instead.
 */
export type GameRules = {
  /** Progress a baseline correct answer earns, as a fraction of the full span. */
  baseGain: number;
  /** Multiplier applied per difficulty. */
  difficultyWeight: Record<Difficulty, number>;
  /**
   * A correct answer in the first `speedBonusWindowFraction` of the round earns
   * up to `maxSpeedBonus`; the bonus decays linearly to 1 across that window.
   */
  maxSpeedBonus: number;
  speedBonusWindowFraction: number;
  /** Streak length -> multiplier, applied as the highest tier reached. */
  streakTiers: { atStreak: number; multiplier: number; label: string }[];
  /** Points added to the team score per correct answer. */
  pointsPerCorrect: number;
  /**
   * How much progress wins the match outright, as a fraction of the span. Read
   * by tug of war as `|ropePosition|` and by brain race as distance travelled.
   */
  winThreshold: number;
  /**
   * A single answer is capped at this fraction of the full span so one lucky
   * answer can never end the match outright.
   */
  maxSingleGain: number;
};

export const DEFAULT_RULES: GameRules = {
  baseGain: 0.055,
  difficultyWeight: { easy: 1, medium: 1.25, hard: 1.6 },
  maxSpeedBonus: 1.5,
  speedBonusWindowFraction: 0.5,
  streakTiers: [
    { atStreak: 0, multiplier: 1, label: 'Steady' },
    { atStreak: 3, multiplier: 1.25, label: 'Streak 3x' },
    { atStreak: 5, multiplier: 1.5, label: 'Full force' },
    { atStreak: 8, multiplier: 1.75, label: 'Unstoppable' },
  ],
  pointsPerCorrect: 1,
  winThreshold: 1,
  maxSingleGain: 0.25,
};

export const DEFAULT_SECONDS_PER_QUESTION = 20;
export const DEFAULT_TOTAL_QUESTIONS = 20;
/** Default length of the "get ready" beat before the first question. */
export const COUNTDOWN_MS = 3000;
export const MIN_COUNTDOWN_MS = 0;
export const MAX_COUNTDOWN_MS = 15_000;
/** Pause between a round resolving and the next question appearing. */
export const INTER_ROUND_MS = 1200;

export const MIN_TOTAL_QUESTIONS = 1;
export const MAX_TOTAL_QUESTIONS = 100;
export const MIN_SECONDS_PER_QUESTION = 5;
export const MAX_SECONDS_PER_QUESTION = 120;
