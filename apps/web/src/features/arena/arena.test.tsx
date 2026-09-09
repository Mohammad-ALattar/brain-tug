import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ropeToMetres } from '@braintug/shared';
import { makeState, resetStore, seedStore } from '../../test/fixtures';
import { useGameStore } from '../../store/gameStore';
import { AnswerDisplay } from './AnswerDisplay';
import { MirroredKeypad } from './MirroredKeypad';
import { PullingBanner } from './PullingBanner';
import { QuestionCard } from './QuestionCard';
import { RopePosition } from './RopePosition';
import { TeamStreak } from './TeamStreak';
import { TopGameHeader } from './TopGameHeader';
import { TugOfWarArena } from './TugOfWarArena';

afterEach(() => {
  cleanup();
  resetStore();
});

describe('QuestionCard', () => {
  it('renders the team\u2019s own prompt', () => {
    const state = makeState();
    seedStore(state);

    render(<QuestionCard teamId="blue" />);

    expect(screen.getByText(/current problem/i)).toBeDefined();
    expect(screen.getByText(new RegExp(state.currentQuestion!.blue.prompt))).toBeDefined();
  });

  it('shows each team a different prompt', () => {
    const state = makeState();
    seedStore(state);

    const { container: blue } = render(<QuestionCard teamId="blue" />);
    const { container: red } = render(<QuestionCard teamId="red" />);

    expect(blue.textContent).toContain(state.currentQuestion!.blue.prompt);
    expect(red.textContent).toContain(state.currentQuestion!.red.prompt);
    expect(state.currentQuestion!.blue.prompt).not.toBe(state.currentQuestion!.red.prompt);
  });

  it('never renders an answer, only the operands', () => {
    const state = makeState();
    seedStore(state);

    const { container } = render(<QuestionCard teamId="blue" />);

    // The projection has no answer field at all, so there is nothing to leak.
    expect(state.currentQuestion!.blue).not.toHaveProperty('answer');
    expect(container.textContent).toContain('?');
  });
});

describe('AnswerDisplay', () => {
  it('masks in-progress typing so the answer cannot be read across the room', () => {
    seedStore(makeState());
    useGameStore.getState().applyDraft('blue', '42');

    const { container } = render(<AnswerDisplay teamId="blue" />);

    expect(screen.getByText(/typing/i)).toBeDefined();
    // Two digits typed, two dots shown, and the digits themselves absent.
    expect(container.textContent).toContain('\u2022\u2022');
    expect(container.textContent).not.toContain('42');
  });

  it('reveals the value once the team locks it in', () => {
    const state = makeState({ lockedTeams: ['blue'] });
    seedStore(state);

    render(<AnswerDisplay teamId="blue" />);

    const locked = state.round!.teams.blue.lockedValue;
    expect(locked).not.toBeNull();
    expect(screen.getByText(/confirmed/i)).toBeDefined();
    expect(screen.getByLabelText(new RegExp(`locked: ${locked}`))).toBeDefined();
  });

  it('shows an empty slot before anyone types', () => {
    seedStore(makeState());
    render(<AnswerDisplay teamId="red" />);
    expect(screen.getByText(/awaiting answer/i)).toBeDefined();
  });

  it('can show digits unmasked when the teacher opts in', () => {
    seedStore(makeState());
    useGameStore.getState().applyDraft('blue', '42');

    const { container } = render(<AnswerDisplay teamId="blue" maskWhileTyping={false} />);

    expect(container.textContent).toContain('42');
    expect(container.textContent).not.toContain('\u2022');
  });
});

describe('MirroredKeypad', () => {
  it('renders every key from the reference layout', () => {
    seedStore(makeState());
    const { container } = render(<MirroredKeypad teamId="blue" />);

    for (const key of ['1', '5', '9', '0', 'C']) {
      expect(container.textContent).toContain(key);
    }
  });

  it('exposes no interactive controls at all', () => {
    seedStore(makeState());
    const { container } = render(<MirroredKeypad teamId="blue" />);

    // The classroom display has no input role, so there is nothing to press.
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('[role="button"]')).toHaveLength(0);
  });

  it('dispatches nothing when a key is clicked', async () => {
    seedStore(makeState());
    const socketSpy = vi.fn();
    const { container } = render(<MirroredKeypad teamId="blue" />);

    const keys = container.querySelectorAll('div.grid > div');
    expect(keys.length).toBeGreaterThan(0);

    const before = JSON.stringify(useGameStore.getState().state);
    for (const key of Array.from(keys).slice(0, 4)) {
      await userEvent.click(key);
    }

    // No handler, no emit, no state change.
    expect(socketSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(useGameStore.getState().state)).toBe(before);
    expect(useGameStore.getState().drafts.blue).toBe('');
  });

  it('highlights the most recently mirrored digit', () => {
    seedStore(makeState());
    useGameStore.getState().applyDraft('blue', '17');

    const { container } = render(<MirroredKeypad teamId="blue" />);
    const highlighted = container.querySelectorAll('.bg-blueteam-600');

    // Exactly the last key typed is highlighted.
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]!.textContent).toBe('7');
  });
});

