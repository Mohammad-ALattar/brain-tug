import { beforeEach, describe, expect, it } from 'vitest';

import type { ProgressFlash } from '../../../../store/gameStore';
import { getGameT, initTestI18n } from '../../../../test/i18n';

import {
  formatAnswerProgressLabel,
  formatRaceGainPresentation,
  formatRaceStreakPresentation,
  readRoundAnswerProgress,
  roundResolutionLabel,
} from './raceFeedback';

beforeEach(async () => {
  await initTestI18n('en');
});

describe('formatRaceGainPresentation', () => {
  it('formats player score and distance from the progress event', () => {
    const t = getGameT();
    const flash: ProgressFlash = {
      key: 1,
      teamId: 'blue',
      playerId: 'p1' as ProgressFlash['playerId'],
      gain: 0.16,
      streak: 1,
      score: 4,
    };

    const presentation = formatRaceGainPresentation(t, {
      flash,
      playerName: 'Ahmed',
      teamName: 'Blue Tigers',
      modeState: {
        kind: 'brain_race',
        progress: { ['p1' as ProgressFlash['playerId']]: 0.16 },
        trackMetres: 1000,
        finishersRequiredPerTeam: 1,
        finishOrder: [],
      },
    });

    expect(presentation.playerName).toBe('Ahmed');
    expect(presentation.teamName).toBe('Blue Tigers');
    expect(presentation.scoreLabel).toBe('4 correct answers');
    expect(presentation.metresLabel).toBe('+160m');
  });

  it('uses singular copy for one correct answer', () => {
    const t = getGameT();
    const flash: ProgressFlash = {
      key: 2,
      teamId: 'red',
      playerId: 'p2' as ProgressFlash['playerId'],
      gain: 0.04,
      streak: 1,
      score: 1,
    };

    expect(
      formatRaceGainPresentation(t, {
        flash,
        playerName: 'Sam',
        teamName: 'Red Hawks',
        modeState: {
          kind: 'brain_race',
          progress: { ['p2' as ProgressFlash['playerId']]: 0.04 },
          trackMetres: 1000,
          finishersRequiredPerTeam: 1,
          finishOrder: [],
        },
      }).scoreLabel,
    ).toBe('1 correct answer');
  });
});

describe('readRoundAnswerProgress', () => {
  it('sums both teams from the round state', () => {
    expect(
      readRoundAnswerProgress({ blueAttempted: 7, redAttempted: 5, seated: 18 }),
    ).toEqual({ answered: 12, seated: 18 });
  });
});

describe('formatAnswerProgressLabel', () => {
  it('renders the classroom progress chip', () => {
    expect(formatAnswerProgressLabel(getGameT(), { answered: 12, seated: 18 })).toBe(
      '12 / 18 answered',
    );
  });
});

describe('roundResolutionLabel', () => {
  it('maps timeout to readable classroom copy', () => {
    expect(roundResolutionLabel(getGameT(), 'timeout')).toBe("Time's up");
  });
});

describe('formatRaceStreakPresentation', () => {
  it('formats strong streak classroom copy from the progress event', () => {
    const t = getGameT();
    const flash: ProgressFlash = {
      key: 3,
      teamId: 'blue',
      playerId: 'p1' as ProgressFlash['playerId'],
      gain: 0.04,
      streak: 3,
      score: 3,
    };

    expect(formatRaceStreakPresentation(t, { flash, playerName: 'Ahmed' })).toEqual({
      headline: '🔥 3 STREAK',
      cheer: 'Ahmed is on fire!',
    });
  });

  it('returns null below the strong threshold', () => {
    const t = getGameT();
    const flash: ProgressFlash = {
      key: 4,
      teamId: 'blue',
      playerId: 'p1' as ProgressFlash['playerId'],
      gain: 0.04,
      streak: 2,
      score: 2,
    };

    expect(formatRaceStreakPresentation(t, { flash, playerName: 'Ahmed' })).toBeNull();
  });
});
