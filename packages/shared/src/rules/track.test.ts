import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import {
  asRace,
  setupGame,
  withRaceProgress,
} from '../engine/testing.js';
import { DEFAULT_RULES } from './rules.js';
import {
  TRACK_MAX,
  TRACK_MIN,
  advanceLane,
  clampProgress,
  connectedFinisherCount,
  defaultFinishersRequired,
  gainToMetres,
  isPlayerFinished,
  playerMetres,
  playerProgress,
  raceTension,
  raceWinnerByFinishers,
  raceWinnerOnExhaustion,
  racersByProgress,
  recordPlayerFinish,
  teamFinisherFraction,
} from './track.js';
import type { BrainRaceState } from '../modes/types.js';

function raceState(
  session: GameSession,
  progress: Partial<Record<PlayerId, number>>,
  overrides: Partial<Pick<BrainRaceState, 'finishersRequiredPerTeam' | 'finishOrder'>> = {},
): BrainRaceState {
  const base = withRaceProgress(session, progress).modeState;
  if (base.kind !== 'brain_race') throw new Error('expected brain race');
  return { ...base, ...overrides };
}

describe('clampProgress', () => {
  it('passes through in-range values', () => {
    expect(clampProgress(0)).toBe(0);
    expect(clampProgress(0.4)).toBe(0.4);
  });

  it('clamps beyond either end of the track', () => {
    expect(clampProgress(5)).toBe(TRACK_MAX);
    expect(clampProgress(-1)).toBe(TRACK_MIN);
  });

  it('treats NaN as the start line', () => {
    expect(clampProgress(Number.NaN)).toBe(0);
  });
});

describe('advanceLane', () => {
  it('adds a non-negative gain', () => {
    expect(advanceLane(0.2, 0.1)).toBeCloseTo(0.3, 6);
  });

  it('ignores a negative gain rather than reversing', () => {
    expect(advanceLane(0.4, -0.2)).toBeCloseTo(0.4, 6);
  });

  it('never travels past the finish', () => {
    expect(advanceLane(0.9, 0.5)).toBe(TRACK_MAX);
  });
});

describe('player progress helpers', () => {
  it('converts progress to metres', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1, stayInLobby: true });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const state = raceState(session, { [blue0]: 0.68, [red0]: 0.52 });

    expect(playerProgress(state, blue0)).toBeCloseTo(0.68, 6);
    expect(playerMetres(state, blue0)).toBeCloseTo(680, 6);
    expect(playerMetres(state, red0)).toBeCloseTo(520, 6);
    expect(gainToMetres(state, 0.04)).toBeCloseTo(40, 6);
  });

  it('detects when a player has finished', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1, stayInLobby: true });
    const blue0 = session.teams.blue.playerIds[0]!;
    const finished = raceState(session, { [blue0]: 1 });
    const racing = raceState(session, { [blue0]: 0.98 });

    expect(isPlayerFinished(finished, blue0, 1)).toBe(true);
    expect(isPlayerFinished(racing, blue0, 0.99)).toBe(false);
  });
});

describe('defaultFinishersRequired', () => {
  it('uses half of the larger team, at least one', () => {
    expect(defaultFinishersRequired(1, 1)).toBe(1);
    expect(defaultFinishersRequired(2, 2)).toBe(1);
    expect(defaultFinishersRequired(4, 2)).toBe(2);
    expect(defaultFinishersRequired(2, 5)).toBe(2);
  });
});

describe('raceWinnerByFinishers', () => {
  it('has no winner until a team reaches the quota', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2, finishersRequiredPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const state = raceState(session, { [blue0]: 1 });

    expect(raceWinnerByFinishers(state, session, DEFAULT_RULES.winThreshold)).toBeNull();
  });

  it('names the team that reached the quota', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;

    expect(
      raceWinnerByFinishers(raceState(session, { [blue0]: 1 }), session, DEFAULT_RULES.winThreshold),
    ).toBe('blue');
    expect(
      raceWinnerByFinishers(raceState(session, { [red0]: 1 }), session, DEFAULT_RULES.winThreshold),
    ).toBe('red');
  });

  it('reports no winner if both teams meet the quota', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const state = raceState(session, { [blue0]: 1, [red0]: 1 });

    expect(raceWinnerByFinishers(state, session, DEFAULT_RULES.winThreshold)).toBeNull();
  });
});

