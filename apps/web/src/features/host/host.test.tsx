import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HostToken, RoomCode } from '@braintug/shared';
import { buildGameResult } from '@braintug/shared';
import { T0 } from '@braintug/shared/testing';
import { makeSession, makeState, resetStore, seedStore } from '../../test/fixtures';
import { CreateGameForm } from './CreateGameForm';
import { GameResults } from './GameResults';
import { LobbyRoster } from './LobbyRoster';
import { RoomCodeDisplay } from './RoomCodeDisplay';
import { TeacherControls } from './TeacherControls';

vi.mock('../../realtime/socket', () => ({
  request: vi.fn(() => Promise.resolve(null)),
  notify: vi.fn(),
  getSocket: vi.fn(() => ({ connected: true, on: vi.fn(), off: vi.fn(), emit: vi.fn() })),
}));

const { request } = await import('../../realtime/socket');
const requestMock = request as unknown as Mock;

const HOST_TOKEN = 'ht_test_token_value' as HostToken;

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  resetStore();
});

describe('CreateGameForm', () => {
  it('submits sensible defaults without the teacher touching anything', async () => {
    const onCreate = vi.fn();
    render(<CreateGameForm error={null} busy={false} onCreate={onCreate} />);

    await userEvent.click(screen.getByRole('button', { name: /create match/i }));

    expect(onCreate).toHaveBeenCalledWith({
      operation: 'mixed',
      difficulty: 'easy',
      totalQuestions: 20,
      secondsPerQuestion: 20,
      winThreshold: 1,
      teamNames: {},
    });
  });

  it('carries every chosen setting through to the payload', async () => {
    const onCreate = vi.fn();
    render(<CreateGameForm error={null} busy={false} onCreate={onCreate} />);

    await userEvent.click(screen.getByRole('radio', { name: /division/i }));
    await userEvent.click(screen.getByRole('radio', { name: /hard/i }));
    await userEvent.click(screen.getByRole('radio', { name: /short/i }));
    await userEvent.click(screen.getByRole('button', { name: /more questions/i }));
    await userEvent.click(screen.getByRole('button', { name: /fewer seconds/i }));
    await userEvent.type(screen.getByLabelText(/blue team/i), 'Blue Tigers');
    await userEvent.click(screen.getByRole('button', { name: /create match/i }));

    expect(onCreate).toHaveBeenCalledWith({
      operation: 'division',
      difficulty: 'hard',
      totalQuestions: 25,
      secondsPerQuestion: 15,
      winThreshold: 0.5,
      teamNames: { blue: 'Blue Tigers' },
    });
  });

  it('cannot be stepped past the range the server accepts', async () => {
    const onCreate = vi.fn();
    render(<CreateGameForm error={null} busy={false} onCreate={onCreate} />);

    const fewer = screen.getByRole('button', { name: /fewer questions/i });
    for (let i = 0; i < 10; i += 1) await userEvent.click(fewer);

    await userEvent.click(screen.getByRole('button', { name: /create match/i }));
    const payload = onCreate.mock.calls[0]![0] as { totalQuestions: number };
    expect(payload.totalQuestions).toBe(1);
  });

  it('shows a creation failure as an alert', () => {
    render(<CreateGameForm error="The server is unreachable." busy={false} onCreate={vi.fn()} />);

    expect(screen.getByRole('alert').textContent).toContain('unreachable');
  });
});

describe('RoomCodeDisplay', () => {
  it('shows the code grouped for reading aloud', () => {
    render(<RoomCodeDisplay roomCode={'ACD349' as RoomCode} hostToken={HOST_TOKEN} />);

    expect(screen.getByText('ACD-349')).toBeDefined();
  });

  it('keeps the host token out of the student join link', () => {
    const { container } = render(
      <RoomCodeDisplay roomCode={'ACD349' as RoomCode} hostToken={HOST_TOKEN} />,
    );

    // The token may appear only in the classroom display link, never as text a
    // student could read off the board.
    expect(container.textContent).not.toContain(HOST_TOKEN);
    const arenaLink = screen.getByRole('link', { name: /classroom display/i });
    expect(arenaLink.getAttribute('href')).toContain(`host=${HOST_TOKEN}`);
  });
});

