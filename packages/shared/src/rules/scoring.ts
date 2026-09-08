import type { Difficulty } from '../domain/question.js';
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

export type PullBreakdown = {
  basePull: number;
  difficultyWeight: number;
  speedBonus: number;
  streakMultiplier: number;
  /** Final rope distance, after the single-pull cap. */
  pull: number;
  /** True when `maxSinglePull` clipped the result. */
  capped: boolean;
};

/**
 * Rope distance won by one correct answer. `streak` is the streak *before* this
 * answer is counted, so the first correct answer of a run is unmultiplied.
 */
export function computePull(
  rules: GameRules,
  args: { difficulty: Difficulty; elapsedMs: number; roundDurationMs: number; streak: number },
): PullBreakdown {
  const difficultyWeight = rules.difficultyWeight[args.difficulty];
  const speed = speedBonus(rules, args.elapsedMs, args.roundDurationMs);
  const streakMult = streakMultiplier(rules, args.streak);
  const raw = rules.basePull * difficultyWeight * speed * streakMult;
  const pull = Math.min(raw, rules.maxSinglePull);

  return {
    basePull: rules.basePull,
    difficultyWeight,
    speedBonus: speed,
    streakMultiplier: streakMult,
    pull,
    capped: pull < raw,
  };
}
