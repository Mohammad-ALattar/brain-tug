import type { GameModeId, GameResult, ModeState } from '@braintug/shared';

type ModeCopy = {
  countdownCue: string;
  targetReached: string;
  wonBy: string;
  topContributor: string;
  contributionColumn: string;
  /** Status when neither side leads. */
  level: string;
  rejectedTitle: string;
  /** After this student has spent their attempt while the round is still open. */
  roundStillOpen: string;
  gapDigits: number;
  correctGain: (metres: number) => string;
  finishLine: (metres: number) => string;
};

/** Mode-specific classroom copy. Chrome reads this instead of branching on id. */
export const MODE_COPY: Record<GameModeId, ModeCopy> = {
  tug_of_war: {
    countdownCue: 'Take hold of the rope',
    targetReached: 'Rope pulled across the line',
    wonBy: 'pulled the rope all the way over',
    topContributor: 'Top puller',
    contributionColumn: 'Pulled',
    level: 'Rope at the centre',
    rejectedTitle: 'No pull',
    roundStillOpen: 'Your teammates can still answer this one.',
    gapDigits: 1,
    correctGain: (metres) => `You pulled the rope ${metres.toFixed(1)}m`,
    finishLine: (metres) => `Rope finished ${metres.toFixed(1)}m from centre`,
  },
  brain_race: {
    countdownCue: 'Get to the start line',
    targetReached: 'First across the finish line',
    wonBy: 'crossed the finish line first',
    topContributor: 'Top racer',
    contributionColumn: 'Distance',
    level: 'Lanes level',
    rejectedTitle: 'No distance',
    roundStillOpen: 'Others can still answer this question.',
    gapDigits: 0,
    correctGain: (metres) => `Your racer moved +${metres.toFixed(0)}m`,
    finishLine: (metres) => `Finished in ${metres.toFixed(0)}m`,
  },
};

export function copyFor(mode: GameModeId): ModeCopy {
  return MODE_COPY[mode];
}

export function copyForState(state: ModeState): ModeCopy {
  return MODE_COPY[state.kind];
}

export function resultReasonLabel(result: GameResult): string {
  if (result.reason === 'target_reached') return MODE_COPY[result.mode].targetReached;
  if (result.reason === 'questions_exhausted') return 'All questions played';
  return 'Match ended by the teacher';
}

export function resultWonBy(result: GameResult): string {
  if (result.reason === 'target_reached') return MODE_COPY[result.mode].wonBy;
  if (result.reason === 'questions_exhausted') return 'led after every question';
  return 'led when you ended the match';
}
