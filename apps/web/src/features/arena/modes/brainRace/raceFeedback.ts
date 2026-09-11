import type { TFunction } from 'i18next';
import type { RoundResolution } from '@braintug/shared';
import {
  BRAIN_RACE_STREAK_THRESHOLDS,
  displayMetresForGain,
  shouldAnnounceBrainRaceStreak,
  type BrainRaceState,
  type TeamId,
} from '@braintug/shared';
import type { ProgressFlash } from '../../../../store/gameStore';

export type RaceGainPresentation = {
  teamId: TeamId;
  playerName: string;
  teamName: string;
  score: number;
  metres: number;
  metresLabel: string;
  scoreLabel: string;
};

/** Formats the classroom gain card from the authoritative progress event. */
export function formatRaceGainPresentation(
  t: TFunction<'game'>,
  input: {
    flash: ProgressFlash;
    playerName: string;
    teamName: string;
    modeState: BrainRaceState;
  },
): RaceGainPresentation {
  const score = input.flash.score;
  const metres = displayMetresForGain(input.modeState, input.flash.gain);

  return {
    teamId: input.flash.teamId,
    playerName: input.playerName,
    teamName: input.teamName,
    score,
    metres,
    metresLabel: t('arena.race.metresGain', { metres: metres.toFixed(0) }),
    scoreLabel: t('arena.race.correctAnswer', { count: score }),
  };
}

export function roundResolutionLabel(t: TFunction<'game'>, reason: RoundResolution): string {
  return t(`arena.race.roundResolution.${reason}`);
}

export type RoundAnswerProgress = {
  answered: number;
  seated: number;
};

/** Sums attempted players on both teams from the open round. */
export function readRoundAnswerProgress(input: {
  blueAttempted: number;
  redAttempted: number;
  seated: number;
}): RoundAnswerProgress {
  return {
    answered: input.blueAttempted + input.redAttempted,
    seated: input.seated,
  };
}

export function formatAnswerProgressLabel(
  t: TFunction<'game'>,
  progress: RoundAnswerProgress,
): string {
  return t('arena.race.answerProgress', {
    answered: progress.answered,
    seated: progress.seated,
  });
}

export type RaceStreakPresentation = {
  headline: string;
  cheer: string | null;
};

/** Formats the classroom streak callout from the authoritative progress event. */
export function formatRaceStreakPresentation(
  t: TFunction<'game'>,
  input: {
    flash: ProgressFlash;
    playerName: string;
  },
): RaceStreakPresentation | null {
  if (!shouldAnnounceBrainRaceStreak(input.flash.streak)) return null;
  return {
    headline: t('arena.race.streakHeadline', { count: input.flash.streak }),
    cheer:
      input.flash.streak >= BRAIN_RACE_STREAK_THRESHOLDS.strong
        ? t('arena.race.streakCheer', { name: input.playerName })
        : null,
  };
}
