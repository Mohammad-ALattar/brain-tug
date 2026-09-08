import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnswerOutcome, GameStateView, QuestionId } from '@mtow/shared';
import { buildGameResult } from '@mtow/shared';
import { makeSession, makeState, playerOn, resetStore, seedStore } from '../../test/fixtures';
import { useGameStore } from '../../store/gameStore';
import { AnswerFeedback } from './AnswerFeedback';
import { StudentController } from './StudentController';
import { StudentJoinForm } from './StudentJoinForm';

vi.mock('../../realtime/socket', () => ({
  request: vi.fn(),
  notify: vi.fn(),
  getSocket: vi.fn(() => ({ connected: true, on: vi.fn(), off: vi.fn(), emit: vi.fn() })),
}));

const { request, notify } = await import('../../realtime/socket');
const requestMock = request as unknown as Mock;
const notifyMock = notify as unknown as Mock;

beforeEach(() => {
  requestMock.mockReset();
  notifyMock.mockReset();
});

afterEach(() => {
  cleanup();
  resetStore();
  vi.useRealTimers();
});

/** Seats this client as the first player on blue and renders the controller. */
function renderAsBluePlayer(state: GameStateView = makeState()) {
  const me = playerOn(state, 'blue', 0);
  seedStore(state, { playerId: me.id, teamId: 'blue' });
  const view = render(<StudentController teamId="blue" playerName={me.name} onLeave={vi.fn()} />);
  return { ...view, state, me };
}

/** Presses a keypad key the way a finger does: on pointer-down. */
function pressKey(label: string): void {
  fireEvent.pointerDown(screen.getByRole('button', { name: label }));
}

describe('answer assembly', () => {
  it('builds a multi-digit answer from keypad presses', () => {
    renderAsBluePlayer();

    pressKey('4');
    pressKey('2');

    expect(screen.getByLabelText('Your answer').textContent).toContain('42');
  });

  it('removes the last digit on backspace and empties on clear', () => {
    renderAsBluePlayer();

    pressKey('1');
    pressKey('2');
    pressKey('3');
    pressKey('Backspace');
    expect(screen.getByLabelText('Your answer').textContent).toContain('12');

    pressKey('Clear');
    expect(screen.getByLabelText('Your answer').textContent).toContain('Tap the numbers');
  });

  it('refuses a leading zero, so 07 can never be submitted', () => {
    renderAsBluePlayer();

    pressKey('0');
    expect(screen.getByLabelText('Your answer').textContent).toContain('Tap the numbers');

    pressKey('7');
    pressKey('0');
    expect(screen.getByLabelText('Your answer').textContent).toContain('70');
  });

  it('caps the answer length, so a stuck finger cannot overflow the field', () => {
    renderAsBluePlayer();

    for (let i = 0; i < 12; i += 1) pressKey('9');

    expect(screen.getByLabelText('Your answer').textContent).toContain('999999');
    expect(screen.getByLabelText('Your answer').textContent).not.toContain('9999999');
  });

  it('accepts digits from a physical keyboard, for a teacher on a laptop', () => {
    renderAsBluePlayer();

    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: '6' });

    expect(screen.getByLabelText('Your answer').textContent).toContain('56');
  });
});

