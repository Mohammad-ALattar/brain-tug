import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import { setupGame, withRaceProgress } from '../engine/testing.js';
import { DEFAULT_RULES } from '../rules/rules.js';
import {
  recordPlayerFinish,
} from '../rules/track.js';
import { brainRace } from './brainRace.js';
import type { BrainRaceState, GainTarget } from './types.js';

function raceState(
  session: GameSession,
  progress: Partial<Record<PlayerId, number>>,
  overrides: Partial<Pick<BrainRaceState, 'finishersRequiredPerTeam' | 'finishOrder'>> = {},
): BrainRaceState {
  const base = withRaceProgress(session, progress).modeState;
  if (base.kind !== 'brain_race') throw new Error('expected brain race');
  return { ...base, ...overrides };
}

function target(session: GameSession, teamId: 'blue' | 'red', index = 0): GainTarget {
  return { teamId, playerId: session.teams[teamId].playerIds[index]! };
}

describe('brainRace.applyGain', () => {
  it('accumulates independently per player', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2, stayInLobby: true });
    const blue0 = session.teams.blue.playerIds[0]!;
    const blue1 = session.teams.blue.playerIds[1]!;
    const red0 = session.teams.red.playerIds[0]!;

    let state = session.modeState;
    state = brainRace.applyGain(state, target(session, 'blue', 0), 0.2);
    state = brainRace.applyGain(state, target(session, 'blue', 0), 0.1);
    state = brainRace.applyGain(state, target(session, 'red', 0), 0.3);

    expect(state.kind).toBe('brain_race');
    if (state.kind === 'brain_race') {
      expect(state.progress[blue0]).toBeCloseTo(0.3, 10);
      expect(state.progress[blue1] ?? 0).toBe(0);
      expect(state.progress[red0]).toBeCloseTo(0.3, 10);
    }
  });

  it('never moves another player backwards', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1, stayInLobby: true });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const before = raceState(session, { [blue0]: 0.4, [red0]: 0.2 });

    const after = brainRace.applyGain(before, target(session, 'blue', 0), 0.1);
    expect(after.progress[blue0]).toBeCloseTo(0.5, 10);
    expect(after.progress[red0]).toBeCloseTo(0.2, 10);
  });

  it('clamps at the finish line', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1, stayInLobby: true });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const before = raceState(session, { [blue0]: 0.9, [red0]: 0 });

    const after = brainRace.applyGain(before, target(session, 'blue', 0), 0.5);
    expect(after.progress[blue0]).toBe(1);
    expect(after.progress[red0] ?? 0).toBe(0);
  });
});

describe('brainRace.victor', () => {
  it('has no winner short of the finisher quota', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2, finishersRequiredPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const state = raceState(session, { [blue0]: 1 });

    expect(brainRace.victor(state, DEFAULT_RULES, session)).toBeNull();
  });

  it('declares a winner when the quota is reached', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;

    const blueWins = recordPlayerFinish(
      raceState(session, { [blue0]: 1 }),
      blue0,
      'blue',
      DEFAULT_RULES.winThreshold,
    );
    expect(brainRace.victor(blueWins, DEFAULT_RULES, session)).toBe('blue');

    const redWins = recordPlayerFinish(
      raceState(session, { [red0]: 1 }),
      red0,
      'red',
      DEFAULT_RULES.winThreshold,
    );
    expect(brainRace.victor(redWins, DEFAULT_RULES, session)).toBe('red');
  });

  it('reports no winner when both teams meet the quota', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    let state = raceState(session, { [blue0]: 1, [red0]: 1 });
    state = recordPlayerFinish(state, blue0, 'blue', DEFAULT_RULES.winThreshold);
    state = recordPlayerFinish(state, red0, 'red', DEFAULT_RULES.winThreshold);

    expect(brainRace.victor(state, DEFAULT_RULES, session)).toBeNull();
  });
});

describe('brainRace.winnerOnExhaustion', () => {
  it('picks the team with more connected finishers', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2, finishersRequiredPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const blue1 = session.teams.blue.playerIds[1]!;
    const red0 = session.teams.red.playerIds[0]!;

    const blueAhead = raceState(session, { [blue0]: 1, [blue1]: 1, [red0]: 0.4 });
    expect(brainRace.winnerOnExhaustion(blueAhead, session)).toBe('blue');

    const redAhead = raceState(session, { [blue0]: 0.1, [red0]: 1 });
    expect(brainRace.winnerOnExhaustion(redAhead, session)).toBe('red');
  });

  it('returns a draw when both sides are tied on finishers and progress', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;

    expect(brainRace.winnerOnExhaustion(raceState(session, { [blue0]: 0.3, [red0]: 0.3 }), session)).toBe(
      'draw',
    );
    expect(brainRace.winnerOnExhaustion(raceState(session, {}), session)).toBe('draw');
  });
});

describe('brainRace.progressFraction', () => {
  it('mirrors finisher quota progress', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2, finishersRequiredPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const red1 = session.teams.red.playerIds[1]!;

    let state = raceState(session, { [blue0]: 1, [red0]: 1, [red1]: 0.2 });
    state = recordPlayerFinish(state, blue0, 'blue', DEFAULT_RULES.winThreshold);
    state = recordPlayerFinish(state, red0, 'red', DEFAULT_RULES.winThreshold);

    expect(brainRace.progressFraction(state)).toEqual({
      blue: 0.5,
      red: 0.5,
    });
  });
});
