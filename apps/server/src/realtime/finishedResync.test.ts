import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
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

/**
 * Attaching to a match that has already finished.
 *
 * `game_finished` fires exactly once, to whoever happens to be connected at
 * that instant. Everything that attaches afterwards — a phone that slept
 * through the last round, a reloaded dashboard, a projector switched on late —
 * has to be handed the result on its attach ack instead, or it sees a finished
 * game with no scores in it and no way to ever get them.
 *
 * That is not a hypothetical: it is what a student's phone actually showed,
 * stuck on "Waiting for the final scores" under a "Your team won!" banner.
 */

let harness: Harness;

beforeEach(async () => {
  harness = await startHarness();
});

afterEach(async () => {
  await harness.stop();
});

async function createGame() {
  const host = await harness.connect();
  const ack = expectOk<CreateGameAck>(
    await emit(host, 'create_game', {
      operation: 'addition',
      difficulty: 'easy',
      totalQuestions: 5,
      secondsPerQuestion: 20,
      countdownMs: 0,
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

/** Plays a match to a host-ended finish with one scoring answer from blue. */
async function finishedGame() {
  const game = await createGame();
  const blue = await joinPlayer(game.roomCode, 'Bea', 'blue');
  const red = await joinPlayer(game.roomCode, 'Rai', 'red');

  const questionStarted = once(blue.client, 'question_started', 10_000);
  expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
  await questionStarted;

  const session = harness.session(game.roomCode);
  expectOk(
    await emit(blue.client, 'submit_answer', {
      questionId: currentQuestionId(session, 'blue'),
      value: correctAnswer(session, 'blue'),
    }),
  );

  const finished = once(blue.client, 'game_finished', 10_000);
  expectOk(await emit(game.host, 'end_game', { hostToken: game.hostToken }));
  await finished;

  return { game, blue, red };
}

describe('attaching to a finished match', () => {
  it('keeps the result on the session after the event has fired', async () => {
    const { game } = await finishedGame();

    const session = harness.session(game.roomCode);
    expect(session.status).toBe('finished');
    expect(session.result).not.toBeNull();
    expect(session.result?.winner).toBe('blue');
    expect(session.result?.reason).toBe('ended_by_host');
  });

  it('hands a rejoining student the final scores', async () => {
    const { game, blue } = await finishedGame();

    // The phone drops and comes back, exactly as a reload does.
    blue.client.disconnect();
    const returning = await harness.connect();
    const ack = expectOk<JoinGameAck>(
      await emit(returning, 'rejoin_game', {
        roomCode: game.roomCode,
        playerToken: blue.playerToken,
      }),
    );

    expect(ack.state.status).toBe('finished');
    expect(ack.result).not.toBeNull();
    expect(ack.result?.winner).toBe('blue');

    // Their own contribution is what the student card leads with, so it has to
    // survive the reconnect too.
    const mine = ack.result?.players.find((p) => p.playerId === blue.playerId);
    expect(mine?.correctCount).toBe(1);
  });

  it('hands a student joining fresh after the match the final scores', async () => {
    const { game } = await finishedGame();

    // A late arrival with no stored token. They still deserve a real screen
    // rather than a spinner that never resolves.
    const latecomer = await harness.connect();
    const ack = await emit<'join_game', JoinGameAck>(latecomer, 'join_game', {
      roomCode: game.roomCode,
      name: 'Latecomer',
    });

    if (ack.ok) {
      expect(ack.data.state.status).toBe('finished');
      expect(ack.data.result).not.toBeNull();
    } else {
      // Refusing to seat someone into a finished match is also a valid answer,
      // as long as it is a clear refusal and not a silent empty screen.
      expect(ack.error).toBeTruthy();
    }
  });

  it('restores the post-match review when the teacher reloads the dashboard', async () => {
    const { game } = await finishedGame();

    game.host.disconnect();
    const returning = await harness.connect();
    const ack = expectOk<HostAttachAck>(
      await emit(returning, 'rejoin_host', {
        roomCode: game.roomCode,
        hostToken: game.hostToken,
      }),
    );

    expect(ack.state.status).toBe('finished');
    expect(ack.result).not.toBeNull();

    // The per-player breakdown is the whole point of the review screen.
    expect(ack.result?.players.length).toBe(2);
    expect(ack.result?.teams.blue.score).toBe(1);
  });

  it('shows the victory screen on a display opened after the final round', async () => {
    const { game } = await finishedGame();

    const projector = await harness.connect();
    const ack = expectOk<WatchArenaAck>(
      await emit(projector, 'watch_arena', { roomCode: game.roomCode }),
    );

    expect(ack.state.status).toBe('finished');
    expect(ack.result).not.toBeNull();
    expect(ack.result?.winner).toBe('blue');
  });

  it('reports no result for a match still in the lobby', async () => {
    const game = await createGame();

    const projector = await harness.connect();
    const ack = expectOk<WatchArenaAck>(
      await emit(projector, 'watch_arena', { roomCode: game.roomCode }),
    );

    // Null rather than a half-built summary, so the client can tell "not
    // finished" from "finished with nothing to report".
    expect(ack.state.status).toBe('lobby');
    expect(ack.result).toBeNull();
  });
});
