import { describe, expect, it } from 'vitest';
import { COUNTDOWN_MS, INTER_ROUND_MS } from '../rules/rules.js';
import { createGame } from './createGame.js';
import { endGame, pauseGame, resumeGame, startGame } from './lifecycle.js';
import { joinGame } from './membership.js';
import { skipQuestion } from './rounds.js';
import { submitAnswer } from './submitAnswer.js';
import { advance, nextDeadline } from './timers.js';
import { T0, constantProvider, correctAnswerFor, questionIdFor, setupGame } from './testing.js';
import type { GameSession } from '../domain/session.js';
import type { TeamId } from '../domain/team.js';
import type { QuestionProvider } from '../questions/queue.js';

/** Answers correctly for `teamId` in the current round. */
function answerCorrectly(session: GameSession, teamId: TeamId, now: number) {
  const playerId = session.teams[teamId].playerIds[0]!;
  return submitAnswer(session, {
    playerId,
    questionId: questionIdFor(session, teamId),
    value: correctAnswerFor(session, teamId),
    now,
  });
}

/**
 * Jumps straight to the game's next scheduled deadline, which is exactly what
 * the server's timer service does rather than polling.
 */
function tick(session: GameSession, provider: QuestionProvider): GameSession {
  const deadline = nextDeadline(session);
  if (deadline === null) return session;
  return advance(session, provider, deadline).session;
}

/**
 * Has `winningTeam` answer every round correctly, letting each round then close
 * on its own clock, until the game finishes or the guard trips.
 */
function playUntilFinished(
  session: GameSession,
  provider: QuestionProvider,
  winningTeam: TeamId,
  maxSteps = 400,
): GameSession {
  let current = session;

  for (let i = 0; i < maxSteps && current.status !== 'finished'; i += 1) {
    const round = current.round;
    if (current.status === 'active' && round && round.resolvedAt === null) {
      const attempt = answerCorrectly(current, winningTeam, round.startedAt + 1000);
      if (attempt.outcome.status === 'correct') {
        current = attempt.session;
        continue;
      }
    }

    const advanced = tick(current, provider);
    // No deadline and no answer left to give: the game cannot progress.
    if (advanced === current) break;
    current = advanced;
  }

  return current;
}

describe('startGame', () => {
  it('enters a countdown rather than jumping straight to a question', () => {
    const { session } = setupGame({ stayInLobby: true });
    const started = startGame(session, { now: T0 });

    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.session.status).toBe('countdown');
    expect(started.session.countdownEndsAt).toBe(T0 + COUNTDOWN_MS);
    expect(started.session.round).toBeNull();
  });

  it('refuses to start twice', () => {
    const { session } = setupGame({ stayInLobby: true });
    const started = startGame(session, { now: T0 });
    if (!started.ok) throw new Error('first start failed');

    const again = startGame(started.session, { now: T0 + 10 });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe('already_started');
  });

  it('refuses to start with an empty team', () => {
    let session = createGame({ totalQuestions: 3, now: T0 });
    const joined = joinGame(session, { name: 'Solo', teamId: 'blue', now: T0 });
    if (!joined.ok) throw new Error('join failed');
    session = joined.session;

    const started = startGame(session, { now: T0 });
    expect(started.ok).toBe(false);
    if (!started.ok) expect(started.reason).toBe('invalid_config');
  });

  it('starts the first question when the countdown elapses', () => {
    const { session } = setupGame({ stayInLobby: true });
    const provider = constantProvider();
    const started = startGame(session, { now: T0 });
    if (!started.ok) throw new Error('start failed');

    const early = advance(started.session, provider, T0 + COUNTDOWN_MS - 1);
    expect(early.session.status).toBe('countdown');
    expect(early.session.round).toBeNull();

    const due = advance(started.session, provider, T0 + COUNTDOWN_MS);
    expect(due.session.status).toBe('active');
    expect(due.session.currentQuestionIndex).toBe(0);
    expect(due.session.round).not.toBeNull();
    expect(due.events.some((e) => e.type === 'question_started')).toBe(true);
  });

  it('issues a different question to each team', () => {
    const { session } = setupGame();
    const round = session.round!;
    expect(round.teams.blue.question.id).not.toBe(round.teams.red.question.id);
  });

  it('shares one clock and one index across both teams', () => {
    const { session } = setupGame({ secondsPerQuestion: 30 });
    const round = session.round!;
    expect(round.index).toBe(0);
    expect(round.endsAt - round.startedAt).toBe(30_000);
  });
});

