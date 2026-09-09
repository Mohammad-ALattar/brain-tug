import { Profiler, useRef } from 'react';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { act, cleanup, render, screen } from '@testing-library/react';

import type { PlayerId, TeamId } from '@braintug/shared';

import { makeState, playerOn, resetStore, seedStore } from '../../../../test/fixtures';

import { useGameStore } from '../../../../store/gameStore';

import {

  RACE_SETTLE_ANIMATE,

  RACE_SETTLE_SNAP,

  RACE_TRAVEL_PX,

  buildRaceMotionVars,

  nextRaceMotionTick,

  racePlayerSlots,

  readRaceProgress,

} from './raceMotion';

import { useRaceMotion } from './useRaceMotion';



afterEach(() => {

  cleanup();

  resetStore();

});



function MotionHost({ onRender }: { onRender?: () => void }) {

  const ref = useRef<HTMLDivElement>(null);

  useRaceMotion(ref);

  return (

    <Profiler id="race-motion" onRender={() => onRender?.()}>

      <div ref={ref} data-testid="root">

        <div data-race-index="0" data-testid="slot-0" />

        <div data-race-index="1" data-testid="slot-1" />

      </div>

    </Profiler>

  );

}



const cssVar = (name: string): string =>

  screen.getByTestId('root').style.getPropertyValue(name);



const slotProgress = (index: number): string =>

  screen.getByTestId(`slot-${index}`).style.getPropertyValue('--race-progress');



function seedRace(progressOverrides: Partial<Record<PlayerId, number>> = {}) {

  const state = makeState({ mode: 'brain_race', playersPerTeam: 1 });

  const progress = Object.fromEntries(

    state.players.map((player) => [player.id, progressOverrides[player.id] ?? 0]),

  ) as Record<PlayerId, number>;

  seedStore({

    ...state,

    modeState: {

      kind: 'brain_race',

      progress,

      trackMetres: 1000,

      finishersRequiredPerTeam: 1,

      finishOrder: [],

    },

  });

  return state;

}



function raceProgress(

  teamId: TeamId,

  playerId: PlayerId,

  progressOverrides: Partial<Record<PlayerId, number>>,

  gain = 0.04,

  streak = 1,

): void {

  const state = useGameStore.getState().state!;

  const progress = Object.fromEntries(

    state.players.map((player) => [player.id, progressOverrides[player.id] ?? 0]),

  ) as Record<PlayerId, number>;



  act(() =>

    useGameStore.getState().applyProgress({

      teamId,

      playerId,

      gain,

      streak,

      score: 1,

      modeState: {

        kind: 'brain_race',

        progress,

        trackMetres: 1000,

        finishersRequiredPerTeam: 1,

        finishOrder: [],

      },

    }),

  );

}



describe('readRaceProgress', () => {

  it('returns zeroed lanes before Brain Race mode state exists', () => {

    const slots = racePlayerSlots({

      teams: { blue: { playerIds: ['p1' as PlayerId] }, red: { playerIds: [] } },

      players: [{ id: 'p1' as PlayerId, name: 'A', teamId: 'blue', connected: true, correctCount: 0, incorrectCount: 0, contribution: 0, streak: 0 }],

    });

    expect(readRaceProgress(null, slots)).toEqual([0]);

  });



  it('clamps lane progress from the server snapshot', () => {

    const slots = racePlayerSlots({

      teams: {

        blue: { playerIds: ['p1' as PlayerId, 'p2' as PlayerId] },

        red: { playerIds: [] },

      },

      players: [

        { id: 'p1' as PlayerId, name: 'A', teamId: 'blue', connected: true, correctCount: 0, incorrectCount: 0, contribution: 0, streak: 0 },

        { id: 'p2' as PlayerId, name: 'B', teamId: 'blue', connected: true, correctCount: 0, incorrectCount: 0, contribution: 0, streak: 0 },

      ],

    });



    expect(

      readRaceProgress(

        {

          kind: 'brain_race',

          progress: { p1: 1.2, p2: -0.1 } as Record<PlayerId, number>,

          trackMetres: 1000,

          finishersRequiredPerTeam: 1,

          finishOrder: [],

        },

        slots,

      ),

    ).toEqual([1, 0]);

  });

});



describe('nextRaceMotionTick', () => {

  it('snaps the first frame and any full snapshot', () => {

    expect(

      nextRaceMotionTick({

        progressKey: null,

        lastHandledProgressKey: null,

        primed: false,

      }).shouldAnimate,

    ).toBe(false);



    expect(

      nextRaceMotionTick({

        progressKey: 3,

        lastHandledProgressKey: 3,

        primed: true,

      }).shouldAnimate,

    ).toBe(false);

  });



  it('animates only after a fresh progress key once primed', () => {

    const first = nextRaceMotionTick({

      progressKey: 1,

      lastHandledProgressKey: null,

      primed: false,

    });

    expect(first.shouldAnimate).toBe(false);

    expect(first.lastHandledProgressKey).toBe(1);



    const second = nextRaceMotionTick({

      progressKey: 2,

      lastHandledProgressKey: first.lastHandledProgressKey,

      primed: first.primed,

    });

    expect(second.shouldAnimate).toBe(true);

  });

});



