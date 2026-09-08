import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  AnswerOutcome,
  CreateGameAck,
  HostAttachAck,
  JoinGameAck,
  RoomCode,
  WatchArenaAck,
} from '@mtow/shared';
import {
  correctAnswer,
  currentQuestionId,
  emit,
  expectOk,
  once,
  startHarness,
  type Harness,
} from '../test/harness.js';

let harness: Harness;

beforeEach(async () => {
  harness = await startHarness();
});

afterEach(async () => {
  await harness.stop();
});

/** Creates a game and returns the host socket plus its credentials. */
async function createGame(overrides: Record<string, unknown> = {}) {
  const host = await harness.connect();
  const ack = expectOk<CreateGameAck>(
    await emit(host, 'create_game', {
      operation: 'multiplication',
      difficulty: 'easy',
      totalQuestions: 5,
      secondsPerQuestion: 20,
      // Skip the "get ready" beat so the suite is not dominated by waiting.
      countdownMs: 0,
      ...overrides,
    }),
  );
  return { host, ...ack };
}

async function joinPlayer(roomCode: RoomCode, name: string, teamId?: 'blue' | 'red') {
  const client = await harness.connect();
  const ack = expectOk<JoinGameAck>(
    await emit(client, 'join_game', { roomCode, name, ...(teamId ? { teamId } : {}) }),
  );
  return { client, ...ack };
}

/**
 * Starts a game with one player per team and waits until the first question is
 * live, returning everything a test needs to submit answers.
 */
async function startedGame(overrides: Record<string, unknown> = {}) {
  const game = await createGame(overrides);
  const blue = await joinPlayer(game.roomCode, 'Blue One', 'blue');
  const red = await joinPlayer(game.roomCode, 'Red One', 'red');

  const questionStarted = once<{ round: unknown }>(blue.client, 'question_started', 10_000);
  expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
  await questionStarted;

  return { game, blue, red };
}

describe('create_game', () => {
  it('returns a room code, a host token and the initial state', async () => {
    const { roomCode, hostToken, state } = await createGame();

    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(hostToken).toBeTruthy();
    expect(state.status).toBe('lobby');
    expect(state.totalQuestions).toBe(5);
    expect(state.ropePosition).toBe(0);
    expect(state.currentQuestion).toBeNull();
  });

  it('rejects invalid settings', async () => {
    const host = await harness.connect();
    const ack = await emit(host, 'create_game', { totalQuestions: 5000, difficulty: 'impossible' });
    expect(ack.ok).toBe(false);
  });

  it('clamps question count and timing into the allowed range', async () => {
    const { state } = await createGame({ totalQuestions: 3, secondsPerQuestion: 5 });
    expect(state.totalQuestions).toBe(3);
    expect(state.config.secondsPerQuestion).toBe(5);
  });

  it('gives each game a distinct room code', async () => {
    const first = await createGame();
    const second = await createGame();
    expect(first.roomCode).not.toBe(second.roomCode);
  });
});

describe('join_game', () => {
  it('seats a player and tells the room', async () => {
    const game = await createGame();
    const arena = await harness.connect();
    expectOk<WatchArenaAck>(await emit(arena, 'watch_arena', { roomCode: game.roomCode }));

    const joinedEvent = once<{ player: { name: string } }>(arena, 'player_joined');
    const blue = await joinPlayer(game.roomCode, 'Amina', 'blue');
    const event = await joinedEvent;

    expect(blue.teamId).toBe('blue');
    expect(blue.playerToken).toBeTruthy();
    expect(event.player.name).toBe('Amina');
  });

  it('accepts a room code typed with a dash and lower case', async () => {
    const game = await createGame();
    const client = await harness.connect();
    const code = game.roomCode.toLowerCase();
    const ack = await emit<'join_game', JoinGameAck>(client, 'join_game', {
      roomCode: `${code.slice(0, 3)}-${code.slice(3)}`,
      name: 'Flexible',
    });
    expect(ack.ok).toBe(true);
  });

  it('refuses an unknown room code', async () => {
    const client = await harness.connect();
    const ack = await emit(client, 'join_game', { roomCode: 'ZZZZZZ', name: 'Lost' });
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.reason).toBe('no_such_game');
  });

  it('refuses a blank name', async () => {
    const game = await createGame();
    const client = await harness.connect();
    const ack = await emit(client, 'join_game', { roomCode: game.roomCode, name: '  ' });
    expect(ack.ok).toBe(false);
  });

  it('balances teams when none is requested', async () => {
    const game = await createGame();
    const first = await joinPlayer(game.roomCode, 'One');
    const second = await joinPlayer(game.roomCode, 'Two');
    expect(first.teamId).toBe('blue');
    expect(second.teamId).toBe('red');
  });
});