describe('connectedFinisherCount', () => {
  it('counts only connected players who crossed the line', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const blue1 = session.teams.blue.playerIds[1]!;
    const state = raceState(session, { [blue0]: 1, [blue1]: 1 });

    expect(connectedFinisherCount(session, state, 'blue', DEFAULT_RULES.winThreshold)).toBe(2);

    const disconnected = {
      ...session,
      players: {
        ...session.players,
        [blue1]: { ...session.players[blue1]!, connected: false },
      },
    };
    expect(connectedFinisherCount(disconnected, state, 'blue', DEFAULT_RULES.winThreshold)).toBe(1);
  });
});

describe('recordPlayerFinish', () => {
  it('records first crossing in finish order', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const blue1 = session.teams.blue.playerIds[1]!;
    const state = raceState(session, { [blue0]: 1, [blue1]: 0.2 });

    const once = recordPlayerFinish(state, blue0, 'blue', DEFAULT_RULES.winThreshold);
    expect(once.finishOrder).toEqual([{ playerId: blue0, teamId: 'blue' }]);

    const twice = recordPlayerFinish(once, blue0, 'blue', DEFAULT_RULES.winThreshold);
    expect(twice.finishOrder).toHaveLength(1);
  });
});

describe('teamFinisherFraction and raceTension', () => {
  it('reports progress toward the finisher quota', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2, finishersRequiredPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const state = raceState(session, { [blue0]: 1, [red0]: 0.2 });

    expect(teamFinisherFraction(session, state, 'blue', DEFAULT_RULES.winThreshold)).toBeCloseTo(0.5, 6);
    expect(teamFinisherFraction(session, state, 'red', DEFAULT_RULES.winThreshold)).toBe(0);
    expect(raceTension(state, session, DEFAULT_RULES.winThreshold)).toBeCloseTo(0.5, 6);
  });

  it('reaches full tension when a team meets the quota', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const state = raceState(session, { [blue0]: 1, [red0]: 0.2 });

    expect(raceTension(state, session, DEFAULT_RULES.winThreshold)).toBe(1);
  });
});

describe('raceWinnerOnExhaustion', () => {
  it('breaks ties using finish order', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    let state = raceState(session, { [blue0]: 1, [red0]: 1 });
    state = recordPlayerFinish(state, blue0, 'blue', DEFAULT_RULES.winThreshold);
    state = recordPlayerFinish(state, red0, 'red', DEFAULT_RULES.winThreshold);

    expect(raceWinnerOnExhaustion(state, session, DEFAULT_RULES.winThreshold)).toBe('blue');
  });

  it('falls back to best connected progress when finisher counts tie without finish order', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;

    expect(
      raceWinnerOnExhaustion(
        raceState(session, { [blue0]: 0.6, [red0]: 0.55 }),
        session,
        0.5,
      ),
    ).toBe('blue');
  });
});

describe('racersByProgress', () => {
  it('sorts racers by progress descending, then roster order', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const blue1 = session.teams.blue.playerIds[1]!;
    const red0 = session.teams.red.playerIds[0]!;
    const state = raceState(session, { [blue0]: 0.3, [blue1]: 0.5, [red0]: 0.4 });

    expect(racersByProgress(session, state).map((row) => row.playerId)).toEqual([
      blue1,
      red0,
      blue0,
      session.teams.red.playerIds[1]!,
    ]);
  });
});

describe('asRace helper', () => {
  it('reads per-player progress from a live session', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1 });
    expect(asRace(session).progress[session.teams.blue.playerIds[0]!]).toBe(0);
    expect(asRace(session).finishersRequiredPerTeam).toBeGreaterThanOrEqual(1);
    expect(asRace(session).finishOrder).toEqual([]);
  });
});
