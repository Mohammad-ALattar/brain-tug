import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  AnswerOutcome,
  CreateGameAck,
  JoinGameAck,
  RoomCode,
  TeamId,
  WatchArenaAck,
} from '@braintug/shared';
import {
  correctAnswer,
  currentQuestionId,
  emit,
  expectOk,
  once,
  startHarness,
  type Harness,
  type TestClient,
} from '../test/harness.js';

/**
 * Load characterisation with a simulated classroom.
 *
 * The point of these tests is not to benchmark the machine but to catch the
 * failure modes that only appear at classroom scale and would be invisible with
 * the two-player fixtures the rest of the suite uses: a join storm dropping a
 * child, the draft firehose starving the game clock, or one team's answer
 * leaking into the other team's room. Budgets are deliberately loose so a busy
 * CI box does not fail the build, because the assertions that matter here are
 * about correctness under concurrency, not milliseconds.
 */

/** A full class on two teams, which is the upper end of what we support. */
const CLASS_SIZE = 40;

let harness: Harness;

beforeEach(async () => {
  harness = await startHarness();
});

afterEach(async () => {
  await harness.stop();
});

type Student = {
  client: TestClient;
  playerId: string;
  teamId: TeamId;
  name: string;
};

async function createGame(overrides: Record<string, unknown> = {}) {
  const host = await harness.connect();
  const ack = expectOk<CreateGameAck>(
    await emit(host, 'create_game', {
      operation: 'addition',
      difficulty: 'easy',
      totalQuestions: 5,
      secondsPerQuestion: 20,
      countdownMs: 0,
      ...overrides,
    }),
  );
  return { host, ...ack };
}

/** Fills a room by joining every student at once, as a class scanning a QR code does. */
async function fillRoom(roomCode: RoomCode, size: number): Promise<Student[]> {
  const joins = Array.from({ length: size }, async (_unused, index) => {
    const client = await harness.connect();
    const ack = expectOk<JoinGameAck>(
      await emit(client, 'join_game', { roomCode, name: `Student ${index + 1}` }),
    );
    return { client, playerId: ack.playerId, teamId: ack.teamId, name: `Student ${index + 1}` };
  });

  return Promise.all(joins);
}

