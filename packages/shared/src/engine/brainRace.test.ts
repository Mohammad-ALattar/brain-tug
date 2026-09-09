import { describe, expect, it } from 'vitest';
import { toPublicRound } from '../domain/session.js';
import { pauseGame, resumeGame } from './lifecycle.js';
import { skipQuestion } from './rounds.js';
import { submitAnswer } from './submitAnswer.js';
import { advance, nextDeadline } from './timers.js';
import {
  T0,
  asRace,
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

describe('Brain Race - answers', () => {
  it('advances only the answering player and leaves team-mates still', () => {
    const { session } = setupGame({ mode: 'brain_race' });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const result = submit(session, 'blue', correctAnswerFor(session, 'blue'));

    expect(result.outcome.status).toBe('correct');
    expect(playerRaceProgress(result.session, blue0)).toBeGreaterThan(0);
    expect(playerRaceProgress(result.session, red0)).toBe(0);
    expect(result.session.teams.blue.score).toBe(1);
    expect(result.session.players[blue0]!.streak).toBe(1);
    expect(result.session.teams.blue.streak).toBe(0);
  });

  it('does not move the player on an incorrect answer', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2 });
    const playerId = session.teams.blue.playerIds[0]!;
    const result = submit(session, 'blue', '999');

    expect(result.outcome.status).toBe('incorrect');
    expect(playerRaceProgress(result.session, playerId)).toBe(0);
    expect(result.session.players[playerId]!.streak).toBe(0);
    expect(result.session.teams.blue.streak).toBe(0);
    if (result.outcome.status === 'incorrect') {
      expect(result.outcome).not.toHaveProperty('correctAnswer');
    }
  });

  it('accumulates two correct answers from different players on the same team', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2 });
    const firstId = session.teams.blue.playerIds[0]!;
    const secondId = session.teams.blue.playerIds[1]!;
    const questionId = questionIdFor(session, 'blue');
    const answer = correctAnswerFor(session, 'blue');

    const first = submitAnswer(session, { playerId: firstId, questionId, value: answer, now: AT });
    const second = submitAnswer(first.session, {
      playerId: secondId,
      questionId,
      value: answer,
      now: AT + 50,
    });

    expect(playerRaceProgress(second.session, firstId)).toBeGreaterThan(0);
    expect(playerRaceProgress(second.session, secondId)).toBeGreaterThan(0);
    expect(playerRaceProgress(second.session, firstId)).not.toBe(
      playerRaceProgress(second.session, secondId),
    );
    expect(second.session.teams.blue.score).toBe(2);
    expect(second.session.round!.teams.blue.locked).toBe(false);
  });

  it('gives both teams the same question', () => {
    const { session } = setupGame({ mode: 'brain_race' });
    const round = session.round!;
    expect(round.assignment).toBe('shared');
    expect(round.teams.blue.question.id).toBe(round.teams.red.question.id);
    expect(round.teams.blue.question.prompt).toBe(round.teams.red.question.prompt);
  });

  it('keeps revealedAnswer null on the public round while it is open', () => {
    const { session } = setupGame({ mode: 'brain_race' });
    const published = toPublicRound(session.round!);
    expect(published.teams.blue.revealedAnswer).toBeNull();
    expect(published.teams.red.revealedAnswer).toBeNull();
  });
});

describe('Brain Race - rejections', () => {
  it('refuses a duplicate answer from the same player', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 2 });
    const first = submit(session, 'blue', '999');
    const second = submit(first.session, 'blue', correctAnswerFor(session, 'blue'), 0, AT + 10);
    expect(second.outcome).toEqual({ status: 'rejected', reason: 'player_already_answered' });
  });

  it('refuses an unknown player', () => {
    const { session } = setupGame({ mode: 'brain_race' });
    const result = submitAnswer(session, {
      playerId: 'ghost' as never,
      questionId: questionIdFor(session, 'blue'),
      value: '20',
      now: AT,
    });
    expect(result.outcome).toEqual({ status: 'rejected', reason: 'not_a_player' });
  });

  it('refuses a stale question id', () => {
    const { session } = setupGame({ mode: 'brain_race' });
    const result = submitAnswer(session, {
      playerId: session.teams.blue.playerIds[0]!,
      questionId: 'q_stale' as never,
      value: correctAnswerFor(session, 'blue'),
      now: AT,
    });
    expect(result.outcome).toEqual({ status: 'rejected', reason: 'stale_question' });
  });

  it('refuses a submission past the clock', () => {
    const { session } = setupGame({ mode: 'brain_race', secondsPerQuestion: 10 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const result = submit(session, 'blue', correctAnswerFor(session, 'blue'), 0, session.round!.endsAt + 1);
    expect(result.outcome).toEqual({ status: 'rejected', reason: 'time_expired' });
    expect(playerRaceProgress(result.session, blue0)).toBe(0);
  });

  it('refuses submissions while paused', () => {
    const { session } = setupGame({ mode: 'brain_race' });
    const paused = pauseGame(session, AT);
    if (!paused.ok) throw new Error('pause failed');
    const result = submit(paused.session, 'blue', correctAnswerFor(session, 'blue'), 0, AT + 10);
    expect(result.outcome).toEqual({ status: 'rejected', reason: 'game_paused' });
  });
});

