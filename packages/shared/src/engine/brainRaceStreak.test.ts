import { describe, expect, it } from 'vitest';
import { toPublicPlayer } from '../domain/session.js';
import { BRAIN_RACE_STREAK_THRESHOLDS } from '../rules/streakPresentation.js';
import { submitAnswer } from './submitAnswer.js';
import { advance } from './timers.js';
import {
  T0,
  correctAnswerFor,
  playerRaceProgress,
  questionIdFor,
  setupGame,
} from './testing.js';

const AT = T0 + 5000;

function submit(
  session: ReturnType<typeof setupGame>['session'],
  teamId: 'blue' | 'red',
  value: string,
  playerIndex = 0,
  now = AT,
) {
  const playerId = session.teams[teamId].playerIds[playerIndex]!;
  return submitAnswer(session, {
    playerId,
    questionId: questionIdFor(session, teamId),
    value,
    now,
  });
}

function advanceRound(session: ReturnType<typeof setupGame>['session'], dealer: ReturnType<typeof setupGame>['dealer']) {
  return advance(session, dealer, session.nextRoundAt!).session;
}

describe('Brain Race - player streaks', () => {
  it('starts at zero and becomes one on the first correct answer', () => {
    const { session } = setupGame({ mode: 'brain_race' });
    const playerId = session.teams.blue.playerIds[0]!;
    expect(session.players[playerId]!.streak).toBe(0);

    const result = submit(session, 'blue', correctAnswerFor(session, 'blue'));
    expect(result.outcome.status).toBe('correct');
    if (result.outcome.status === 'correct') {
      expect(result.outcome.streak).toBe(1);
    }
    expect(result.session.players[playerId]!.streak).toBe(1);
    expect(result.session.teams.blue.streak).toBe(0);
  });

  it('increments on consecutive correct answers from the same player', () => {
    const { session, dealer } = setupGame({ mode: 'brain_race', totalQuestions: 10 });
    const playerId = session.teams.blue.playerIds[0]!;
    let current = session;

    current = submit(current, 'blue', correctAnswerFor(current, 'blue')).session;
    current = submit(current, 'red', '999').session;
    current = advanceRound(current, dealer);

    current = submit(current, 'blue', correctAnswerFor(current, 'blue')).session;
    expect(current.players[playerId]!.streak).toBe(2);
    if (current.players[playerId]!.streak >= BRAIN_RACE_STREAK_THRESHOLDS.started) {
      expect(current.players[playerId]!.streak).toBeGreaterThanOrEqual(2);
    }
  });

  it('reaches presentation thresholds without changing team streak', () => {
    const { session, dealer } = setupGame({ mode: 'brain_race', totalQuestions: 20, playersPerTeam: 1 });
    const playerId = session.teams.blue.playerIds[0]!;
    let current = session;

    for (let round = 0; round < 3; round += 1) {
      current = submit(current, 'blue', correctAnswerFor(current, 'blue')).session;
      current = submit(current, 'red', '999').session;
      if (current.nextRoundAt) current = advanceRound(current, dealer);
    }

    expect(current.players[playerId]!.streak).toBe(3);
    expect(current.players[playerId]!.streak).toBeGreaterThanOrEqual(
      BRAIN_RACE_STREAK_THRESHOLDS.strong,
    );
    expect(current.teams.blue.streak).toBe(0);
  });

  it('resets the answering player streak on an incorrect answer', () => {
    const { session, dealer } = setupGame({ mode: 'brain_race', totalQuestions: 10 });
    const playerId = session.teams.blue.playerIds[0]!;
    let current = submit(session, 'blue', correctAnswerFor(session, 'blue')).session;
    current = submit(current, 'red', '999').session;
    current = advanceRound(current, dealer);

    current = submit(current, 'blue', '999').session;
    expect(current.players[playerId]!.streak).toBe(0);
    expect(current.teams.blue.streak).toBe(0);
  });

  it('keeps independent streaks per player on the same team', () => {
    const { session, dealer } = setupGame({ mode: 'brain_race', playersPerTeam: 2, totalQuestions: 10 });
    const firstId = session.teams.blue.playerIds[0]!;
    const secondId = session.teams.blue.playerIds[1]!;

    let current = submitAnswer(session, {
      playerId: firstId,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT,
    }).session;
    current = submit(current, 'red', '999').session;
    current = advanceRound(current, dealer);

    current = submitAnswer(current, {
      playerId: secondId,
      questionId: questionIdFor(current, 'blue'),
      value: correctAnswerFor(current, 'blue'),
      now: AT + 100,
    }).session;

    expect(current.players[firstId]!.streak).toBe(1);
    expect(current.players[secondId]!.streak).toBe(1);
  });

  it('does not let one player miss reset another player streak', () => {
    const { session, dealer } = setupGame({ mode: 'brain_race', playersPerTeam: 2, totalQuestions: 10 });
    const firstId = session.teams.blue.playerIds[0]!;
    const secondId = session.teams.blue.playerIds[1]!;
    let current = session;

    const closeRound = (game: typeof session) => {
      let next = game;
      for (const teamId of ['blue', 'red'] as const) {
        for (const playerId of next.teams[teamId].playerIds) {
          if (next.round!.teams[teamId].attemptedPlayerIds.includes(playerId)) continue;
          next = submitAnswer(next, {
            playerId,
            questionId: questionIdFor(next, teamId),
            value: '999',
            now: AT + 100,
          }).session;
        }
      }
      return advanceRound(next, dealer);
    };

    for (let round = 0; round < 2; round += 1) {
      current = submitAnswer(current, {
        playerId: firstId,
        questionId: questionIdFor(current, 'blue'),
        value: correctAnswerFor(current, 'blue'),
        now: AT + round,
      }).session;
      current = closeRound(current);
    }

    expect(current.players[firstId]!.streak).toBe(2);
    current = submitAnswer(current, {
      playerId: secondId,
      questionId: questionIdFor(current, 'blue'),
      value: '999',
      now: AT + 500,
    }).session;

    expect(current.players[firstId]!.streak).toBe(2);
    expect(current.players[secondId]!.streak).toBe(0);
  });

  it('survives reconnect via the public player projection', () => {
    const { session, dealer } = setupGame({ mode: 'brain_race', totalQuestions: 10 });
    const playerId = session.teams.blue.playerIds[0]!;
    let current = submit(session, 'blue', correctAnswerFor(session, 'blue')).session;
    current = submit(current, 'red', '999').session;
    current = advanceRound(current, dealer);
    current = submit(current, 'blue', correctAnswerFor(current, 'blue')).session;

    expect(toPublicPlayer(current.players[playerId]!).streak).toBe(2);
  });
});

describe('Tug of War streak unchanged', () => {
  it('still tracks team streak rather than player streak', () => {
    const { session } = setupGame({ mode: 'tug_of_war' });
    const playerId = session.teams.blue.playerIds[0]!;
    const result = submitAnswer(session, {
      playerId,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT,
    });

    expect(result.session.teams.blue.streak).toBe(1);
    expect(result.session.players[playerId]!.streak).toBe(0);
  });
});

describe('Brain Race - streak scoring unchanged', () => {
  it('does not apply streak multipliers to race distance yet', () => {
    const { session, dealer } = setupGame({ mode: 'brain_race', totalQuestions: 10, playersPerTeam: 1 });
    const playerId = session.teams.blue.playerIds[0]!;
    let current = session;
    const gains: number[] = [];

    for (let round = 0; round < 3; round += 1) {
      const before = playerRaceProgress(current, playerId);
      current = submit(current, 'blue', correctAnswerFor(current, 'blue')).session;
      const after = playerRaceProgress(current, playerId);
      gains.push(after - before);
      current = submit(current, 'red', '999').session;
      if (current.nextRoundAt) current = advanceRound(current, dealer);
    }

    expect(gains[0]).toBeCloseTo(gains[2]!, 4);
  });
});