describe('classroom-scale load', () => {
  it('seats a whole class joining simultaneously, balanced and without losing anyone', async () => {
    const game = await createGame();

    const startedAt = Date.now();
    const students = await fillRoom(game.roomCode, CLASS_SIZE);
    const elapsed = Date.now() - startedAt;

    // Nobody is dropped and nobody is seated twice.
    expect(students).toHaveLength(CLASS_SIZE);
    expect(new Set(students.map((s) => s.playerId)).size).toBe(CLASS_SIZE);

    // Auto-assignment stays balanced under a simultaneous storm rather than
    // piling everyone onto whichever team the race happened to favour.
    const blue = students.filter((s) => s.teamId === 'blue').length;
    const red = students.filter((s) => s.teamId === 'red').length;
    expect(Math.abs(blue - red)).toBeLessThanOrEqual(1);

    // The server's own view agrees with what the clients were told.
    const session = harness.session(game.roomCode);
    expect(Object.keys(session.players)).toHaveLength(CLASS_SIZE);

    // A class should be seated in seconds, not minutes.
    expect(elapsed).toBeLessThan(15_000);
  }, 30_000);

  it('keeps the arena in step while the whole class types at once', async () => {
    const game = await createGame();
    const arena = await harness.connect();
    expectOk<WatchArenaAck>(await emit(arena, 'watch_arena', { roomCode: game.roomCode }));

    const students = await fillRoom(game.roomCode, CLASS_SIZE);

    const questionStarted = once(students[0]!.client, 'question_started', 15_000);
    expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
    await questionStarted;

    let draftsReceived = 0;
    arena.on('draft_updated', () => {
      draftsReceived += 1;
    });

    // Every student types a six-digit number, throttled client-side to roughly
    // one keystroke burst per 90ms. This is the heaviest sustained inbound
    // traffic the server ever sees.
    const KEYSTROKES = 6;
    const sent = CLASS_SIZE * KEYSTROKES;
    const startedAt = Date.now();

    for (let stroke = 1; stroke <= KEYSTROKES; stroke += 1) {
      for (const student of students) {
        const live = harness.session(game.roomCode);
        student.client.emit('answer_draft', {
          questionId: currentQuestionId(live, student.teamId),
          value: '9'.repeat(stroke),
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 90));
    }

    // Let the tail of the firehose drain.
    await new Promise((resolve) => setTimeout(resolve, 500));
    const elapsed = Date.now() - startedAt;

    // The display saw the traffic rather than silently dropping it, and did not
    // see more than was sent.
    expect(draftsReceived).toBeGreaterThan(sent * 0.5);
    expect(draftsReceived).toBeLessThanOrEqual(sent);

    // Drafts must never re-arm the round clock. If they did, a class typing
    // would extend the question indefinitely and the timer would drift.
    const session = harness.session(game.roomCode);
    expect(session.round).not.toBeNull();
    expect(session.status).toBe('active');
    const remaining = (session.round?.endsAt ?? 0) - Date.now();
    expect(remaining).toBeLessThanOrEqual(20_000 - elapsed + 1_000);
  }, 40_000);

  it('resolves a race where a whole team answers at the same instant', async () => {
    const game = await createGame();
    const students = await fillRoom(game.roomCode, CLASS_SIZE);

    const questionStarted = once(students[0]!.client, 'question_started', 15_000);
    expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
    await questionStarted;

    const session = harness.session(game.roomCode);
    const blueTeam = students.filter((s) => s.teamId === 'blue');
    const answer = correctAnswer(session, 'blue');
    const questionId = currentQuestionId(session, 'blue');

    // Everyone on blue submits the right answer in the same tick.
    const acks = await Promise.all(
      blueTeam.map((student) =>
        emit<'submit_answer', AnswerOutcome>(student.client, 'submit_answer', {
          questionId,
          value: answer,
        }),
      ),
    );

    const outcomes = acks.map((ack) => expectOk(ack));

    // Exactly one student wins the pull; the rest are told the round is already
    // locked. A second `correct` here would mean the team scored twice.
    expect(outcomes.filter((o) => o.status === 'correct')).toHaveLength(1);
    const rejected = outcomes.filter((o) => o.status === 'rejected');
    expect(rejected).toHaveLength(blueTeam.length - 1);
    expect(rejected.every((o) => o.reason === 'team_already_locked')).toBe(true);

    // The score moved by exactly one regardless of how many hands went up.
    expect(harness.session(game.roomCode).teams.blue.score).toBe(1);
  }, 40_000);

  it('answers every student within a usable time budget', async () => {
    const game = await createGame();
    const students = await fillRoom(game.roomCode, CLASS_SIZE);

    const questionStarted = once(students[0]!.client, 'question_started', 15_000);
    expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
    await questionStarted;

    const session = harness.session(game.roomCode);
    const latencies: number[] = [];

    // One student per team submits, sequentially, so each measurement is a
    // clean round trip rather than a queue depth reading.
    for (const teamId of ['blue', 'red'] as const) {
      const student = students.find((s) => s.teamId === teamId)!;
      const startedAt = Date.now();
      expectOk(
        await emit<'submit_answer', AnswerOutcome>(student.client, 'submit_answer', {
          questionId: currentQuestionId(session, teamId),
          value: correctAnswer(session, teamId),
        }),
      );
      latencies.push(Date.now() - startedAt);
    }

    // A child pressing "lock it in" must get feedback fast enough to feel
    // instant, even with the room full.
    expect(Math.max(...latencies)).toBeLessThan(500);
  }, 40_000);

  it('survives a third of the class dropping off mid-round', async () => {
    const game = await createGame();
    const students = await fillRoom(game.roomCode, CLASS_SIZE);

    const questionStarted = once(students[0]!.client, 'question_started', 15_000);
    expectOk(await emit(game.host, 'start_game', { hostToken: game.hostToken }));
    await questionStarted;

    // A cart of tablets going to sleep, or the classroom wifi hiccuping.
    const dropped = students.slice(0, Math.floor(CLASS_SIZE / 3));
    for (const student of dropped) student.client.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 300));

    const session = harness.session(game.roomCode);

    // Seats are held, not deleted: their names stay on the roster marked
    // offline so the teacher can see who fell off, and so a reconnect reclaims
    // the same seat and the same spent attempt.
    expect(Object.keys(session.players)).toHaveLength(CLASS_SIZE);
    const offline = Object.values(session.players).filter((p) => !p.connected);
    expect(offline).toHaveLength(dropped.length);

    // The match carries on for everyone still holding a device.
    expect(session.status).toBe('active');
    const survivor = students.at(-1)!;
    const outcome = expectOk(
      await emit<'submit_answer', AnswerOutcome>(survivor.client, 'submit_answer', {
        questionId: currentQuestionId(session, survivor.teamId),
        value: correctAnswer(session, survivor.teamId),
      }),
    );
    expect(outcome.status).toBe('correct');
  }, 40_000);
});