describe('TopGameHeader', () => {
  it('shows the shared question counter and both scores', () => {
    seedStore(makeState({ totalQuestions: 20 }));
    render(<TopGameHeader />);

    expect(screen.getByText(/question 1 \/ 20/i)).toBeDefined();
    expect(screen.getAllByText(/score/i).length).toBe(2);
  });

  it('reflects a score after a pull', () => {
    seedStore(makeState({ lockedTeams: ['blue'] }));
    render(<TopGameHeader />);

    // One correct answer for blue.
    expect(screen.getByText('1')).toBeDefined();
  });

  it('shows a lobby label before the game starts', () => {
    const state = makeState();
    seedStore({ ...state, status: 'lobby', currentQuestionIndex: -1 });

    render(<TopGameHeader />);
    expect(screen.getByText(/waiting in lobby/i)).toBeDefined();
  });
});

describe('TugOfWarArena across rope positions', () => {
  const positions = [-1, -0.5, 0, 0.5, 1];

  it.each(positions)('renders at rope position %s', (ropePosition) => {
    seedStore(makeState({ ropePosition }));
    const { container } = render(<TugOfWarArena />);
    expect(container.firstChild).toBeTruthy();
  });

  it('positions the rope from the CSS custom property, never an inline transform', () => {
    seedStore(makeState({ ropePosition: 0.5 }));
    const { container } = render(<TugOfWarArena />);

    // The transform lives in `.bt-rope-track` and reads `--rope-pos`, which
    // `useArenaMotion` writes. An inline transform here would mean rope motion
    // had regressed onto the React render path.
    const track = container.querySelector('.bt-rope-track') as HTMLElement | null;
    expect(track).not.toBeNull();
    expect(track!.style.transform).toBe('');
    expect(container.querySelector('[style*="translateX("]')).toBeNull();
  });

  it('renders a marker and both tension layers for the CSS to drive', () => {
    seedStore(makeState({ ropePosition: -0.5 }));
    const { container } = render(<TugOfWarArena />);

    expect(container.querySelector('.bt-rope-marker')).not.toBeNull();
    expect(container.querySelector('.bt-tension-blue')).not.toBeNull();
    expect(container.querySelector('.bt-tension-red')).not.toBeNull();
  });
});

describe('PullingBanner', () => {
  it('reports the rope at centre when nobody leads', () => {
    seedStore(makeState({ ropePosition: 0 }));
    render(<PullingBanner />);
    expect(screen.getByText(/all square/i)).toBeDefined();
  });

  it('names the leading team and the distance in metres', () => {
    const state = makeState({ ropePosition: 0.5 });
    seedStore(state);

    render(<PullingBanner />);

    const metres = Math.abs(ropeToMetres(state.rules, 0.5));
    expect(screen.getByText(new RegExp(`${state.teams.red.name} pulling`, 'i'))).toBeDefined();
    expect(screen.getByText(new RegExp(`${metres.toFixed(1)}m`))).toBeDefined();
  });

  it('names blue when the rope is negative', () => {
    const state = makeState({ ropePosition: -0.3 });
    seedStore(state);
    render(<PullingBanner />);
    expect(screen.getByText(new RegExp(`${state.teams.blue.name} pulling`, 'i'))).toBeDefined();
  });
});

describe('RopePosition scale', () => {
  it('labels the goals and the centre from the rules', () => {
    const state = makeState();
    seedStore(state);

    render(<RopePosition rules={state.rules} />);
    const half = state.rules.arenaHalfMetres;

    expect(screen.getByText(/center 0m/i)).toBeDefined();
    // Both goals are labelled, distinguished by sign.
    expect(screen.getByText(`\u2212${half}m advantage`)).toBeDefined();
    expect(screen.getByText(`+${half}m advantage`)).toBeDefined();
  });
});

describe('TeamStreak', () => {
  it('shows the unboosted tier at the start', () => {
    seedStore(makeState());
    render(<TeamStreak teamId="blue" />);
    expect(screen.getByText(/steady/i)).toBeDefined();
    expect(screen.getByText(/streak 0/i)).toBeDefined();
  });

  it('shows the multiplier tier once a streak builds', () => {
    const state = makeState();
    seedStore({
      ...state,
      teams: { ...state.teams, blue: { ...state.teams.blue, streak: 5 } },
    });

    render(<TeamStreak teamId="blue" />);
    expect(screen.getByText(/full force/i)).toBeDefined();
  });
});