describe('round progression', () => {
  it('resolves the round as soon as both teams lock', () => {
    const { session } = setupGame({ totalQuestions: 5 });
    const blueDone = answerCorrectly(session, 'blue', T0 + 6000).session;
    expect(blueDone.round!.resolvedAt).toBeNull();

    const result = answerCorrectly(blueDone, 'red', T0 + 6500);
    expect(result.session.round!.resolvedAt).toBe(T0 + 6500);
    expect(result.events.some((e) => e.type === 'round_resolved')).toBe(true);
  });

  it('closes the round early when nobody can answer again', () => {
    const { session } = setupGame({ playersPerTeam: 1, totalQuestions: 5 });
    const blueWrong = submitAnswer(session, {
      playerId: session.teams.blue.playerIds[0]!,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue') + 1,
      now: T0 + 1000,
    }).session;

    const redWrong = submitAnswer(blueWrong, {
      playerId: blueWrong.teams.red.playerIds[0]!,
      questionId: questionIdFor(blueWrong, 'red'),
      value: correctAnswerFor(blueWrong, 'red') + 1,
      now: T0 + 1100,
    });

    expect(redWrong.session.round!.resolvedAt).toBe(T0 + 1100);
    const resolved = redWrong.events.find((e) => e.type === 'round_resolved');
    expect(resolved).toMatchObject({ reason: 'all_attempted' });
  });

  it('schedules the next round rather than starting it immediately', () => {
    const { session, provider } = setupGame({ totalQuestions: 5 });
    const blueDone = answerCorrectly(session, 'blue', T0 + 6000).session;
    const resolved = answerCorrectly(blueDone, 'red', T0 + 6500).session;

    expect(resolved.nextRoundAt).toBe(T0 + 6500 + INTER_ROUND_MS);
    expect(resolved.currentQuestionIndex).toBe(0);

    const next = advance(resolved, provider, resolved.nextRoundAt!);
    expect(next.session.currentQuestionIndex).toBe(1);
    expect(next.session.round!.teams.blue.locked).toBe(false);
    expect(next.session.round!.teams.blue.attemptedPlayerIds).toHaveLength(0);
  });

  it('carries a team streak across rounds and breaks it on a wrong answer', () => {
    const { session, provider } = setupGame({ totalQuestions: 10 });
    let current = session;

    for (let round = 0; round < 3; round += 1) {
      current = answerCorrectly(current, 'blue', current.round!.startedAt + 1000).session;
      // Two ticks per round: the clock expires it, then the next round opens.
      current = tick(current, provider);
      current = tick(current, provider);
    }

    expect(current.currentQuestionIndex).toBe(3);
    expect(current.teams.blue.streak).toBe(3);
    expect(current.teams.blue.bestStreak).toBe(3);

    const wrong = submitAnswer(current, {
      playerId: current.teams.blue.playerIds[0]!,
      questionId: questionIdFor(current, 'blue'),
      value: correctAnswerFor(current, 'blue') + 1,
      now: current.round!.startedAt + 500,
    });

    expect(wrong.session.teams.blue.streak).toBe(0);
    // The peak is retained for the results screen.
    expect(wrong.session.teams.blue.bestStreak).toBe(3);
  });

  it('applies the streak multiplier so later pulls are larger', () => {
    const { session, provider } = setupGame({ totalQuestions: 20 });
    let current = session;
    const pulls: number[] = [];

    for (let round = 0; round < 6 && current.status !== 'finished'; round += 1) {
      const before = current.ropePosition;
      current = answerCorrectly(current, 'blue', current.round!.startedAt + 1000).session;
      pulls.push(Math.abs(current.ropePosition - before));
      current = tick(current, provider);
      current = tick(current, provider);
    }

    // Streak tiers kick in at 3 and 5, so a later pull must exceed the first.
    expect(pulls.at(-1)!).toBeGreaterThan(pulls[0]!);
  });
});