describe('buildRaceMotionVars', () => {

  it('uses the animate settle duration only when requested', () => {

    expect(

      buildRaceMotionVars({

        progress: [0.25, 0.5],

        shouldAnimate: true,

        streakTiers: [0, 0],

      })['--race-settle'],

    ).toBe(RACE_SETTLE_ANIMATE);



    expect(

      buildRaceMotionVars({

        progress: [0.25, 0.5],

        shouldAnimate: false,

        streakTiers: [0, 0],

      })['--race-settle'],

    ).toBe(RACE_SETTLE_SNAP);

  });



  it('writes per-slot progress and streak tiers', () => {

    const vars = buildRaceMotionVars({

      progress: [0.1, 0.2],

      shouldAnimate: false,

      streakTiers: [2, 3],

    });



    expect(vars['--race-0']).toBe('0.1000');

    expect(vars['--race-1']).toBe('0.2000');

    expect(vars['--streak-0']).toBe('2');

    expect(vars['--streak-1']).toBe('3');

  });

});



describe('useRaceMotion', () => {

  it('writes initial racer positions from the server snapshot without animating', () => {

    const state = seedRace();

    const blue = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    act(() => {

      useGameStore.getState().setState({

        ...useGameStore.getState().state!,

        modeState: {

          kind: 'brain_race',

          progress: { [blue.id]: 0.25, [red.id]: 0.5 },

          trackMetres: 1000,

          finishersRequiredPerTeam: 1,

          finishOrder: [],

        },

      });

    });



    render(<MotionHost />);



    expect(Number(cssVar('--race-0'))).toBeCloseTo(0.25);

    expect(Number(cssVar('--race-1'))).toBeCloseTo(0.5);

    expect(cssVar('--race-travel')).toBe(`${RACE_TRAVEL_PX}px`);

    expect(cssVar('--race-settle')).toBe(RACE_SETTLE_SNAP);

    expect(Number(slotProgress(0))).toBeCloseTo(0.25);

  });



  it('animates a slot forward on a fresh progress update', () => {

    const state = seedRace();

    const player = playerOn(state, 'blue', 0);

    render(<MotionHost />);



    raceProgress('blue', player.id, { [player.id]: 0.14 }, 0.04, 3);



    expect(Number(cssVar('--race-0'))).toBeCloseTo(0.14);

    expect(cssVar('--race-settle')).toBe(RACE_SETTLE_ANIMATE);

    expect(cssVar('--boost-blue')).toBe('1');

  });



  it('does not boost below the strong streak threshold', () => {

    const state = seedRace();

    const player = playerOn(state, 'blue', 0);

    render(<MotionHost />);



    raceProgress('blue', player.id, { [player.id]: 0.14 }, 0.04, 2);



    expect(cssVar('--boost-blue')).not.toBe('1');

  });



  it('handles multiple consecutive progress updates', () => {

    const state = seedRace();

    const blue = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    render(<MotionHost />);



    raceProgress('blue', blue.id, { [blue.id]: 0.04 });

    expect(Number(cssVar('--race-0'))).toBeCloseTo(0.04);

    expect(cssVar('--race-settle')).toBe(RACE_SETTLE_ANIMATE);



    raceProgress('red', red.id, { [blue.id]: 0.04, [red.id]: 0.03 });

    expect(Number(cssVar('--race-1'))).toBeCloseTo(0.03);

    expect(cssVar('--race-settle')).toBe(RACE_SETTLE_ANIMATE);

  });



  it('snaps on a full snapshot and does not replay the last boost', () => {

    const state = seedRace();

    const player = playerOn(state, 'blue', 0);

    raceProgress('blue', player.id, { [player.id]: 0.24 });



    render(<MotionHost />);

    expect(cssVar('--boost-blue')).not.toBe('1');



    act(() => {

      const current = useGameStore.getState().state!;

      useGameStore.getState().setState({

        ...current,

        modeState: {

          kind: 'brain_race',

          progress: { [player.id]: 0.3 },

          trackMetres: 1000,

          finishersRequiredPerTeam: 1,

          finishOrder: [],

        },

      });

    });



    expect(Number(cssVar('--race-0'))).toBeCloseTo(0.3);

    expect(cssVar('--race-settle')).toBe(RACE_SETTLE_SNAP);

    expect(cssVar('--boost-blue')).not.toBe('1');

  });



  it('does not replay movement after reconnecting mid-match', () => {

    const state = seedRace();

    const player = playerOn(state, 'blue', 0);

    raceProgress('blue', player.id, { [player.id]: 0.35 });



    const first = render(<MotionHost />);

    expect(Number(cssVar('--race-0'))).toBeCloseTo(0.35);

    expect(cssVar('--race-settle')).toBe(RACE_SETTLE_SNAP);

    first.unmount();



    seedRace({ [player.id]: 0.35 });

    useGameStore.setState({

      lastProgress: {

        key: 99,

        teamId: 'blue',

        playerId: player.id,

        gain: 0.05,

        streak: 1,

        score: 3,

      },

    });



    render(<MotionHost />);

    expect(Number(cssVar('--race-0'))).toBeCloseTo(0.35);

    expect(cssVar('--race-settle')).toBe(RACE_SETTLE_SNAP);

    expect(cssVar('--boost-blue')).not.toBe('1');

  });



  it('moves racers without rerendering React', () => {

    const state = seedRace();

    const player = playerOn(state, 'blue', 0);

    const onRender = vi.fn();

    render(<MotionHost onRender={onRender} />);



    const rendersAfterMount = onRender.mock.calls.length;

    raceProgress('blue', player.id, { [player.id]: 0.05 });



    expect(Number(cssVar('--race-0'))).toBeCloseTo(0.05);

    expect(onRender.mock.calls.length).toBe(rendersAfterMount);

  });

});