describe('start_game', () => {
  it('requires the host token', async () => {
    const game = await createGame();
    await joinPlayer(game.roomCode, 'B', 'blue');
    await joinPlayer(game.roomCode, 'R', 'red');

    const impostor = await harness.connect();
    await emit(impostor, 'watch_arena', { roomCode: game.roomCode });

    const ack = await emit(impostor, 'start_game', { hostToken: 'not-the-real-token-at-all' });
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.reason).toBe('not_host');
    expect(harness.session(game.roomCode).status).toBe('lobby');
  });

  it('refuses a player trying to start the game', async () => {
    const game = await createGame();
    const blue = await joinPlayer(game.roomCode, 'B', 'blue');
    await joinPlayer(game.roomCode, 'R', 'red');

    const ack = await emit(blue.client, 'start_game', { hostToken: game.hostToken });
    // The token is valid but this socket never authenticated as the host.
    expect(ack.ok).toBe(false);
  });

  it('refuses to start with an empty team', async () => {
    const game = await createGame();
    await joinPlayer(game.roomCode, 'Solo', 'blue');

    const ack = await emit(game.host, 'start_game', { hostToken: game.hostToken });
    expect(ack.ok).toBe(false);
  });

  it('runs the countdown then issues a question to each team', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);

    expect(session.status).toBe('active');
    expect(session.round).not.toBeNull();
    expect(session.round!.teams.blue.question.id).not.toBe(session.round!.teams.red.question.id);
    expect(blue.state).toBeDefined();
  });
});

describe('submit_answer - authoritative validation', () => {
  it('accepts a correct answer and moves the rope', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);

    const outcome = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: String(correctAnswer(session, 'blue')),
      }),
    );

    expect(outcome.status).toBe('correct');
    const after = harness.session(game.roomCode);
    expect(after.teams.blue.score).toBe(1);
    expect(after.ropePosition).toBeLessThan(0);
  });

  it('rejects a wrong answer without moving the rope', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);

    const outcome = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: correctAnswer(session, 'blue') + 1,
      }),
    );

    expect(outcome.status).toBe('incorrect');
    expect(harness.session(game.roomCode).ropePosition).toBe(0);
    expect(harness.session(game.roomCode).teams.blue.score).toBe(0);
  });

  it('refuses a duplicate submission from the same player', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);
    const questionId = currentQuestionId(session, 'blue');

    await emit(blue.client, 'submit_answer', {
      questionId,
      value: correctAnswer(session, 'blue') + 1,
    });
    const second = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId,
        value: correctAnswer(session, 'blue'),
      }),
    );

    expect(second).toEqual({ status: 'rejected', reason: 'player_already_answered' });
    expect(harness.session(game.roomCode).teams.blue.score).toBe(0);
  });

  it('refuses a teammate once the team has locked', async () => {
    const game = await createGame();
    const blueOne = await joinPlayer(game.roomCode, 'B1', 'blue');
    const blueTwo = await joinPlayer(game.roomCode, 'B2', 'blue');
    await joinPlayer(game.roomCode, 'R1', 'red');

    const started = once(blueOne.client, 'question_started', 10_000);
    expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
    await started;

    const session = harness.session(game.roomCode);
    const questionId = currentQuestionId(session, 'blue');
    const answer = correctAnswer(session, 'blue');

    expectOk(await emit(blueOne.client, 'submit_answer', { questionId, value: answer }));
    const second = expectOk<AnswerOutcome>(
      await emit(blueTwo.client, 'submit_answer', { questionId, value: answer }),
    );

    expect(second).toEqual({ status: 'rejected', reason: 'team_already_locked' });
    expect(harness.session(game.roomCode).teams.blue.score).toBe(1);
  });

  it('refuses an answer aimed at the other team\u2019s question', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);

    const outcome = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'red'),
        value: correctAnswer(session, 'red'),
      }),
    );

    expect(outcome).toEqual({ status: 'rejected', reason: 'stale_question' });
    expect(harness.session(game.roomCode).ropePosition).toBe(0);
  });

  it('refuses a stale question id', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);

    const outcome = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: 'q_made_up',
        value: correctAnswer(session, 'blue'),
      }),
    );

    expect(outcome).toEqual({ status: 'rejected', reason: 'stale_question' });
  });

  it('refuses a submission from a socket that never joined', async () => {
    const { game } = await startedGame();
    const session = harness.session(game.roomCode);
    const stranger = await harness.connect();

    const ack = await emit(stranger, 'submit_answer', {
      questionId: currentQuestionId(session, 'blue'),
      value: correctAnswer(session, 'blue'),
    });

    expect(ack.ok).toBe(false);
    expect(harness.session(game.roomCode).ropePosition).toBe(0);
  });

  it('refuses submissions while paused', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);
    expectOk(await emit(game.host, 'pause_game', { hostToken: game.hostToken }));

    const outcome = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: correctAnswer(session, 'blue'),
      }),
    );

    expect(outcome).toEqual({ status: 'rejected', reason: 'game_paused' });
  });

  it('refuses submissions once the game has ended', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);
    expectOk(await emit(game.host, 'end_game', { hostToken: game.hostToken }));

    const outcome = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: correctAnswer(session, 'blue'),
      }),
    );

    expect(outcome).toEqual({ status: 'rejected', reason: 'game_not_active' });
  });

  it('treats malformed input as a rejection, not a wrong answer', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);

    const outcome = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: 'twenty',
      }),
    );

    expect(outcome).toEqual({ status: 'rejected', reason: 'malformed_answer' });
    // The attempt was not spent, so a real answer still works.
    const retry = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: correctAnswer(session, 'blue'),
      }),
    );
    expect(retry.status).toBe('correct');
  });
});

