/** Brain Race streak thresholds — presentation only, not scoring multipliers. */
export const BRAIN_RACE_STREAK_THRESHOLDS = {
  started: 2,
  strong: 3,
  hot: 5,
} as const;

/** Visual tier for lane glow, `0` being no streak styling. */
export function brainRaceStreakVisualTier(streak: number): number {
  if (streak >= BRAIN_RACE_STREAK_THRESHOLDS.hot) return 3;
  if (streak >= BRAIN_RACE_STREAK_THRESHOLDS.strong) return 2;
  if (streak >= BRAIN_RACE_STREAK_THRESHOLDS.started) return 1;
  return 0;
}

/** Whether the classroom should show a streak callout for this answer. */
export function shouldAnnounceBrainRaceStreak(streak: number): boolean {
  return streak >= BRAIN_RACE_STREAK_THRESHOLDS.strong;
}

/** Whether a temporary racer boost should fire for this streak. */
export function shouldBoostBrainRaceStreak(streak: number): boolean {
  return streak >= BRAIN_RACE_STREAK_THRESHOLDS.strong;
}

export function formatBrainRaceStreakLabel(streak: number): string | null {
  if (streak < BRAIN_RACE_STREAK_THRESHOLDS.started) return null;
  return `\uD83D\uDD25 ${streak} streak`;
}

export function formatBrainRaceStreakHeadline(streak: number): string {
  return `\uD83D\uDD25 ${streak} STREAK`;
}

export function formatBrainRaceStreakCheer(name: string, streak: number): string | null {
  if (streak >= BRAIN_RACE_STREAK_THRESHOLDS.strong) {
    return `${name} is on fire!`;
  }
  return null;
}