describe('submission', () => {
  const correct: AnswerOutcome = {
    status: 'correct',
    questionId: 'q' as QuestionId,
    pull: 0.055,
    points: 1,
    streak: 1,
    elapsedMs: 1200,
  };

  it('submits the typed value against the team\u2019s own question id', async () => {
    requestMock.mockResolvedValue(correct);
    const { state } = renderAsBluePlayer();

    pressKey('2');
    pressKey('0');
    await userEvent.click(screen.getByRole('button', { name: /lock it in/i }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('submit_answer', {
        questionId: state.currentQuestion!.blue.id,
        value: '20',
      }),
    );
  });

  it('never sends a score, rope position or team, only the answer', async () => {
    requestMock.mockResolvedValue(correct);
    renderAsBluePlayer();

    pressKey('9');
    await userEvent.click(screen.getByRole('button', { name: /lock it in/i }));

    await waitFor(() => expect(requestMock).toHaveBeenCalled());
    const payload = requestMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['questionId', 'value']);
  });

  it('closes the keypad on the acknowledgement, not on the next broadcast', async () => {
    requestMock.mockResolvedValue(correct);
    renderAsBluePlayer();

    pressKey('2');
    pressKey('0');
    await userEvent.click(screen.getByRole('button', { name: /lock it in/i }));

    // The seeded state still shows the round open, yet the pad must be gone.
    await waitFor(() => expect(screen.getByText(/answer sent/i)).toBeDefined());
    expect(screen.queryByRole('button', { name: /lock it in/i })).toBeNull();
  });

  it('keeps the attempt when the submission never reaches the server', async () => {
    requestMock.mockRejectedValue(new Error('The server did not respond.'));
    renderAsBluePlayer();

    pressKey('2');
    pressKey('0');
    await userEvent.click(screen.getByRole('button', { name: /lock it in/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /lock it in/i })).toBeDefined(),
    );
    expect(screen.getByLabelText('Your answer').textContent).toContain('20');
  });
});

describe('draft mirroring', () => {
  it('relays typing to the classroom display without an acknowledgement', async () => {
    const { state } = renderAsBluePlayer();

    pressKey('4');

    await waitFor(() =>
      expect(notifyMock).toHaveBeenCalledWith('answer_draft', {
        questionId: state.currentQuestion!.blue.id,
        value: '4',
      }),
    );
  });

  it('throttles a burst of keys but still relays the final value', async () => {
    vi.useFakeTimers();
    renderAsBluePlayer();

    // Six keys inside one throttle window: the first goes immediately, the rest
    // collapse into a single trailing message.
    for (const key of ['1', '2', '3', '4', '5', '6']) pressKey(key);
    expect(notifyMock.mock.calls.length).toBeLessThan(6);

    await vi.advanceTimersByTimeAsync(200);

    const values = notifyMock.mock.calls.map((call) => (call[1] as { value: string }).value);
    expect(values.at(-1)).toBe('123456');
    expect(notifyMock.mock.calls.length).toBeLessThanOrEqual(2);
  });
});

describe('lockout and wait states', () => {
  it('waits for the teacher while the game is in the lobby', () => {
    renderAsBluePlayer(makeState({ stayInLobby: true }));

    expect(screen.getByText(/waiting for your teacher/i)).toBeDefined();
    expect(screen.queryByRole('group', { name: /answer keypad/i })).toBeNull();
  });

  it('locks out a player who has already spent their attempt', () => {
    renderAsBluePlayer(makeState({ wrongAttempts: [['blue', 0]] }));

    expect(screen.getByText(/one attempt per question/i)).toBeDefined();
    expect(screen.queryByRole('group', { name: /answer keypad/i })).toBeNull();
  });

  it('tells a player when a teammate has already locked the answer in', () => {
    // Locked by player 0, so player 1 is shut out without having answered.
    const state = makeState({ lockedTeams: ['blue'] });
    const me = playerOn(state, 'blue', 1);
    seedStore(state, { playerId: me.id, teamId: 'blue' });

    render(<StudentController teamId="blue" playerName={me.name} onLeave={vi.fn()} />);

    expect(screen.getByText(/teammate got it/i)).toBeDefined();
    expect(screen.queryByRole('group', { name: /answer keypad/i })).toBeNull();
  });

  it('keeps the keypad live when the other team locks in', () => {
    renderAsBluePlayer(makeState({ lockedTeams: ['red'] }));

    expect(screen.getByRole('group', { name: /answer keypad/i })).toBeDefined();
  });
});