describe('submit_answer - client is never authoritative', () => {
  it('ignores a client-supplied score, rope position and pull', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);

    expectOk(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: correctAnswer(session, 'blue'),
        // None of these are in the schema and must be stripped.
        score: 9999,
        ropePosition: -0.99,
        pull: 5,
        streak: 42,
      }),
    );

    const after = harness.session(game.roomCode);
    expect(after.teams.blue.score).toBe(1);
    expect(after.teams.blue.streak).toBe(1);
    expect(Math.abs(after.ropePosition)).toBeLessThan(0.2);
  });

  it('never broadcasts the correct answer or the host token', async () => {
    const game = await createGame();
    const arena = await harness.connect();
    expectOk(await emit(arena, 'watch_arena', { roomCode: game.roomCode }));
    await joinPlayer(game.roomCode, 'B', 'blue');
    await joinPlayer(game.roomCode, 'R', 'red');

    // Capture everything the display is told, rather than racing one listener.
    const seen: unknown[] = [];
    for (const event of ['question_started', 'game_state_updated', 'pull_applied'] as const) {
      arena.on(event, (payload: unknown) => seen.push(payload));
    }

    const questionStarted = once<{ round: unknown }>(arena, 'question_started', 10_000);
    expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
    await questionStarted;

    const session = harness.session(game.roomCode);
    const blue = session.teams.blue.playerIds[0]!;
    expect(blue).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(seen.length).toBeGreaterThan(0);
    const wire = JSON.stringify(seen);
    expect(wire).not.toContain('"answer"');
    expect(wire).not.toContain(session.hostToken);
    for (const token of Object.keys(session.playerTokens)) {
      expect(wire).not.toContain(token);
    }
  });

  it('delivers an answer outcome only to the player who submitted', async () => {
    const { game, blue, red } = await startedGame();
    const session = harness.session(game.roomCode);

    let redSawOutcome = false;
    red.client.on('answer_result', () => {
      redSawOutcome = true;
    });

    // A wrong answer reveals the correct value, so it must stay private.
    expectOk(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: correctAnswer(session, 'blue') + 3,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(redSawOutcome).toBe(false);
  });
});