describe('timer expiration', () => {
  it('resolves an unanswered round when the clock runs out', () => {
    const { session, provider } = setupGame({ secondsPerQuestion: 10, totalQuestions: 5 });
    const endsAt = session.round!.endsAt;

    const early = advance(session, provider, endsAt - 1);
    expect(early.session.round!.resolvedAt).toBeNull();

    const expired = advance(session, provider, endsAt);
    const resolved = expired.events.find((e) => e.type === 'round_resolved');
    expect(resolved).toMatchObject({ reason: 'timeout' });
    // Nobody answered, so the rope must not have moved.
    expect(expired.session.ropePosition).toBe(0);
  });

  it('awards nothing to either team on a timeout', () => {
    const { session, provider } = setupGame({ secondsPerQuestion: 10, totalQuestions: 5 });
    const expired = advance(session, provider, session.round!.endsAt + 1);
    expect(expired.session.teams.blue.score).toBe(0);
    expect(expired.session.teams.red.score).toBe(0);
  });

  it('reports the next deadline so the server can sleep instead of poll', () => {
    const { session } = setupGame({ secondsPerQuestion: 15, totalQuestions: 5 });
    expect(nextDeadline(session)).toBe(session.round!.endsAt);

    const resolved = answerCorrectly(
      answerCorrectly(session, 'blue', T0 + 1000).session,
      'red',
      T0 + 1100,
    ).session;
    expect(nextDeadline(resolved)).toBe(resolved.nextRoundAt);
  });

  it('has no deadline in the lobby, when paused, or when finished', () => {
    const { session } = setupGame({ stayInLobby: true });
    expect(nextDeadline(session)).toBeNull();

    const live = setupGame().session;
    const paused = pauseGame(live, T0 + 1000);
    if (!paused.ok) throw new Error('pause failed');
    expect(nextDeadline(paused.session)).toBeNull();

    const ended = endGame(live, T0 + 2000);
    if (!ended.ok) throw new Error('end failed');
    expect(nextDeadline(ended.session)).toBeNull();
  });

  it('measures the inter-round pause from when the round is resolved', () => {
    const { session, provider } = setupGame({ secondsPerQuestion: 10, totalQuestions: 5 });
    const lateBy = 5000;
    const observedAt = session.round!.endsAt + lateBy;

    // A late wake-up resolves the round but still grants a full inter-round
    // pause, so the class is never shown a question they had no time to read.
    const resolved = advance(session, provider, observedAt);
    expect(resolved.session.currentQuestionIndex).toBe(0);
    expect(resolved.session.nextRoundAt).toBe(observedAt + INTER_ROUND_MS);

    const next = advance(resolved.session, provider, resolved.session.nextRoundAt!);
    expect(next.session.currentQuestionIndex).toBe(1);
    expect(next.session.status).toBe('active');
  });
});

