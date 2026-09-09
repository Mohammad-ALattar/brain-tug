import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, type GameRules } from './rules.js';
import {
  computeGain,
  speedBonus,
  streakMultiplier,
  streakTier,
  streakTierIndex,
} from './scoring.js';

const ROUND_MS = 20_000;

describe('streakTier', () => {
  it('starts unmultiplied', () => {
    expect(streakMultiplier(DEFAULT_RULES, 0)).toBe(1);
    expect(streakMultiplier(DEFAULT_RULES, 1)).toBe(1);
    expect(streakMultiplier(DEFAULT_RULES, 2)).toBe(1);
  });

  it('steps up at each configured tier', () => {
    expect(streakMultiplier(DEFAULT_RULES, 3)).toBe(1.25);
    expect(streakMultiplier(DEFAULT_RULES, 4)).toBe(1.25);
    expect(streakMultiplier(DEFAULT_RULES, 5)).toBe(1.5);
    expect(streakMultiplier(DEFAULT_RULES, 7)).toBe(1.5);
    expect(streakMultiplier(DEFAULT_RULES, 8)).toBe(1.75);
  });

  it('holds the top tier for arbitrarily long streaks', () => {
    expect(streakMultiplier(DEFAULT_RULES, 500)).toBe(1.75);
  });

  it('exposes the tier label the arena displays', () => {
    expect(streakTier(DEFAULT_RULES, 5).label).toBe('Full force');
    expect(streakTier(DEFAULT_RULES, 3).label).toBe('Streak 3x');
  });
});

describe('streakTierIndex', () => {
  it('numbers the tiers from zero so the arena can escalate its visuals', () => {
    expect(streakTierIndex(DEFAULT_RULES, 0)).toBe(0);
    expect(streakTierIndex(DEFAULT_RULES, 2)).toBe(0);
    expect(streakTierIndex(DEFAULT_RULES, 3)).toBe(1);
    expect(streakTierIndex(DEFAULT_RULES, 5)).toBe(2);
    expect(streakTierIndex(DEFAULT_RULES, 8)).toBe(3);
  });

  it('caps at the deepest configured tier', () => {
    expect(streakTierIndex(DEFAULT_RULES, 500)).toBe(DEFAULT_RULES.streakTiers.length - 1);
  });

  it('follows the rules rather than a hard-coded count', () => {
    const twoTiers: GameRules = {
      ...DEFAULT_RULES,
      streakTiers: [
        { atStreak: 0, multiplier: 1, label: 'Steady' },
        { atStreak: 4, multiplier: 2, label: 'Heave' },
      ],
    };

    expect(streakTierIndex(twoTiers, 3)).toBe(0);
    expect(streakTierIndex(twoTiers, 99)).toBe(1);
  });

  it('picks the highest matching tier regardless of declaration order', () => {
    const shuffled: GameRules = {
      ...DEFAULT_RULES,
      streakTiers: [...DEFAULT_RULES.streakTiers].reverse(),
    };
    expect(streakMultiplier(shuffled, 5)).toBe(1.5);
    expect(streakMultiplier(shuffled, 0)).toBe(1);
  });
});

describe('speedBonus', () => {
  it('awards the maximum for an instant answer', () => {
    expect(speedBonus(DEFAULT_RULES, 0, ROUND_MS)).toBeCloseTo(DEFAULT_RULES.maxSpeedBonus, 6);
  });

  it('decays to nothing by the end of the bonus window', () => {
    const windowMs = ROUND_MS * DEFAULT_RULES.speedBonusWindowFraction;
    expect(speedBonus(DEFAULT_RULES, windowMs, ROUND_MS)).toBeCloseTo(1, 6);
    expect(speedBonus(DEFAULT_RULES, windowMs / 2, ROUND_MS)).toBeCloseTo(1.25, 6);
  });

  it('awards no bonus after the window closes', () => {
    expect(speedBonus(DEFAULT_RULES, ROUND_MS, ROUND_MS)).toBe(1);
    expect(speedBonus(DEFAULT_RULES, ROUND_MS * 2, ROUND_MS)).toBe(1);
  });

  it('decreases monotonically with elapsed time', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let elapsed = 0; elapsed <= ROUND_MS; elapsed += 500) {
      const bonus = speedBonus(DEFAULT_RULES, elapsed, ROUND_MS);
      expect(bonus).toBeLessThanOrEqual(previous);
      previous = bonus;
    }
  });

  it('is robust to degenerate inputs', () => {
    expect(speedBonus(DEFAULT_RULES, 0, 0)).toBe(1);
    expect(speedBonus(DEFAULT_RULES, -100, ROUND_MS)).toBeCloseTo(
      DEFAULT_RULES.maxSpeedBonus,
      6,
    );
  });
});

describe('computeGain', () => {
  const args = { difficulty: 'easy' as const, elapsedMs: ROUND_MS, roundDurationMs: ROUND_MS, streak: 0 };

  it('returns the base gain for a slow, easy, streakless answer', () => {
    expect(computeGain(DEFAULT_RULES, args).gain).toBeCloseTo(DEFAULT_RULES.baseGain, 6);
  });

  it('scales with difficulty', () => {
    const easy = computeGain(DEFAULT_RULES, args).gain;
    const medium = computeGain(DEFAULT_RULES, { ...args, difficulty: 'medium' }).gain;
    const hard = computeGain(DEFAULT_RULES, { ...args, difficulty: 'hard' }).gain;
    expect(medium).toBeGreaterThan(easy);
    expect(hard).toBeGreaterThan(medium);
  });

  it('compounds speed and streak', () => {
    const slow = computeGain(DEFAULT_RULES, args).gain;
    const fast = computeGain(DEFAULT_RULES, { ...args, elapsedMs: 0 }).gain;
    const fastStreak = computeGain(DEFAULT_RULES, { ...args, elapsedMs: 0, streak: 5 }).gain;
    expect(fast).toBeGreaterThan(slow);
    expect(fastStreak).toBeGreaterThan(fast);
    expect(fastStreak).toBeCloseTo(DEFAULT_RULES.baseGain * 1 * 1.5 * 1.5, 6);
  });

  it('reports the full breakdown so the arena can explain a gain', () => {
    const breakdown = computeGain(DEFAULT_RULES, { ...args, difficulty: 'hard', elapsedMs: 0, streak: 3 });
    expect(breakdown.difficultyWeight).toBe(1.6);
    expect(breakdown.streakMultiplier).toBe(1.25);
    expect(breakdown.speedBonus).toBeCloseTo(1.5, 6);
  });

  it('caps a single gain so one answer cannot end the match', () => {
    const generous: GameRules = { ...DEFAULT_RULES, baseGain: 5 };
    const breakdown = computeGain(generous, args);
    expect(breakdown.gain).toBe(generous.maxSingleGain);
    expect(breakdown.capped).toBe(true);
  });

  it('does not flag an uncapped gain as capped', () => {
    expect(computeGain(DEFAULT_RULES, args).capped).toBe(false);
  });

  it('never returns a negative gain', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (const elapsed of [0, 1000, ROUND_MS, ROUND_MS * 3]) {
        expect(
          computeGain(DEFAULT_RULES, { ...args, difficulty, elapsedMs: elapsed }).gain,
        ).toBeGreaterThan(0);
      }
    }
  });
});