describe('host controls', () => {
  it('pauses and resumes, preserving the remaining time', async () => {
    const { game } = await startedGame({ secondsPerQuestion: 30 });

    expectOk(await emit(game.host, 'pause_game', { hostToken: game.hostToken }));
    const paused = harness.session(game.roomCode);
    expect(paused.status).toBe('paused');
    expect(paused.pausedRemainingMs).toBeGreaterThan(0);
    const remaining = paused.pausedRemainingMs!;

    await new Promise((resolve) => setTimeout(resolve, 250));

    expectOk(await emit(game.host, 'resume_game', { hostToken: game.hostToken }));
    const resumed = harness.session(game.roomCode);
    expect(resumed.status).toBe('active');
    // The pause did not eat into the round's clock.
    expect(resumed.round!.endsAt - Date.now()).toBeGreaterThan(remaining - 200);
  });

  it('skips a question without awarding either team', async () => {
    const { game, blue } = await startedGame();
    const skipped = once<{ index: number }>(blue.client, 'question_skipped');

    expectOk(await emit(game.host, 'skip_question', { hostToken: game.hostToken }));
    const event = await skipped;

    expect(event.index).toBe(0);
    const after = harness.session(game.roomCode);
    expect(after.ropePosition).toBe(0);
    expect(after.teams.blue.score).toBe(0);
  });

  it('refuses host actions carrying a player token', async () => {
    const { game, blue } = await startedGame();

    for (const action of ['pause_game', 'skip_question', 'end_game'] as const) {
      const ack = await emit(blue.client, action, { hostToken: blue.playerToken });
      expect(ack.ok).toBe(false);
    }
    expect(harness.session(game.roomCode).status).toBe('active');
  });

  it('ends the game and broadcasts a result', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);

    expectOk(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: correctAnswer(session, 'blue'),
      }),
    );

    const finished = once<{ result: { winner: string; reason: string } }>(
      blue.client,
      'game_finished',
    );
    expectOk(await emit(game.host, 'end_game', { hostToken: game.hostToken }));
    const event = await finished;

    expect(event.result.winner).toBe('blue');
    expect(event.result.reason).toBe('ended_by_host');
    expect(harness.session(game.roomCode).status).toBe('finished');
  });

  it('removes a player at the host\u2019s request', async () => {
    const game = await createGame();
    const blue = await joinPlayer(game.roomCode, 'Disruptive', 'blue');

    expectOk(
      await emit(game.host, 'remove_player', {
        hostToken: game.hostToken,
        playerId: blue.playerId,
      }),
    );

    expect(harness.session(game.roomCode).players[blue.playerId]).toBeUndefined();
  });
});

describe('move_player - host team balancing', () => {
  it('moves a player to the other team in the lobby', async () => {
    const game = await createGame();
    const blue = await joinPlayer(game.roomCode, 'Mover', 'blue');

    expectOk(
      await emit(game.host, 'move_player', {
        hostToken: game.hostToken,
        playerId: blue.playerId,
        teamId: 'red',
      }),
    );

    const session = harness.session(game.roomCode);
    expect(session.players[blue.playerId]!.teamId).toBe('red');
    expect(session.teams.red.playerIds).toContain(blue.playerId);
    expect(session.teams.blue.playerIds).not.toContain(blue.playerId);
  });

  it('refuses a player trying to move somebody else', async () => {
    const game = await createGame();
    const blue = await joinPlayer(game.roomCode, 'Mover', 'blue');
    const other = await joinPlayer(game.roomCode, 'Bystander', 'red');

    // A student who somehow learned the host token still must not be able to
    // use it: the socket itself is not flagged as the host.
    const ack = await emit(other.client, 'move_player', {
      hostToken: game.hostToken,
      playerId: blue.playerId,
      teamId: 'red',
    });

    expect(ack.ok).toBe(false);
    expect(harness.session(game.roomCode).players[blue.playerId]!.teamId).toBe('blue');
  });

  it('refuses a move once the game has started, so nobody gains a second attempt', async () => {
    const { game, blue } = await startedGame();

    const ack = await emit(game.host, 'move_player', {
      hostToken: game.hostToken,
      playerId: blue.playerId,
      teamId: 'red',
    });

    expect(ack.ok).toBe(false);
    expect(harness.session(game.roomCode).players[blue.playerId]!.teamId).toBe('blue');
  });

  it('re-homes the moved player so they receive their new team\u2019s questions', async () => {
    const game = await createGame();
    const blue = await joinPlayer(game.roomCode, 'Mover', 'blue');
    // A second blue player keeps that team seated once the mover leaves it, so
    // the match can still start.
    await joinPlayer(game.roomCode, 'Blue Stays', 'blue');

    expectOk(
      await emit(game.host, 'move_player', {
        hostToken: game.hostToken,
        playerId: blue.playerId,
        teamId: 'red',
      }),
    );

    const questionStarted = once<{ round: unknown }>(blue.client, 'question_started', 10_000);
    expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
    await questionStarted;

    const session = harness.session(game.roomCode);
    const redQuestion = currentQuestionId(session, 'red');

    // Answering as a red player now succeeds, which is only true if the move
    // took effect server-side.
    const outcome = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: redQuestion,
        value: correctAnswer(session, 'red'),
      }),
    );

    expect(outcome.status).toBe('correct');
  });
});