describe('pause and resume', () => {
  it('freezes the remaining time rather than the end timestamp', () => {
    const { session } = setupGame({ secondsPerQuestion: 20 });
    const at = session.round!.startedAt + 5000;

    const paused = pauseGame(session, at);
    if (!paused.ok) throw new Error('pause failed');
    expect(paused.session.status).toBe('paused');
    expect(paused.session.pausedRemainingMs).toBe(15_000);
  });

  it('restores exactly the time that was left, however long the pause lasted', () => {
    const { session } = setupGame({ secondsPerQuestion: 20 });
    const paused = pauseGame(session, session.round!.startedAt + 5000);
    if (!paused.ok) throw new Error('pause failed');

    // Resume ten minutes later; the round must still have 15s on it.
    const resumeAt = session.round!.startedAt + 605_000;
    const resumed = resumeGame(paused.session, resumeAt);
    if (!resumed.ok) throw new Error('resume failed');

    expect(resumed.session.status).toBe('active');
    expect(resumed.session.round!.endsAt).toBe(resumeAt + 15_000);
    expect(resumed.session.pausedRemainingMs).toBeNull();
  });

  it('does not expire a round while paused', () => {
    const { session, provider } = setupGame({ secondsPerQuestion: 10 });
    const paused = pauseGame(session, session.round!.startedAt + 1000);
    if (!paused.ok) throw new Error('pause failed');

    const later = advance(paused.session, provider, session.round!.endsAt + 60_000);
    expect(later.session.status).toBe('paused');
    expect(later.session.round!.resolvedAt).toBeNull();
  });

  it('refuses to pause a game that is not active', () => {
    const { session } = setupGame({ stayInLobby: true });
    expect(pauseGame(session, T0).ok).toBe(false);
  });

  it('refuses to resume a game that is not paused', () => {
    const { session } = setupGame();
    expect(resumeGame(session, T0).ok).toBe(false);
  });
});

describe('skip question', () => {
  it('abandons the round without awarding either team', () => {
    const { session } = setupGame({ totalQuestions: 5 });
    const skipped = skipQuestion(session, T0 + 3000);

    expect(skipped.session.round!.resolvedAt).toBe(T0 + 3000);
    expect(skipped.session.ropePosition).toBe(0);
    expect(skipped.session.teams.blue.score).toBe(0);
    expect(skipped.events.find((e) => e.type === 'round_resolved')).toMatchObject({
      reason: 'skipped',
    });
  });

  it('keeps a pull that was already earned this round', () => {
    const { session } = setupGame({ totalQuestions: 5 });
    const pulled = answerCorrectly(session, 'blue', T0 + 1000).session;
    const skipped = skipQuestion(pulled, T0 + 3000);

    expect(skipped.session.teams.blue.score).toBe(1);
    expect(skipped.session.ropePosition).toBeLessThan(0);
  });

  it('resumes a paused game so skipping is not a trap', () => {
    const { session } = setupGame({ totalQuestions: 5 });
    const paused = pauseGame(session, T0 + 1000);
    if (!paused.ok) throw new Error('pause failed');

    const skipped = skipQuestion(paused.session, T0 + 2000);
    expect(skipped.session.status).not.toBe('paused');
    expect(skipped.session.pausedRemainingMs).toBeNull();
  });
});

describe('winner detection', () => {
  it('ends the match the moment a pull reaches the threshold', () => {
    // A huge base pull means one correct answer wins outright.
    const { session } = setupGame({
      totalQuestions: 20,
      rules: { basePull: 2, maxSinglePull: 5, winThreshold: 1 },
    });

    const result = answerCorrectly(session, 'red', T0 + 1000);

    expect(result.session.status).toBe('finished');
    expect(result.session.winner).toBe('red');
    expect(result.session.ropePosition).toBe(1);
    const finished = result.events.find((e) => e.type === 'game_finished');
    expect(finished).toBeDefined();
    if (finished?.type === 'game_finished') {
      expect(finished.result.reason).toBe('rope_victory');
      expect(finished.result.winner).toBe('red');
    }
  });

  it('does not end the match one step short of the threshold', () => {
    const { session } = setupGame({
      totalQuestions: 20,
      rules: { basePull: 0.9, maxSinglePull: 0.9, winThreshold: 1 },
    });
    const result = answerCorrectly(session, 'red', T0 + 1000);
    expect(result.session.status).not.toBe('finished');
    expect(result.session.winner).toBeNull();
  });

  it('declares the rope leader when the question bank runs out', () => {
    const { session, provider } = setupGame({ totalQuestions: 3 });
    const finished = playUntilFinished(session, provider, 'blue');

    expect(finished.status).toBe('finished');
    expect(finished.winner).toBe('blue');
    expect(finished.currentQuestionIndex).toBe(2);
  });

  it('declares a draw when the rope never moves', () => {
    const { session, provider } = setupGame({ totalQuestions: 2, secondsPerQuestion: 10 });
    let current = session;

    // Let every round time out unanswered.
    for (let i = 0; i < 10 && current.status !== 'finished'; i += 1) {
      const advanced = tick(current, provider);
      if (advanced === current) break;
      current = advanced;
    }

    expect(current.status).toBe('finished');
    expect(current.ropePosition).toBe(0);
    expect(current.winner).toBe('draw');
  });

  it('never lets the rope travel beyond its ends', () => {
    const { session, provider } = setupGame({
      totalQuestions: 40,
      rules: { basePull: 0.4, maxSinglePull: 0.4 },
    });
    const finished = playUntilFinished(session, provider, 'red');
    expect(finished.ropePosition).toBeLessThanOrEqual(1);
    expect(finished.ropePosition).toBeGreaterThanOrEqual(-1);
  });

  it('produces a result summary with per-team and per-player detail', () => {
    const { session, provider } = setupGame({ totalQuestions: 3, playersPerTeam: 2 });
    const finished = playUntilFinished(session, provider, 'blue');

    expect(finished.status).toBe('finished');
    const blueScorer = finished.teams.blue.playerIds[0]!;
    expect(finished.players[blueScorer]!.correctCount).toBe(3);
    expect(finished.teams.blue.score).toBe(3);
    expect(finished.teams.red.score).toBe(0);
  });
});

