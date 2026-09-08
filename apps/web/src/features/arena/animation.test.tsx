import { Profiler, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { DEFAULT_RULES, type PlayerId, type TeamId } from '@mtow/shared';
import { buildGameResult } from '@mtow/shared';
import { T0 } from '@mtow/shared/testing';
import { makeSession, makeState, resetStore, seedStore } from '../../test/fixtures';
import { useGameStore } from '../../store/gameStore';
import { useArenaAudio } from '../../audio/useArenaAudio';
import { Countdown } from './Countdown';
import { PullDeltaBadge } from './PullDeltaBadge';
import { useArenaMotion, ARENA_TRAVEL_PX } from './useArenaMotion';

const FINISHED_RESULT = buildGameResult(
  { ...makeSession(), winner: 'blue' },
  'questions_exhausted',
  T0 + 60_000,
);

vi.mock('../../audio/sfx', () => ({
  playSfx: vi.fn(),
  unlockAudio: vi.fn(),
  setSfxEnabled: vi.fn(),
  isSfxEnabled: vi.fn(() => false),
  __resetAudio: vi.fn(),
}));

const { playSfx } = await import('../../audio/sfx');
const playSfxMock = playSfx as unknown as Mock;

beforeEach(() => {
  playSfxMock.mockReset();
});

afterEach(() => {
  cleanup();
  resetStore();
  vi.useRealTimers();
});

/**
 * Hosts the motion hook on a bare element and counts its React renders, which
 * is how the tests below prove animation happens without one.
 */
function MotionHost({ onRender }: { onRender?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useArenaMotion(ref);
  return (
    <Profiler id="motion" onRender={() => onRender?.()}>
      <div ref={ref} data-testid="root" />
    </Profiler>
  );
}

const cssVar = (name: string): string =>
  screen.getByTestId('root').style.getPropertyValue(name);

/** Applies a pull the way the socket layer does. */
function pull(teamId: TeamId, ropePosition: number, streak = 1): void {
  act(() =>
    useGameStore.getState().applyPull({
      teamId,
      playerId: 'p1' as PlayerId,
      pull: 0.055,
      streak,
      ropePosition,
      score: 1,
    }),
  );
}

describe('rope motion', () => {
  it('writes the rope position as a CSS custom property', () => {
    seedStore(makeState({ ropePosition: 0.4 }));
    render(<MotionHost />);

    expect(Number(cssVar('--rope-pos'))).toBeCloseTo(0.4);
    expect(cssVar('--rope-travel')).toBe(`${ARENA_TRAVEL_PX}px`);
  });

  it('is deterministic: the same rope position always yields the same frame', () => {
    seedStore(makeState({ ropePosition: -0.375 }));
    const first = render(<MotionHost />);
    const a = cssVar('--rope-pos');
    first.unmount();

    seedStore(makeState({ ropePosition: -0.375 }));
    render(<MotionHost />);

    expect(cssVar('--rope-pos')).toBe(a);
  });

  it('clamps beyond the ends of the rope', () => {
    seedStore(makeState({ ropePosition: 3 }));
    render(<MotionHost />);

    expect(Number(cssVar('--rope-pos'))).toBe(1);
  });

  it('moves the rope without rerendering React', () => {
    seedStore(makeState({ ropePosition: 0 }));
    const onRender = vi.fn();
    render(<MotionHost onRender={onRender} />);

    const rendersAfterMount = onRender.mock.calls.length;
    expect(Number(cssVar('--rope-pos'))).toBe(0);

    pull('red', 0.25);

    // This is the whole point of the phase: the frame changed and React did not
    // run again.
    expect(Number(cssVar('--rope-pos'))).toBeCloseTo(0.25);
    expect(onRender.mock.calls.length).toBe(rendersAfterMount);
  });
});

describe('tension and streak tiers', () => {
  it('glows only on the side that is ahead', () => {
    seedStore(makeState({ ropePosition: -0.5 }));
    render(<MotionHost />);

    expect(Number(cssVar('--tension-blue'))).toBeCloseTo(0.5);
    expect(Number(cssVar('--tension-red'))).toBe(0);
  });

  it('scales tension by how close the leader is to winning, not by distance alone', () => {
    const state = makeState({ ropePosition: 0.5 });
    // Halving the win threshold makes the same rope position twice as tense.
    seedStore({ ...state, rules: { ...DEFAULT_RULES, winThreshold: 0.5 } });
    render(<MotionHost />);

    expect(Number(cssVar('--tension-red'))).toBe(1);
  });

  it('raises the streak tier from the same rules the server scores with', () => {
    const state = makeState();
    seedStore({
      ...state,
      teams: { ...state.teams, blue: { ...state.teams.blue, streak: 5 } },
    });
    render(<MotionHost />);

    expect(cssVar('--streak-blue')).toBe('2');
    expect(cssVar('--streak-red')).toBe('0');
  });
});

describe('bracing', () => {
  it('braces the team that landed the pull, then releases', () => {
    vi.useFakeTimers();
    seedStore(makeState());
    render(<MotionHost />);

    expect(cssVar('--lean-red')).toBe('');

    pull('red', 0.1);
    expect(cssVar('--lean-red')).toBe('1');
    expect(cssVar('--lean-blue')).toBe('');

    act(() => void vi.advanceTimersByTime(1000));
    expect(cssVar('--lean-red')).toBe('0');
  });
});

describe('PullDeltaBadge', () => {
  it('reports the pull in metres, signed toward the winning side', () => {
    seedStore(makeState());
    const { container } = render(<PullDeltaBadge />);

    pull('blue', -0.055);

    // 0.055 of a 4m half-arena rounds to 0.2m, pulled left, so it reads negative.
    expect(container.textContent).toContain('\u22120.2m');
  });

  it('shows the streak multiplier only once a streak is worth something', () => {
    seedStore(makeState());
    const { container } = render(<PullDeltaBadge />);

    pull('red', 0.055, 1);
    expect(container.textContent).not.toContain('1x');

    pull('red', 0.11, 4);
    expect(container.textContent).toContain('4x');
  });
});

describe('arena audio', () => {
  function AudioHost({ enabled = true }: { enabled?: boolean }) {
    useArenaAudio(enabled);
    return null;
  }

  it('sounds a different tone for each team, so a teacher can hear who scored', () => {
    seedStore(makeState());
    render(<AudioHost />);

    pull('blue', -0.055);
    expect(playSfxMock).toHaveBeenLastCalledWith('pullBlue');

    pull('red', 0);
    expect(playSfxMock).toHaveBeenLastCalledWith('pullRed');
  });

  it('does not replay the last pull when the display attaches mid-match', () => {
    seedStore(makeState());
    pull('red', 0.055);
    playSfxMock.mockReset();

    render(<AudioHost />);

    expect(playSfxMock).not.toHaveBeenCalled();
  });

  it('marks a round nobody won, but stays quiet when an answer already did', () => {
    seedStore(makeState());
    render(<AudioHost />);

    act(() => useGameStore.getState().applyResolution(0, 'timeout'));
    expect(playSfxMock).toHaveBeenLastCalledWith('roundEnd');

    playSfxMock.mockReset();
    act(() => useGameStore.getState().applyResolution(1, 'both_locked'));
    expect(playSfxMock).not.toHaveBeenCalled();
  });

  it('celebrates the result exactly once', () => {
    const state = makeState();
    seedStore(state);
    render(<AudioHost />);

    const result = { ...FINISHED_RESULT };
    act(() => useGameStore.getState().setResult(result, state));
    act(() => useGameStore.getState().setResult(result, state));

    expect(playSfxMock.mock.calls.filter(([name]) => name === 'victory')).toHaveLength(1);
  });
});

describe('Countdown', () => {
  it('shows nothing outside the countdown', () => {
    seedStore(makeState());
    const { container } = render(<Countdown />);

    expect(container.firstChild).toBeNull();
  });

  it('counts the class in and sounds a tick per second', () => {
    const state = makeState({ stayInLobby: true });
    seedStore({ ...state, status: 'countdown', countdownEndsAt: Date.now() + 2500 });

    render(<Countdown />);

    expect(screen.getByText('Get ready')).toBeDefined();
    expect(playSfxMock).toHaveBeenCalledWith('tick');
  });
});