describe('rejoin_host - dashboard reattach', () => {
  it('restores the host identity and returns the current state', async () => {
    const game = await createGame();
    await joinPlayer(game.roomCode, 'Blue One', 'blue');

    // A fresh socket stands in for the teacher's tablet waking up.
    const tablet = await harness.connect();
    const ack = expectOk<HostAttachAck>(
      await emit(tablet, 'rejoin_host', {
        roomCode: game.roomCode,
        hostToken: game.hostToken,
      }),
    );

    expect(ack.roomCode).toBe(game.roomCode);
    expect(ack.state.players).toHaveLength(1);

    // The reattached socket can now issue host commands.
    await joinPlayer(game.roomCode, 'Red One', 'red');
    expectOk(await emit(tablet, 'start_game', { hostToken: game.hostToken }));
    expect(harness.session(game.roomCode).status).not.toBe('lobby');
  });

  it('refuses a forged host token', async () => {
    const game = await createGame();
    const impostor = await harness.connect();

    const ack = await emit(impostor, 'rejoin_host', {
      roomCode: game.roomCode,
      hostToken: 'ht_not_the_real_token',
    });

    expect(ack.ok).toBe(false);
  });

  it('never subscribes the dashboard to the draft firehose', async () => {
    const { game, blue } = await startedGame();

    const tablet = await harness.connect();
    expectOk(
      await emit(tablet, 'rejoin_host', {
        roomCode: game.roomCode,
        hostToken: game.hostToken,
      }),
    );

    let drafts = 0;
    tablet.on('draft_updated', () => {
      drafts += 1;
    });

    const questionId = currentQuestionId(harness.session(game.roomCode), 'blue');
    blue.client.emit('answer_draft', { questionId, value: '4' });
    // Round-trip a request to guarantee the draft has been processed.
    expectOk(await emit(tablet, 'clock_sync', { clientSentAt: Date.now() }));

    expect(drafts).toBe(0);
  });
});

