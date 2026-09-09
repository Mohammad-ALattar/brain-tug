import type { RoundResolution } from '@braintug/shared';
import {
  displayMetresForGain,
  formatBrainRaceStreakCheer,
  formatBrainRaceStreakHeadline,
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
export function formatRaceGainPresentation(input: {
  flash: ProgressFlash;
  playerName: string;
  teamName: string;
  modeState: BrainRaceState;
}): RaceGainPresentation {
  const score = input.flash.score;
  const metres = displayMetresForGain(input.modeState, input.flash.gain);

  return {
    teamId: input.flash.teamId,
    playerName: input.playerName,
    teamName: input.teamName,
    score,
    metres,
    metresLabel: `+${metres.toFixed(0)}m`,
    scoreLabel: score === 1 ? '1 correct answer' : `${score} correct answers`,
  };
}

export const ROUND_RESOLUTION_COPY: Record<RoundResolution, string> = {
  all_attempted: 'Everyone has answered',
  timeout: "Time's up",
  skipped: 'Question skipped',
  both_locked: 'Both teams locked in',
  victory: 'Finish line reached',
};

export function roundResolutionLabel(reason: RoundResolution): string {
  return ROUND_RESOLUTION_COPY[reason];
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

export function formatAnswerProgressLabel(progress: RoundAnswerProgress): string {
  return `${progress.answered} / ${progress.seated} answered`;
}

export type RaceStreakPresentation = {
  headline: string;
  cheer: string | null;
};

/** Formats the classroom streak callout from the authoritative progress event. */
export function formatRaceStreakPresentation(input: {
  flash: ProgressFlash;
  playerName: string;
}): RaceStreakPresentation | null {
  if (!shouldAnnounceBrainRaceStreak(input.flash.streak)) return null;
  return {
    headline: formatBrainRaceStreakHeadline(input.flash.streak),
    cheer: formatBrainRaceStreakCheer(input.playerName, input.flash.streak),
  };
}
