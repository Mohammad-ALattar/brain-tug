import { describe, expect, it } from 'vitest';
import type { PlayerId } from '@braintug/shared';

import {
  didOvertakeOnGain,
  laneHeightPx,
  playerInitials,
  raceLeaderIds,
  racerTokenSize,
} from './racePresentation';
import type { RacePlayerSlot } from './raceMotion';

const p1 = 'p1' as PlayerId;
const p2 = 'p2' as PlayerId;
const p3 = 'p3' as PlayerId;

const slots: RacePlayerSlot[] = [
  { slotIndex: 0, playerId: p1, teamId: 'blue' },
  { slotIndex: 1, playerId: p2, teamId: 'blue' },
  { slotIndex: 2, playerId: p3, teamId: 'red' },
];

describe('laneHeightPx', () => {
  it('uses taller lanes for small rosters', () => {
    expect(laneHeightPx(2)).toBe(72);
    expect(laneHeightPx(4)).toBe(72);
  });

  it('compacts lanes for medium and large rosters', () => {
    expect(laneHeightPx(6)).toBe(56);
    expect(laneHeightPx(10)).toBe(48);
  });
});

describe('playerInitials', () => {
  it('uses first two letters for a single name', () => {
    expect(playerInitials('Ahmed')).toBe('AH');
  });

  it('uses first and last initials for multiple words', () => {
    expect(playerInitials('Sam Taylor')).toBe('ST');
  });
});

describe('raceLeaderIds', () => {
  it('returns empty when everyone is at the start', () => {
    const race = {
      kind: 'brain_race' as const,
      progress: { [p1]: 0, [p2]: 0, [p3]: 0 },
      trackMetres: 1000,
      finishersRequiredPerTeam: 1,
      finishOrder: [],
    };
    expect(raceLeaderIds(slots, race).size).toBe(0);
  });

  it('returns all players tied for the lead', () => {
    const race = {
      kind: 'brain_race' as const,
      progress: { [p1]: 0.5, [p2]: 0.5, [p3]: 0.2 },
      trackMetres: 1000,
      finishersRequiredPerTeam: 1,
      finishOrder: [],
    };
    expect(raceLeaderIds(slots, race)).toEqual(new Set([p1, p2]));
  });
});

describe('didOvertakeOnGain', () => {
  it('detects passing another racer on a gain', () => {
    const race = {
      kind: 'brain_race' as const,
      progress: { [p1]: 0.5, [p2]: 0.48, [p3]: 0.1 },
      trackMetres: 1000,
      finishersRequiredPerTeam: 1,
      finishOrder: [],
    };

    expect(
      didOvertakeOnGain({ playerId: p1, gain: 0.05, race, slots }),
    ).toBe(true);
  });

  it('returns false when nobody was passed', () => {
    const race = {
      kind: 'brain_race' as const,
      progress: { [p1]: 0.2, [p2]: 0.5, [p3]: 0.1 },
      trackMetres: 1000,
      finishersRequiredPerTeam: 1,
      finishOrder: [],
    };

    expect(
      didOvertakeOnGain({ playerId: p1, gain: 0.05, race, slots }),
    ).toBe(false);
  });
});

describe('racerTokenSize', () => {
  it('shrinks tokens for compact lanes', () => {
    expect(racerTokenSize(72).px).toBe(48);
    expect(racerTokenSize(48).px).toBe(32);
  });
});