describe('end of match', () => {
  /** A finished game with a result, as `game_finished` leaves the store. */
  function seedFinished() {
    const state = makeState();
    const me = playerOn(state, 'blue');
    const finished: GameStateView = { ...state, status: 'finished', winner: 'blue' };
    seedStore(finished, { playerId: me.id, teamId: 'blue' });
    useGameStore.setState({
      result: buildGameResult({ ...makeSession(), winner: 'blue' }, 'ended_by_host', Date.now()),
    });
    return me;
  }

  it('shows the final result and the student\u2019s own contribution', () => {
    const me = seedFinished();
    render(<StudentController teamId="blue" playerName={me.name} onLeave={vi.fn()} />);

    expect(screen.getByText(/final result/i)).toBeDefined();
    expect(screen.getByText(/your team won/i)).toBeDefined();
    expect(screen.getByText(/accuracy/i)).toBeDefined();

    // The placeholder must not be what a child is left looking at.
    expect(screen.queryByText(/waiting for the final scores/i)).toBeNull();
  });

  it('offers a way into the next match, since it has a new room code', async () => {
    const me = seedFinished();
    const onLeave = vi.fn();
    render(<StudentController teamId="blue" playerName={me.name} onLeave={onLeave} />);

    await userEvent.click(screen.getByRole('button', { name: /join another game/i }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});

describe('AnswerFeedback', () => {
  it('reveals the correct answer only after the attempt is spent', () => {
    seedStore(makeState());
    render(
      <AnswerFeedback
        outcome={{
          status: 'incorrect',
          questionId: 'q' as QuestionId,
          correctAnswer: 20,
          elapsedMs: 900,
        }}
      />,
    );

    expect(screen.getByText(/not quite/i)).toBeDefined();
    expect(screen.getByText(/the answer was 20/i)).toBeDefined();
  });

  it('explains a rejection in words rather than an error code', () => {
    seedStore(makeState());
    render(<AnswerFeedback outcome={{ status: 'rejected', reason: 'team_already_locked' }} />);

    expect(screen.getByText(/a teammate already got this one/i)).toBeDefined();
  });

  it('reports the pull in metres using the same rules the server scored with', () => {
    seedStore(makeState());
    const { container } = render(
      <AnswerFeedback
        outcome={{
          status: 'correct',
          questionId: 'q' as QuestionId,
          // 0.25 of a 4m half-arena is 1.0m.
          pull: 0.25,
          points: 1,
          streak: 1,
          elapsedMs: 500,
        }}
      />,
    );

    expect(container.textContent).toContain('1.0m');
  });
});

describe('StudentJoinForm', () => {
  it('will not submit until both a room code and a name are given', async () => {
    const onJoin = vi.fn();
    render(<StudentJoinForm error={null} busy={false} onJoin={onJoin} />);

    const submit = screen.getByRole('button', { name: /join the game/i });
    expect(submit).toHaveProperty('disabled', true);

    await userEvent.type(screen.getByLabelText(/room code/i), 'abc123');
    expect(submit).toHaveProperty('disabled', true);

    await userEvent.type(screen.getByLabelText(/your name/i), 'Sam');
    expect(submit).toHaveProperty('disabled', false);
  });

  it('upper-cases the code as it is typed and omits the team so the server balances', async () => {
    const onJoin = vi.fn();
    render(<StudentJoinForm error={null} busy={false} onJoin={onJoin} />);

    await userEvent.type(screen.getByLabelText(/room code/i), 'abc123');
    await userEvent.type(screen.getByLabelText(/your name/i), '  Sam  ');
    await userEvent.click(screen.getByRole('button', { name: /join the game/i }));

    expect(onJoin).toHaveBeenCalledWith({ roomCode: 'ABC123', name: 'Sam' });
  });

  it('sends an explicit team when the student picks one', async () => {
    const onJoin = vi.fn();
    render(
      <StudentJoinForm initialRoomCode="ABC123" initialName="Sam" error={null} busy={false} onJoin={onJoin} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Red' }));
    await userEvent.click(screen.getByRole('button', { name: /join the game/i }));

    expect(onJoin).toHaveBeenCalledWith({ roomCode: 'ABC123', name: 'Sam', teamId: 'red' });
  });

  it('surfaces a join failure as an alert', () => {
    render(
      <StudentJoinForm error="That room code does not exist." busy={false} onJoin={vi.fn()} />,
    );

    expect(screen.getByRole('alert').textContent).toContain('does not exist');
  });
});