describe('Brain Race - scoring', () => {
  it('awards a larger gain for a faster answer', () => {
    const { session } = setupGame({
      mode: 'brain_race',
      playersPerTeam: 2,
      secondsPerQuestion: 20,
    });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const instant = submitAnswer(session, {
      playerId: blue0,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: session.round!.startedAt,
    });
    const slow = submitAnswer(instant.session, {
      playerId: red0,
      questionId: questionIdFor(session, 'red'),
      value: correctAnswerFor(session, 'red'),
      now: session.round!.startedAt + 15_000,
    });

    expect(playerRaceProgress(slow.session, blue0)).toBeGreaterThan(
      playerRaceProgress(slow.session, red0),
    );
  });
});

describe('Brain Race - round flow', () => {
  it('closes the round once every eligible player has answered', () => {
    const { session } = setupGame({ mode: 'brain_race', playersPerTeam: 1, totalQuestions: 5 });
    const blue = submit(session, 'blue', '999');
    expect(blue.session.round!.resolvedAt).toBeNull();
    const red = submit(blue.session, 'red', '999', 0, AT + 10);
    expect(red.session.round!.resolvedAt).toBe(AT + 10);
    expect(red.events.find((e) => e.type === 'round_resolved')).toMatchObject({
      reason: 'all_attempted',
    });
  });

  it('resolves on timeout when players are still answering', () => {
    const { session, dealer } = setupGame({
      mode: 'brain_race',
      secondsPerQuestion: 10,
      totalQuestions: 5,
    });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const expired = advance(session, dealer, session.round!.endsAt);
    expect(expired.events.find((e) => e.type === 'round_resolved')).toMatchObject({
      reason: 'timeout',
    });
    expect(playerRaceProgress(expired.session, blue0)).toBe(0);
    expect(playerRaceProgress(expired.session, red0)).toBe(0);
  });

  it('starts the next round when nextRoundAt arrives', () => {
    const { session, dealer } = setupGame({ mode: 'brain_race', totalQuestions: 5 });
    const closed = submit(submit(session, 'blue', '999').session, 'red', '999', 0, AT + 10).session;
    expect(closed.nextRoundAt).not.toBeNull();
    const next = advance(closed, dealer, closed.nextRoundAt!);
    expect(next.session.currentQuestionIndex).toBe(1);
    expect(next.session.round!.resolvedAt).toBeNull();
  });

  it('finishes the match the moment a team reaches the finisher quota', () => {
    const { session } = setupGame({
      mode: 'brain_race',
      totalQuestions: 20,
      rules: { baseGain: 2, maxSingleGain: 5, winThreshold: 1 },
    });
    const result = submit(session, 'red', correctAnswerFor(session, 'red'));
    expect(result.session.status).toBe('finished');
    expect(result.session.winner).toBe('red');
    expect(asRace(result.session).finishOrder[0]).toMatchObject({
      playerId: session.teams.red.playerIds[0]!,
      teamId: 'red',
    });
    const finished = result.events.find((e) => e.type === 'game_finished');
    if (finished?.type === 'game_finished') {
      expect(finished.result.reason).toBe('target_reached');
    }
  });

  it('pause freezes the clock and resume rebases it', () => {
    const { session } = setupGame({ mode: 'brain_race', secondsPerQuestion: 20 });
    const paused = pauseGame(session, session.round!.startedAt + 5000);
    if (!paused.ok) throw new Error('pause failed');
    expect(paused.session.pausedRemainingMs).toBe(15_000);
    expect(nextDeadline(paused.session)).toBeNull();

    const resumeAt = session.round!.startedAt + 60_000;
    const resumed = resumeGame(paused.session, resumeAt);
    if (!resumed.ok) throw new Error('resume failed');
    expect(resumed.session.round!.endsAt).toBe(resumeAt + 15_000);
  });

  it('skip resolves with no gain awarded', () => {
    const { session } = setupGame({ mode: 'brain_race', totalQuestions: 5 });
    const blue0 = session.teams.blue.playerIds[0]!;
    const red0 = session.teams.red.playerIds[0]!;
    const skipped = skipQuestion(session, AT);
    expect(skipped.session.round!.resolvedAt).toBe(AT);
    expect(playerRaceProgress(skipped.session, blue0)).toBe(0);
    expect(playerRaceProgress(skipped.session, red0)).toBe(0);
    expect(skipped.events.find((e) => e.type === 'round_resolved')).toMatchObject({
      reason: 'skipped',
    });
  });
});
