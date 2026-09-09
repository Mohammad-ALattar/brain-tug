import { describe, expect, it } from 'vitest';
import {
  BRAIN_RACE_STREAK_THRESHOLDS,
  brainRaceStreakVisualTier,
  formatBrainRaceStreakCheer,
  formatBrainRaceStreakHeadline,
  formatBrainRaceStreakLabel,
  shouldAnnounceBrainRaceStreak,
  shouldBoostBrainRaceStreak,
} from './streakPresentation.js';

describe('brainRaceStreakPresentation', () => {
  it('uses explicit thresholds rather than magic numbers', () => {
    expect(BRAIN_RACE_STREAK_THRESHOLDS.started).toBe(2);
    expect(BRAIN_RACE_STREAK_THRESHOLDS.strong).toBe(3);
    expect(BRAIN_RACE_STREAK_THRESHOLDS.hot).toBe(5);
  });

  it('maps streak counts to visual tiers', () => {
    expect(brainRaceStreakVisualTier(0)).toBe(0);
    expect(brainRaceStreakVisualTier(1)).toBe(0);
    expect(brainRaceStreakVisualTier(2)).toBe(1);
    expect(brainRaceStreakVisualTier(3)).toBe(2);
    expect(brainRaceStreakVisualTier(5)).toBe(3);
  });

  it('formats classroom and student streak copy', () => {
    expect(formatBrainRaceStreakLabel(1)).toBeNull();
    expect(formatBrainRaceStreakLabel(2)).toBe('🔥 2 streak');
    expect(formatBrainRaceStreakHeadline(3)).toBe('🔥 3 STREAK');
    expect(formatBrainRaceStreakCheer('Ahmed', 3)).toBe('Ahmed is on fire!');
    expect(formatBrainRaceStreakCheer('Ahmed', 2)).toBeNull();
  });

  it('announces and boosts only from the strong threshold', () => {
    expect(shouldAnnounceBrainRaceStreak(2)).toBe(false);
    expect(shouldAnnounceBrainRaceStreak(3)).toBe(true);
    expect(shouldBoostBrainRaceStreak(2)).toBe(false);
    expect(shouldBoostBrainRaceStreak(3)).toBe(true);
  });
});
