import type { Difficulty } from '../content/question.js';
import type { GameRules } from './rules.js';

/**
 * Highest streak tier reached at `streak`. Tiers are declared ascending but this
 * does not rely on that, so rule authors can reorder them safely.
 */
export function streakTier(rules: GameRules, streak: number): { multiplier: number; label: string } {
  let best = { multiplier: 1, label: 'Steady' };
  let bestAt = -1;
  for (const tier of rules.streakTiers) {
    if (streak >= tier.atStreak && tier.atStreak > bestAt) {
      best = { multiplier: tier.multiplier, label: tier.label };
      bestAt = tier.atStreak;
    }
  }
  return best;
}

export function streakMultiplier(rules: GameRules, streak: number): number {
  return streakTier(rules, streak).multiplier;
}

/**
 * How many tiers deep a streak has reached, `0` being the base tier.
 *
 * The presentation layer escalates its visual treatment by this index, so the
 * number of visual tiers follows the rules automatically rather than being
 * hard-coded next to them and drifting.
 */
export function streakTierIndex(rules: GameRules, streak: number): number {
  const thresholds = rules.streakTiers
    .map((tier) => tier.atStreak)
    .sort((a, b) => a - b);
  let index = 0;
  for (const atStreak of thresholds) {
    if (streak >= atStreak) index += 1;
  }
  return Math.max(0, index - 1);
}

/**
 * Answering instantly earns `maxSpeedBonus`, decaying linearly to 1 by the end of
 * the bonus window. Answers after the window earn no bonus.
 */
export function speedBonus(rules: GameRules, elapsedMs: number, roundDurationMs: number): number {
  if (roundDurationMs <= 0) return 1;
  const windowMs = roundDurationMs * rules.speedBonusWindowFraction;
  if (windowMs <= 0) return 1;
  const clampedElapsed = Math.max(0, elapsedMs);
  if (clampedElapsed >= windowMs) return 1;
  const remainingFraction = 1 - clampedElapsed / windowMs;
  return 1 + (rules.maxSpeedBonus - 1) * remainingFraction;
}

export type GainBreakdown = {
  baseGain: number;
  difficultyWeight: number;
  speedBonus: number;
  streakMultiplier: number;
  /** Final progress won, as a fraction of the span, after the single-answer cap. */
  gain: number;
  /** True when `maxSingleGain` clipped the result. */
  capped: boolean;
};

/**
 * Progress won by one correct answer, as a fraction of whatever span the game
 * mode is measuring: rope travel in a tug of war, track distance in a race.
 * Both modes share this so a streak or a fast answer is worth the same
 * proportion of the game whichever one the class is playing.
 *
 * `streak` is the streak *before* this answer is counted, so the first correct
 * answer of a run is unmultiplied.
 */
export function computeGain(
  rules: GameRules,
  args: { difficulty: Difficulty; elapsedMs: number; roundDurationMs: number; streak: number },
): GainBreakdown {
  const difficultyWeight = rules.difficultyWeight[args.difficulty];
  const speed = speedBonus(rules, args.elapsedMs, args.roundDurationMs);
  const streakMult = streakMultiplier(rules, args.streak);
  const raw = rules.baseGain * difficultyWeight * speed * streakMult;
  const gain = Math.min(raw, rules.maxSingleGain);

  return {
    baseGain: rules.baseGain,
    difficultyWeight,
    speedBonus: speed,
    streakMultiplier: streakMult,
    gain,
    capped: gain < raw,
  };
}