describe('endGame', () => {
  it('lets the rope decide the winner when the host ends early', () => {
    const { session } = setupGame({ totalQuestions: 20 });
    const pulled = answerCorrectly(session, 'red', T0 + 1000).session;

    const ended = endGame(pulled, T0 + 5000);
    if (!ended.ok) throw new Error('end failed');

    expect(ended.session.status).toBe('finished');
    expect(ended.session.winner).toBe('red');
    const finished = ended.events.find((e) => e.type === 'game_finished');
    if (finished?.type === 'game_finished') {
      expect(finished.result.reason).toBe('ended_by_host');
    }
  });

  it('reports no winner when the game never started', () => {
    const { session } = setupGame({ stayInLobby: true });
    const ended = endGame(session, T0 + 100);
    if (!ended.ok) throw new Error('end failed');
    expect(ended.session.winner).toBeNull();
  });

  it('is idempotent', () => {
    const { session } = setupGame();
    const first = endGame(session, T0 + 100);
    if (!first.ok) throw new Error('end failed');
    const second = endGame(first.session, T0 + 200);
    if (!second.ok) throw new Error('second end failed');
    expect(second.session.finishedAt).toBe(T0 + 100);
  });

  it('accepts no further answers once finished', () => {
    const { session } = setupGame();
    const ended = endGame(session, T0 + 100);
    if (!ended.ok) throw new Error('end failed');

    const late = submitAnswer(ended.session, {
      playerId: session.teams.blue.playerIds[0]!,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: T0 + 200,
    });

    expect(late.outcome).toEqual({ status: 'rejected', reason: 'game_not_active' });
  });
});

describe('full game lifecycle', () => {
  it('runs lobby to finished in a single deterministic pass', () => {
    const { session, provider } = setupGame({ totalQuestions: 4, playersPerTeam: 2 });
    expect(session.status).toBe('active');

    const finished = playUntilFinished(session, provider, 'red');

    expect(finished.status).toBe('finished');
    expect(finished.winner).toBe('red');
    expect(finished.finishedAt).not.toBeNull();
    expect(finished.answers).toHaveLength(4);
    expect(finished.answers.every((a) => a.correct)).toBe(true);
    // Round indices are contiguous and zero-based.
    expect(finished.answers.map((a) => a.questionIndex)).toEqual([0, 1, 2, 3]);
  });

  it('never advances past the configured question count', () => {
    const { session, provider } = setupGame({ totalQuestions: 3 });
    const finished = playUntilFinished(session, provider, 'blue');
    expect(finished.currentQuestionIndex).toBeLessThanOrEqual(2);
  });
});
