import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  AnswerOutcome,
  CreateGameAck,
  HostAttachAck,
  JoinGameAck,
  RoomCode,
  WatchArenaAck,
} from '@braintug/shared';
import {
  correctAnswer,
  currentQuestionId,
  emit,
  expectOk,
  once,
  raceProgress,
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

async function createRace(overrides: Record<string, unknown> = {}) {
  const host = await harness.connect();
  const ack = expectOk<CreateGameAck>(
    await emit(host, 'create_game', {
      mode: 'brain_race',
      subject: 'math',
      operation: 'multiplication',
      difficulty: 'easy',
      totalQuestions: 5,
      secondsPerQuestion: 20,
      countdownMs: 0,
      ...overrides,
    }),
  );
  return { host, ...ack };
}

async function joinPlayer(roomCode: RoomCode, name: string, teamId: 'blue' | 'red') {
  const client = await harness.connect();
  const ack = expectOk<JoinGameAck>(
    await emit(client, 'join_game', { roomCode, name, teamId }),
  );
  return { client, ...ack };
}

async function startedRace(overrides: Record<string, unknown> = {}) {
  const game = await createRace(overrides);
  const blue = await joinPlayer(game.roomCode, 'Blue One', 'blue');
  const red = await joinPlayer(game.roomCode, 'Red One', 'red');
  const questionStarted = once<{ round: unknown }>(blue.client, 'question_started', 10_000);
  expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
  await questionStarted;
  return { game, blue, red };
}

describe('Brain Race over sockets', () => {
  it('creates a race with an empty roster before players join', async () => {
    const { state } = await createRace();
    expect(state.config.mode).toBe('brain_race');
    expect(state.modeState.kind).toBe('brain_race');
    if (state.modeState.kind === 'brain_race') {
      expect(Object.keys(state.modeState.progress)).toHaveLength(0);
    }
  });

  it('advances a player on a correct answer and emits progress_applied to the arena', async () => {
    const { game, blue } = await startedRace();
    const arena = await harness.connect();
    expectOk<WatchArenaAck>(await emit(arena, 'watch_arena', { roomCode: game.roomCode }));

    const progressed = once<{
      teamId: string;
      gain: number;
      modeState: { kind: string };
    }>(arena, 'progress_applied', 10_000);

    const session = harness.session(game.roomCode);
    const outcome = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: correctAnswer(session, 'blue'),
      }),
    );

    expect(outcome.status).toBe('correct');
    if (outcome.status === 'correct') expect(outcome).not.toHaveProperty('correctAnswer');

    const event = await progressed;
    expect(event.teamId).toBe('blue');
    expect(event.modeState.kind).toBe('brain_race');
    expect(raceProgress(harness.session(game.roomCode), 'blue')).toBeGreaterThan(0);
    expect(raceProgress(harness.session(game.roomCode), 'red')).toBe(0);
  });

  it('does not reveal the correct answer on an incorrect outcome', async () => {
    const { game, blue } = await startedRace();
    const session = harness.session(game.roomCode);
    const outcome = expectOk<AnswerOutcome>(
      await emit(blue.client, 'submit_answer', {
        questionId: currentQuestionId(session, 'blue'),
        value: '999',
      }),
    );
    expect(outcome.status).toBe('incorrect');
    expect(outcome).not.toHaveProperty('correctAnswer');
    expect(raceProgress(harness.session(game.roomCode), 'blue')).toBe(0);
  });

  it('pauses, resumes, skips and ends under host control', async () => {
    const { game } = await startedRace({ secondsPerQuestion: 30 });

    expectOk(await emit(game.host, 'pause_game', { hostToken: game.hostToken }));
    expect(harness.session(game.roomCode).status).toBe('paused');

    expectOk(await emit(game.host, 'resume_game', { hostToken: game.hostToken }));
    expect(harness.session(game.roomCode).status).toBe('active');

    expectOk(await emit(game.host, 'skip_question', { hostToken: game.hostToken }));
    expect(harness.session(game.roomCode).round?.resolvedAt).not.toBeNull();

    expectOk(await emit(game.host, 'end_game', { hostToken: game.hostToken }));
    expect(harness.session(game.roomCode).status).toBe('finished');
  });

  it('returns the stored result when a host reattaches after the match', async () => {
    const { game, blue, red } = await startedRace({
      totalQuestions: 1,
      rules: undefined,
      secondsPerQuestion: 8,
    });

    const finished = once<{ result: { winner: string } }>(blue.client, 'game_finished', 15_000);
    const session = harness.session(game.roomCode);
    await emit(blue.client, 'submit_answer', {
      questionId: currentQuestionId(session, 'blue'),
      value: correctAnswer(session, 'blue'),
    });
    await emit(red.client, 'submit_answer', {
      questionId: currentQuestionId(session, 'red'),
      value: '999',
    });
    await finished;

    const host = await harness.connect();
    const ack = expectOk<HostAttachAck>(
      await emit(host, 'rejoin_host', { roomCode: game.roomCode, hostToken: game.hostToken }),
    );
    expect(ack.result).not.toBeNull();
    expect(ack.result?.mode).toBe('brain_race');
    expect(ack.state.status).toBe('finished');
  });
});