describe('answer drafts (classroom mirror)', () => {
  it('relays typing to the classroom display', async () => {
    const { game, blue } = await startedGame();
    const arena = await harness.connect();
    expectOk(await emit(arena, 'watch_arena', { roomCode: game.roomCode }));

    const session = harness.session(game.roomCode);
    const drafted = once<{ teamId: string; draft: { value: string } }>(arena, 'draft_updated');

    blue.client.emit('answer_draft', {
      questionId: currentQuestionId(session, 'blue'),
      value: '12',
    });

    const event = await drafted;
    expect(event.teamId).toBe('blue');
    expect(event.draft.value).toBe('12');
  });

  it('does not relay drafts to other players', async () => {
    const { game, blue, red } = await startedGame();
    const session = harness.session(game.roomCode);

    let redSawDraft = false;
    red.client.on('draft_updated', () => {
      redSawDraft = true;
    });

    blue.client.emit('answer_draft', {
      questionId: currentQuestionId(session, 'blue'),
      value: '7',
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(redSawDraft).toBe(false);
  });

  it('never lets a draft change the score or the rope', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);

    blue.client.emit('answer_draft', {
      questionId: currentQuestionId(session, 'blue'),
      value: String(correctAnswer(session, 'blue')),
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
    const after = harness.session(game.roomCode);
    expect(after.teams.blue.score).toBe(0);
    expect(after.ropePosition).toBe(0);
  });
});

describe('reconnection', () => {
  it('restores the seat and its stats with a player token', async () => {
    const { game, blue } = await startedGame();
    const session = harness.session(game.roomCode);

    expectOk(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: correctAnswer(session, 'blue'),
      }),
    );

    blue.client.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(harness.session(game.roomCode).players[blue.playerId]!.connected).toBe(false);

    const reconnected = await harness.connect();
    const ack = expectOk<JoinGameAck>(
      await emit(reconnected, 'rejoin_game', {
        roomCode: game.roomCode,
        playerToken: blue.playerToken,
      }),
    );

    expect(ack.playerId).toBe(blue.playerId);
    expect(ack.teamId).toBe('blue');
    const after = harness.session(game.roomCode);
    expect(after.players[blue.playerId]!.connected).toBe(true);
    expect(after.players[blue.playerId]!.correctCount).toBe(1);
  });

  it('refuses a forged player token', async () => {
    const game = await createGame();
    await joinPlayer(game.roomCode, 'Real', 'blue');

    const attacker = await harness.connect();
    const ack = await emit(attacker, 'rejoin_game', {
      roomCode: game.roomCode,
      playerToken: 'pt_forged_token_that_is_long_enough',
    });

    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.reason).toBe('not_a_player');
  });

  it('does not return a second attempt to a reconnecting player', async () => {
    const game = await createGame();
    const blue = await joinPlayer(game.roomCode, 'B1', 'blue');
    await joinPlayer(game.roomCode, 'B2', 'blue');
    await joinPlayer(game.roomCode, 'R1', 'red');

    const started = once(blue.client, 'question_started', 10_000);
    expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
    await started;

    const session = harness.session(game.roomCode);
    const questionId = currentQuestionId(session, 'blue');

    // Spend the attempt on a wrong answer, then reconnect and try again.
    expectOk(
      await emit(blue.client, 'submit_answer', {
        questionId,
        value: correctAnswer(session, 'blue') + 1,
      }),
    );
    blue.client.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 150));

    const back = await harness.connect();
    expectOk(
      await emit(back, 'rejoin_game', {
        roomCode: game.roomCode,
        playerToken: blue.playerToken,
      }),
    );

    const retry = expectOk<AnswerOutcome>(
      await emit(back, 'submit_answer', {
        questionId,
        value: correctAnswer(session, 'blue'),
      }),
    );

    expect(retry).toEqual({ status: 'rejected', reason: 'player_already_answered' });
  });
});

describe('clock sync', () => {
  it('echoes the client time alongside the server time', async () => {
    const client = await harness.connect();
    const sentAt = Date.now();
    const ack = expectOk<{ clientSentAt: number; serverTime: number }>(
      await emit(client, 'clock_sync', { clientSentAt: sentAt }),
    );

    expect(ack.clientSentAt).toBe(sentAt);
    expect(typeof ack.serverTime).toBe('number');
    expect(Math.abs(ack.serverTime - sentAt)).toBeLessThan(60_000);
  });
});

describe('full game over sockets', () => {
  it('plays a short match through to a broadcast result', async () => {
    const { game, blue, red } = await startedGame({ totalQuestions: 2, secondsPerQuestion: 5 });

    const finished = once<{ result: { winner: string; questionsPlayed: number } }>(
      blue.client,
      'game_finished',
      20_000,
    );

    // Blue answers correctly and red wrongly each round. Since each team has a
    // single player, both sides are then out of attempts and the round closes
    // immediately rather than waiting out the clock.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const session = harness.session(game.roomCode);
      if (session.status === 'finished') break;

      if (!session.round || session.round.resolvedAt !== null) {
        // Between rounds; wait for the next question to be issued.
        await new Promise((resolve) => setTimeout(resolve, 150));
        continue;
      }

      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: correctAnswer(session, 'blue'),
      });
      await emit(red.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'red'),
        value: correctAnswer(session, 'red') + 1,
      });
    }

    const result = await finished;
    expect(result.result.winner).toBe('blue');

    const final = harness.session(game.roomCode);
    expect(final.status).toBe('finished');
    expect(final.teams.blue.score).toBe(2);
    expect(final.teams.red.score).toBe(0);
    expect(final.ropePosition).toBeLessThan(0);
  });
});
