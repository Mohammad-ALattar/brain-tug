import { describe, expect, it } from 'vitest';
import type { GameResult } from '../domain/result.js';
import type { PlayerId } from '../domain/ids.js';
import type { BrainRaceState, TugOfWarState } from '../modes/types.js';
import { setupGame } from '../engine/testing.js';
import { DEFAULT_RULES } from './rules.js';
import {
  displayFinishMetres,
  displayLeadGapMetres,
  displayLeader,
  displayMetresForGain,
  displayPlayerMetres,
  displayTeamFinishers,
} from './display.js';

const tug = (ropePosition: number): TugOfWarState => ({
  kind: 'tug_of_war',
  ropePosition,
  arenaHalfMetres: 4,
});

function raceState(
  progress: Record<PlayerId, number>,
  finishersRequiredPerTeam = 1,
): BrainRaceState {
  return {
    kind: 'brain_race',
    progress,
    trackMetres: 1000,
    finishersRequiredPerTeam,
    finishOrder: [],
  };
}

describe('displayMetresForGain', () => {
  it('scales a tug gain by the arena half-width', () => {
    expect(displayMetresForGain(tug(0), 0.25)).toBe(1);
  });

  it('scales a race gain by the track length', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1, stayInLobby: true });
    const state = raceState({ [session.teams.blue.playerIds[0]!]: 0 });
    expect(displayMetresForGain(state, 0.04)).toBeCloseTo(40, 6);
  });
});

describe('displayPlayerMetres', () => {
  it('reports a player distance along the track', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1, stayInLobby: true });
    const blue0 = session.teams.blue.playerIds[0]!;
    const state = raceState({ [blue0]: 0.68 });

    expect(displayPlayerMetres(state, blue0)).toBeCloseTo(680, 6);
    expect(displayPlayerMetres(tug(0.5), blue0)).toBe(0);
  });
});

describe('displayTeamFinishers', () => {
  it('reports connected finishers against the quota', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2, finishersRequiredPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const blue1 = session.teams.blue.playerIds[1]!;
    const state = raceState({ [blue0]: 1, [blue1]: 0.2 }, 2);

    expect(displayTeamFinishers(state, session, 'blue', DEFAULT_RULES.winThreshold)).toEqual({
      finished: 1,
      required: 2,
    });
    expect(displayTeamFinishers(tug(0), session, 'blue', DEFAULT_RULES.winThreshold)).toEqual({
      finished: 0,
      required: 0,
    });
  });
});

describe('displayLeader and displayLeadGapMetres', () => {
  it('names the tug side that has the rope and the gap in metres', () => {
    expect(displayLeader(tug(0.5))).toBe('red');
    expect(displayLeadGapMetres(tug(0.5))).toBe(2);
    expect(displayLeader(tug(0))).toBeNull();
    expect(displayLeadGapMetres(tug(0))).toBe(0);
  });

  it('returns null for brain race leader and gap helpers', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1, stayInLobby: true });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const state = raceState({ [blue0]: 0.2, [red0]: 0.45 });

    expect(displayLeader(state)).toBeNull();
    expect(displayLeadGapMetres(state)).toBe(0);
  });
});

describe('displayFinishMetres', () => {
  it('reports how far the tug rope finished from centre', () => {
    const result = {
      winner: 'red',
      finalModeState: tug(0.5),
    } as GameResult;
    expect(displayFinishMetres(result)).toBe(2);
  });

  it('returns null for brain race results', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1, stayInLobby: true });
    const blue0 = session.teams.blue.playerIds[0]!;
    const result = {
      winner: 'blue',
      finalModeState: raceState({ [blue0]: 1 }),
    } as GameResult;
    expect(displayFinishMetres(result)).toBeNull();
  });
});
