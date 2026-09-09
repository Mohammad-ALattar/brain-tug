import { describe, expect, it } from 'vitest';
import { endGame } from './lifecycle.js';
import { disconnectPlayer } from './membership.js';
import { submitAnswer } from './submitAnswer.js';
import { T0, asRace, correctAnswerFor, playerRaceProgress, questionIdFor, setupGame, withRaceProgress } from './testing.js';
import { DEFAULT_RULES } from '../rules/rules.js';
import { connectedFinisherCount } from '../rules/track.js';

const AT = T0 + 5000;

function submitCorrect(
  session: ReturnType<typeof setupGame>['session'],
  teamId: 'blue' | 'red',
  playerIndex = 0,
  now = AT,
) {
  const playerId = session.teams[teamId].playerIds[playerIndex]!;
  return submitAnswer(session, {
    playerId,
    questionId: questionIdFor(session, teamId),
    value: correctAnswerFor(session, teamId),
    now,
  });
}

describe('Brain Race - individual racers', () => {
  it('tracks progress per player rather than per team', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const blue1 = session.teams.blue.playerIds[1]!;

    const result = submitCorrect(session, 'blue', 0);
    expect(playerRaceProgress(result.session, blue0)).toBeGreaterThan(0);
    expect(playerRaceProgress(result.session, blue1)).toBe(0);
  });

  it('lets same-team players advance independently in one round', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const blue1 = session.teams.blue.playerIds[1]!;
    const questionId = questionIdFor(session, 'blue');
    const answer = correctAnswerFor(session, 'blue');

    const first = submitAnswer(session, {
      playerId: blue0,
      questionId,
      value: answer,
      now: AT,
    });
    const second = submitAnswer(first.session, {
      playerId: blue1,
      questionId,
      value: answer,
      now: AT + 50,
    });

    expect(playerRaceProgress(second.session, blue0)).toBeGreaterThan(0);
    expect(playerRaceProgress(second.session, blue1)).toBeGreaterThan(0);
    expect(playerRaceProgress(second.session, blue0)).not.toBe(
      playerRaceProgress(second.session, blue1),
    );
  });

  it('detects connected finishers and records finish order', () => {
    const { session } = setupGame({
      mode: 'brain_race',
      playersPerTeam: 2,
      finishersRequiredPerTeam: 2,
      rules: { winThreshold: 1, baseGain: 1, maxSingleGain: 1 },
    });
    const blue0 = session.teams.blue.playerIds[0]!;
    const result = submitCorrect(session, 'blue', 0);

    expect(connectedFinisherCount(result.session, asRace(result.session), 'blue', 1)).toBe(1);
    expect(asRace(result.session).finishOrder).toEqual([{ playerId: blue0, teamId: 'blue' }]);
    expect(result.session.status).toBe('active');
  });

  it('respects a configured finisher quota', () => {
    const { session } = setupGame({
      mode: 'brain_race',
      playersPerTeam: 2,
      finishersRequiredPerTeam: 2,
      totalQuestions: 20,
    });
    expect(asRace(session).finishersRequiredPerTeam).toBe(2);
  });

  it('declares a winner once the quota is reached', () => {
    const { session } = setupGame({
      mode: 'brain_race',
      playersPerTeam: 2,
      finishersRequiredPerTeam: 2,
      totalQuestions: 20,
      rules: { winThreshold: 1, baseGain: 1, maxSingleGain: 1 },
    });
    const blue0 = session.teams.blue.playerIds[0]!;
    const blue1 = session.teams.blue.playerIds[1]!;

    let current = submitCorrect(session, 'blue', 0).session;
    expect(current.status).toBe('active');

    current = submitAnswer(current, {
      playerId: blue1,
      questionId: questionIdFor(current, 'blue'),
      value: correctAnswerFor(current, 'blue'),
      now: AT + 100,
    }).session;

    expect(current.status).toBe('finished');
    expect(current.winner).toBe('blue');
    expect(asRace(current).finishOrder.map((entry) => entry.playerId)).toEqual([blue0, blue1]);
  });

  it('excludes disconnected players from the finisher count', () => {
    const { session } = setupGame({
      mode: 'brain_race',
      playersPerTeam: 2,
      finishersRequiredPerTeam: 2,
      rules: { winThreshold: 1, baseGain: 1, maxSingleGain: 1 },
    });
    const blue0 = session.teams.blue.playerIds[0]!;
    const blue1 = session.teams.blue.playerIds[1]!;

    const current = withRaceProgress(session, { [blue0]: 1, [blue1]: 1 });
    const dropped = disconnectPlayer(current, blue1, AT + 10);
    if (!dropped.ok) throw new Error('disconnect failed');

    expect(
      connectedFinisherCount(
        dropped.session,
        asRace(dropped.session),
        'blue',
        DEFAULT_RULES.winThreshold,
      ),
    ).toBe(1);
    expect(dropped.session.status).toBe('active');
  });

  it('breaks exhaustion ties using finish order', () => {
    const { session } = setupGame({
      mode: 'brain_race',
      playersPerTeam: 1,
      totalQuestions: 5,
      rules: { winThreshold: 1, baseGain: 1, maxSingleGain: 1 },
    });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;

    let current = submitCorrect(session, 'blue', 0).session;
    current = submitCorrect(current, 'red', 0, AT + 50).session;
    current = submitAnswer(current, {
      playerId: blue0,
      questionId: questionIdFor(current, 'blue'),
      value: '999',
      now: AT + 100,
    }).session;
    current = submitAnswer(current, {
      playerId: red0,
      questionId: questionIdFor(current, 'red'),
      value: '999',
      now: AT + 110,
    }).session;

    const ended = endGame(current, AT + 200);
    if (!ended.ok) throw new Error('end failed');
    expect(ended.session.winner).toBe('blue');
  });
});