describe('LobbyRoster', () => {
  it('lists both teams with their counts', () => {
    seedStore(makeState({ playersPerTeam: 2, stayInLobby: true }));
    render(<LobbyRoster hostToken={HOST_TOKEN} />);

    expect(screen.getByText(/players \(4\)/i)).toBeDefined();
    expect(screen.getByText(/teams are balanced/i)).toBeDefined();
  });

  it('warns when the teams are lopsided', () => {
    const state = makeState({ playersPerTeam: 2, stayInLobby: true });
    // Drop both red players to make the split 2-0.
    seedStore({ ...state, players: state.players.filter((p) => p.teamId === 'blue') });

    render(<LobbyRoster hostToken={HOST_TOKEN} />);

    expect(screen.getByText(/uneven by 2/i)).toBeDefined();
  });

  it('asks the server to move a player rather than moving them locally', async () => {
    const state = makeState({ playersPerTeam: 1, stayInLobby: true });
    seedStore(state);
    const blue = state.players.find((p) => p.teamId === 'blue')!;

    render(<LobbyRoster hostToken={HOST_TOKEN} />);
    await userEvent.click(screen.getByRole('button', { name: `Move ${blue.name} to red team` }));

    expect(requestMock).toHaveBeenCalledWith('move_player', {
      hostToken: HOST_TOKEN,
      playerId: blue.id,
      teamId: 'red',
    });
  });

  it('removes a player through the host command', async () => {
    const state = makeState({ playersPerTeam: 1, stayInLobby: true });
    seedStore(state);
    const blue = state.players.find((p) => p.teamId === 'blue')!;

    render(<LobbyRoster hostToken={HOST_TOKEN} />);
    await userEvent.click(screen.getByRole('button', { name: `Remove ${blue.name}` }));

    expect(requestMock).toHaveBeenCalledWith('remove_player', {
      hostToken: HOST_TOKEN,
      playerId: blue.id,
    });
  });

  it('hides the move controls once the match is running, matching the server rule', () => {
    const state = makeState({ playersPerTeam: 1 });
    seedStore(state);
    const blue = state.players.find((p) => p.teamId === 'blue')!;

    render(<LobbyRoster hostToken={HOST_TOKEN} />);

    expect(screen.queryByRole('button', { name: `Move ${blue.name} to red team` })).toBeNull();
    expect(screen.getByRole('button', { name: `Remove ${blue.name}` })).toBeDefined();
  });
});

describe('TeacherControls', () => {
  it('will not start a match with an empty team', () => {
    const state = makeState({ playersPerTeam: 1, stayInLobby: true });
    seedStore({ ...state, players: state.players.filter((p) => p.teamId === 'blue') });

    render(<TeacherControls hostToken={HOST_TOKEN} />);

    expect(screen.getByRole('button', { name: /start match/i })).toHaveProperty('disabled', true);
    expect(screen.getByText(/both teams need at least one player/i)).toBeDefined();
  });

  it('starts the match through the server once both teams are seated', async () => {
    seedStore(makeState({ playersPerTeam: 1, stayInLobby: true }));

    render(<TeacherControls hostToken={HOST_TOKEN} />);
    await userEvent.click(screen.getByRole('button', { name: /start match/i }));

    expect(requestMock).toHaveBeenCalledWith('start_game', { hostToken: HOST_TOKEN });
  });

  it('offers pause while live and resume while paused', async () => {
    const state = makeState({ playersPerTeam: 1 });
    seedStore(state);

    render(<TeacherControls hostToken={HOST_TOKEN} />);
    await userEvent.click(screen.getByRole('button', { name: /^pause$/i }));
    expect(requestMock).toHaveBeenCalledWith('pause_game', { hostToken: HOST_TOKEN });

    // Stand in for the server's `game_paused` broadcast landing in the store.
    act(() => seedStore({ ...state, status: 'paused' }));

    await userEvent.click(screen.getByRole('button', { name: /^resume$/i }));
    expect(requestMock).toHaveBeenCalledWith('resume_game', { hostToken: HOST_TOKEN });
  });

  it('requires a confirmation before ending the match', async () => {
    seedStore(makeState({ playersPerTeam: 1 }));

    render(<TeacherControls hostToken={HOST_TOKEN} />);
    await userEvent.click(screen.getByRole('button', { name: /end match/i }));

    // The first press only asks; nothing has been sent yet.
    expect(requestMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /yes, end it/i }));
    expect(requestMock).toHaveBeenCalledWith('end_game', { hostToken: HOST_TOKEN });
  });

  it('lets the teacher back out of ending the match', async () => {
    seedStore(makeState({ playersPerTeam: 1 }));

    render(<TeacherControls hostToken={HOST_TOKEN} />);
    await userEvent.click(screen.getByRole('button', { name: /end match/i }));
    await userEvent.click(screen.getByRole('button', { name: /keep playing/i }));

    expect(requestMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /end match/i })).toBeDefined();
  });
});

describe('GameResults', () => {
  /** A finished match where blue's first player earned the only pull. */
  function finishedResult() {
    const session = makeSession({ playersPerTeam: 2, lockedTeams: ['blue'] });
    return buildGameResult({ ...session, winner: 'blue' }, 'questions_exhausted', T0 + 60_000);
  }

  it('names the winning team and why they won', () => {
    seedStore(makeState());
    const result = finishedResult();

    render(<GameResults result={result} onNewMatch={vi.fn()} />);

    expect(screen.getByText(new RegExp(`${result.teams.blue.name} win`, 'i'))).toBeDefined();
    expect(screen.getByText(/led after every question/i)).toBeDefined();
  });

  it('ranks players by rope contribution, not by raw correct answers', () => {
    seedStore(makeState());
    const result = finishedResult();

    render(<GameResults result={result} onNewMatch={vi.fn()} />);

    const rows = screen.getAllByRole('row').slice(1);
    const puller = result.players.find((p) => p.playerId === result.topPlayerId)!;
    expect(rows[0]!.textContent).toContain(puller.name);
    expect(rows[0]!.textContent).toContain('Top puller');
  });

  it('offers a way straight into the next match', async () => {
    seedStore(makeState());
    const onNewMatch = vi.fn();

    render(<GameResults result={finishedResult()} onNewMatch={onNewMatch} />);
    await userEvent.click(screen.getByRole('button', { name: /another match/i }));

    expect(onNewMatch).toHaveBeenCalled();
  });
});
