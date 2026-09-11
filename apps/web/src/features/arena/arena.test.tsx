import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import { initTestI18n, renderWithI18n } from '../../test/i18n';
import userEvent from '@testing-library/user-event';
import { buildGameResult, ropeToMetres, type PublicQuestion, type QuestionId } from '@braintug/shared';
import { T0 } from '@braintug/shared/testing';
import { makeSession, makeState, resetStore, seedStore } from '../../test/fixtures';
import { useGameStore } from '../../store/gameStore';
import { AnswerDisplay } from './modes/tugOfWar/AnswerDisplay';
import { MirroredKeypad } from './modes/tugOfWar/MirroredKeypad';
import { PullingBanner } from './modes/tugOfWar/PullingBanner';
import { QuestionCard } from './modes/tugOfWar/QuestionCard';
import { RopePosition } from './modes/tugOfWar/RopePosition';
import { TeamPanel } from './modes/tugOfWar/TeamPanel';
import { TeamStreak } from './shell/TeamStreak';
import { TopGameHeader } from './shell/TopGameHeader';
import { TugOfWarArena } from './modes/tugOfWar/TugOfWarArena';
import { VictoryScreen } from './shell/VictoryScreen';

beforeEach(async () => {
  await initTestI18n('en');
});

afterEach(() => {
  cleanup();
  resetStore();
});

describe('QuestionCard', () => {
  it('renders the team\u2019s own prompt', () => {
    const state = makeState();
    seedStore(state);

    renderWithI18n(<QuestionCard teamId="blue" />);

    expect(screen.getByText(/current problem/i)).toBeDefined();
    expect(screen.getByText(new RegExp(state.currentQuestion!.blue.prompt))).toBeDefined();
  });

  it('shows each team a different prompt', () => {
    const state = makeState();
    seedStore(state);

    const { container: blue } = renderWithI18n(<QuestionCard teamId="blue" />);
    const { container: red } = renderWithI18n(<QuestionCard teamId="red" />);

    expect(blue.textContent).toContain(state.currentQuestion!.blue.prompt);
    expect(red.textContent).toContain(state.currentQuestion!.red.prompt);
    expect(state.currentQuestion!.blue.prompt).not.toBe(state.currentQuestion!.red.prompt);
  });

  it('never renders an answer, only the operands', () => {
    const state = makeState();
    seedStore(state);

    const { container } = renderWithI18n(<QuestionCard teamId="blue" />);

    // The projection has no answer field at all, so there is nothing to leak.
    expect(state.currentQuestion!.blue).not.toHaveProperty('answer');
    expect(container.textContent).toContain('?');
  });

  it('renders a non-math PublicQuestion without an equation or numeric keypad', () => {
    const question: PublicQuestion = {
      id: 'mc1' as QuestionId,
      subject: 'science',
      difficulty: 'easy',
      type: 'multiple_choice',
      prompt: 'Which planet is known as the Red Planet?',
      options: [
        { id: 'a', text: 'Mars' },
        { id: 'b', text: 'Earth' },
        { id: 'c', text: 'Venus' },
        { id: 'd', text: 'Jupiter' },
      ],
    };
    const state = makeState();
    seedStore({
      ...state,
      currentQuestion: { blue: question, red: question },
    });

    const { container } = renderWithI18n(<TeamPanel teamId="blue" terminalNumber={1} />);

    expect(screen.getByText(/which planet is known as the red planet/i)).toBeDefined();
    expect(screen.getByText('Mars')).toBeDefined();
    expect(container.textContent).not.toMatch(/=\s*\?/);
    expect(container.textContent).not.toContain('<');
  });
});

describe('AnswerDisplay', () => {
  it('masks in-progress typing so the answer cannot be read across the room', () => {
    seedStore(makeState());
    useGameStore.getState().applyDraft('blue', '42');

    const { container } = renderWithI18n(<AnswerDisplay teamId="blue" />);

    expect(screen.getByText(/typing/i)).toBeDefined();
    // Two digits typed, two dots shown, and the digits themselves absent.
    expect(container.textContent).toContain('\u2022\u2022');
    expect(container.textContent).not.toContain('42');
  });

  it('reveals the value once the team locks it in', () => {
    const state = makeState({ lockedTeams: ['blue'] });
    seedStore(state);

    renderWithI18n(<AnswerDisplay teamId="blue" />);

    const locked = state.round!.teams.blue.revealedAnswer;
    expect(locked).not.toBeNull();
    expect(screen.getByText(/confirmed/i)).toBeDefined();
    expect(screen.getByLabelText(new RegExp(`locked: ${locked}`))).toBeDefined();
  });

  it('shows an empty slot before anyone types', () => {
    seedStore(makeState());
    renderWithI18n(<AnswerDisplay teamId="red" />);
    expect(screen.getByText(/awaiting answer/i)).toBeDefined();
  });

  it('can show digits unmasked when the teacher opts in', () => {
    seedStore(makeState());
    useGameStore.getState().applyDraft('blue', '42');

    const { container } = renderWithI18n(<AnswerDisplay teamId="blue" maskWhileTyping={false} />);

    expect(container.textContent).toContain('42');
    expect(container.textContent).not.toContain('\u2022');
  });
});

