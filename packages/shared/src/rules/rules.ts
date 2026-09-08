import type { Difficulty } from '../domain/question.js';

/**
 * Every tunable number in the game lives here so the rules can be reasoned about
 * and tested in one place rather than being scattered through the engine.
 */
export type GameRules = {
  /** Rope distance a baseline correct answer wins, in normalised units. */
  basePull: number;
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
  /** `|ropePosition|` at which a team wins outright. */
  winThreshold: number;
  /** Half-width of the arena in metres, purely for display labels. */
  arenaHalfMetres: number;
  /**
   * A single pull is capped at this fraction of the full rope so one lucky
   * answer can never end the match outright.
   */
  maxSinglePull: number;
};

export const DEFAULT_RULES: GameRules = {
  basePull: 0.055,
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
  arenaHalfMetres: 4,
  maxSinglePull: 0.25,
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