describe('MirroredKeypad', () => {
  it('renders every key from the reference layout', () => {
    seedStore(makeState());
    const { container } = renderWithI18n(<MirroredKeypad teamId="blue" />);

    for (const key of ['1', '5', '9', '0', 'C']) {
      expect(container.textContent).toContain(key);
    }
  });

  it('exposes no interactive controls at all', () => {
    seedStore(makeState());
    const { container } = renderWithI18n(<MirroredKeypad teamId="blue" />);

    // The classroom display has no input role, so there is nothing to press.
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('[role="button"]')).toHaveLength(0);
  });

  it('dispatches nothing when a key is clicked', async () => {
    seedStore(makeState());
    const socketSpy = vi.fn();
    const { container } = renderWithI18n(<MirroredKeypad teamId="blue" />);

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

    const { container } = renderWithI18n(<MirroredKeypad teamId="blue" />);
    const highlighted = container.querySelectorAll('.bg-blueteam-600');

    // Exactly the last key typed is highlighted.
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]!.textContent).toBe('7');
  });
});

describe('TopGameHeader', () => {
  it('shows the shared question counter and both scores', () => {
    seedStore(makeState({ totalQuestions: 20 }));
    renderWithI18n(<TopGameHeader />);

    expect(screen.getByText(/question 1 \/ 20/i)).toBeDefined();
    expect(screen.getAllByText(/score/i).length).toBe(2);
  });

  it('reflects a score after a pull', () => {
    seedStore(makeState({ lockedTeams: ['blue'] }));
    renderWithI18n(<TopGameHeader />);

    // One correct answer for blue.
    expect(screen.getByText('1')).toBeDefined();
  });

  it('shows a lobby label before the game starts', () => {
    const state = makeState();
    seedStore({ ...state, status: 'lobby', currentQuestionIndex: -1 });

    renderWithI18n(<TopGameHeader />);
    expect(screen.getByText(/waiting in lobby/i)).toBeDefined();
  });
});

describe('TugOfWarArena across rope positions', () => {
  const positions = [-1, -0.5, 0, 0.5, 1];

  it.each(positions)('renders at rope position %s', (ropePosition) => {
    seedStore(makeState({ ropePosition }));
    const { container } = renderWithI18n(<TugOfWarArena />);
    expect(container.firstChild).toBeTruthy();
  });

  it('positions the rope from the CSS custom property, never an inline transform', () => {
    seedStore(makeState({ ropePosition: 0.5 }));
    const { container } = renderWithI18n(<TugOfWarArena />);

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
    const { container } = renderWithI18n(<TugOfWarArena />);

    expect(container.querySelector('.bt-rope-marker')).not.toBeNull();
    expect(container.querySelector('.bt-tension-blue')).not.toBeNull();
    expect(container.querySelector('.bt-tension-red')).not.toBeNull();
  });
});

describe('PullingBanner', () => {
  it('reports the rope at centre when nobody leads', () => {
    seedStore(makeState({ ropePosition: 0 }));
    renderWithI18n(<PullingBanner />);
    expect(screen.getByText(/all square/i)).toBeDefined();
  });

  it('names the leading team and the distance in metres', () => {
    const state = makeState({ ropePosition: 0.5 });
    seedStore(state);

    renderWithI18n(<PullingBanner />);

    const metres = Math.abs(
      ropeToMetres(
        state.modeState.kind === 'tug_of_war'
          ? state.modeState
          : { kind: 'tug_of_war', ropePosition: 0.5, arenaHalfMetres: 4 },
        0.5,
      ),
    );
    expect(screen.getByText(new RegExp(`${state.teams.red.name} pulling`, 'i'))).toBeDefined();
    expect(screen.getByText(new RegExp(`${metres.toFixed(1)}m`))).toBeDefined();
  });

  it('names blue when the rope is negative', () => {
    const state = makeState({ ropePosition: -0.3 });
    seedStore(state);
    renderWithI18n(<PullingBanner />);
    expect(screen.getByText(new RegExp(`${state.teams.blue.name} pulling`, 'i'))).toBeDefined();
  });
});

describe('RopePosition scale', () => {
  it('labels the goals and the centre from the rules', () => {
    const state = makeState();
    seedStore(state);

    renderWithI18n(<RopePosition halfMetres={state.modeState.kind === 'tug_of_war' ? state.modeState.arenaHalfMetres : 4} />);
    const half = state.modeState.kind === 'tug_of_war' ? state.modeState.arenaHalfMetres : 4;

    expect(screen.getByText(/center 0m/i)).toBeDefined();
    // Both goals are labelled, distinguished by sign.
    expect(screen.getByText(`\u2212${half}m advantage`)).toBeDefined();
    expect(screen.getByText(`+${half}m advantage`)).toBeDefined();
  });
});

describe('TeamStreak', () => {
  it('shows the unboosted tier at the start', () => {
    seedStore(makeState());
    renderWithI18n(<TeamStreak teamId="blue" />);
    expect(screen.getByText(/steady/i)).toBeDefined();
    expect(screen.getByText(/streak 0/i)).toBeDefined();
  });

  it('shows the multiplier tier once a streak builds', () => {
    const state = makeState();
    seedStore({
      ...state,
      teams: { ...state.teams, blue: { ...state.teams.blue, streak: 5 } },
    });

    renderWithI18n(<TeamStreak teamId="blue" />);
    expect(screen.getByText(/full force/i)).toBeDefined();
  });
});

describe('VictoryScreen', () => {
  it('describes a Brain Race finish without rope copy', () => {
    const session = makeSession({ mode: 'brain_race', lockedTeams: ['blue'] });
    const result = buildGameResult({ ...session, winner: 'blue' }, 'target_reached', T0 + 60_000);
    seedStore(makeState({ mode: 'brain_race' }));
    useGameStore.setState({ result });

    renderWithI18n(<VictoryScreen />);

    expect(screen.getByText(/first across the finish line/i)).toBeDefined();
    expect(screen.getAllByText(/finishers/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/top racer/i)).toBeDefined();
    expect(screen.queryByText(/rope/i)).toBeNull();
    expect(screen.queryByText(/puller/i)).toBeNull();
  });
});
