import { describe, expect, it } from 'vitest';
import type { PlayerId, QuestionId } from '../domain/ids.js';
import { pauseGame } from './lifecycle.js';
import { setAnswerDraft, submitAnswer } from './submitAnswer.js';
import { T0, correctAnswerFor, questionIdFor, setupGame } from './testing.js';

const AT = T0 + 5000;

describe('submitAnswer - happy path', () => {
  it('scores a correct answer and pulls the rope toward the team', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT,
    });

    expect(result.outcome.status).toBe('correct');
    expect(result.session.teams.blue.score).toBe(1);
    expect(result.session.teams.blue.correctCount).toBe(1);
    expect(result.session.teams.blue.streak).toBe(1);
    // Blue pulls the rope negative.
    expect(result.session.ropePosition).toBeLessThan(0);
    expect(result.session.teams.red.score).toBe(0);
  });

  it('pulls the rope toward red for a red answer', () => {
    const { session } = setupGame();
    const red = session.teams.red.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: red,
      questionId: questionIdFor(session, 'red'),
      value: correctAnswerFor(session, 'red'),
      now: AT,
    });

    expect(result.session.ropePosition).toBeGreaterThan(0);
  });

  it('locks the team and names the player who locked it', () => {
    const { session } = setupGame({ playersPerTeam: 2 });
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT,
    });

    expect(result.session.round!.teams.blue.locked).toBe(true);
    expect(result.session.round!.teams.blue.lockedByPlayerId).toBe(blue);
    expect(result.session.round!.teams.red.locked).toBe(false);
  });

  it('credits the individual player as well as the team', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT,
    });

    const player = result.session.players[blue]!;
    expect(player.correctCount).toBe(1);
    expect(player.contributedPull).toBeGreaterThan(0);
    expect(player.fastestCorrectMs).toBe(AT - session.round!.startedAt);
  });

  it('emits a pull_applied event carrying the rope delta for the arena', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT,
    });

    const pull = result.events.find((e) => e.type === 'pull_applied');
    expect(pull).toBeDefined();
    expect(pull).toMatchObject({ teamId: 'blue', playerId: blue, streak: 1 });
  });

  it('records the submission for the teacher review log', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT,
    });

    expect(result.session.answers).toHaveLength(1);
    expect(result.session.answers[0]).toMatchObject({
      playerId: blue,
      teamId: 'blue',
      correct: true,
      questionIndex: 0,
    });
  });
});

describe('submitAnswer - incorrect answers', () => {
  it('spends the attempt and resets the team streak', () => {
    const { session } = setupGame({ playersPerTeam: 2 });
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue') + 7,
      now: AT,
    });

    expect(result.outcome.status).toBe('incorrect');
    if (result.outcome.status === 'incorrect') {
      expect(result.outcome.correctAnswer).toBe(correctAnswerFor(session, 'blue'));
    }
    expect(result.session.teams.blue.streak).toBe(0);
    expect(result.session.teams.blue.incorrectCount).toBe(1);
    expect(result.session.ropePosition).toBe(0);
    expect(result.session.round!.teams.blue.attemptedPlayerIds).toContain(blue);
    expect(result.session.round!.teams.blue.locked).toBe(false);
  });
});

describe('submitAnswer - rejections', () => {
  it('refuses a player who is not in the game', () => {
    const { session } = setupGame();
    const result = submitAnswer(session, {
      playerId: 'ghost' as PlayerId,
      questionId: questionIdFor(session, 'blue'),
      value: 20,
      now: AT,
    });
    expect(result.outcome).toEqual({ status: 'rejected', reason: 'not_a_player' });
    expect(result.session).toBe(session);
  });

  it('refuses an answer aimed at the other team\u2019s question', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      // Blue submitting red's question id must not cross teams.
      questionId: questionIdFor(session, 'red'),
      value: correctAnswerFor(session, 'red'),
      now: AT,
    });

    expect(result.outcome).toEqual({ status: 'rejected', reason: 'stale_question' });
    expect(result.session.ropePosition).toBe(0);
  });

  it('refuses a stale question id from a previous round', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: 'q_stale' as QuestionId,
      value: correctAnswerFor(session, 'blue'),
      now: AT,
    });

    expect(result.outcome).toEqual({ status: 'rejected', reason: 'stale_question' });
  });

  it('refuses a submission after the clock expired', () => {
    const { session } = setupGame({ secondsPerQuestion: 10 });
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: session.round!.endsAt + 1,
    });

    expect(result.outcome).toEqual({ status: 'rejected', reason: 'time_expired' });
    expect(result.session.ropePosition).toBe(0);
  });

  it('accepts a submission on the final millisecond', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: session.round!.endsAt,
    });

    expect(result.outcome.status).toBe('correct');
  });

  it('refuses a second answer from the same player in one round', () => {
    const { session } = setupGame({ playersPerTeam: 2 });
    const blue = session.teams.blue.playerIds[0]!;
    const questionId = questionIdFor(session, 'blue');

    const first = submitAnswer(session, {
      playerId: blue,
      questionId,
      value: correctAnswerFor(session, 'blue') + 1,
      now: AT,
    });
    const second = submitAnswer(first.session, {
      playerId: blue,
      questionId,
      value: correctAnswerFor(session, 'blue'),
      now: AT + 100,
    });

    expect(second.outcome).toEqual({ status: 'rejected', reason: 'player_already_answered' });
    expect(second.session.ropePosition).toBe(0);
  });

  it('refuses a teammate once the team has locked', () => {
    const { session } = setupGame({ playersPerTeam: 3 });
    const [first, second] = session.teams.blue.playerIds as [PlayerId, PlayerId];
    const questionId = questionIdFor(session, 'blue');
    const answer = correctAnswerFor(session, 'blue');

    const locked = submitAnswer(session, { playerId: first, questionId, value: answer, now: AT });
    const late = submitAnswer(locked.session, {
      playerId: second,
      questionId,
      value: answer,
      now: AT + 50,
    });

    expect(late.outcome).toEqual({ status: 'rejected', reason: 'team_already_locked' });
    expect(late.session.teams.blue.score).toBe(1);
  });

  it('refuses submissions while the game is paused', () => {
    const { session } = setupGame();
    const paused = pauseGame(session, AT);
    if (!paused.ok) throw new Error('pause failed');
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(paused.session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT + 10,
    });

    expect(result.outcome).toEqual({ status: 'rejected', reason: 'game_paused' });
  });

  it('refuses submissions in the lobby', () => {
    const { session } = setupGame({ stayInLobby: true });
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: 'q1' as QuestionId,
      value: 20,
      now: AT,
    });

    expect(result.outcome).toEqual({ status: 'rejected', reason: 'game_not_active' });
  });

  it('refuses malformed answers without spending the attempt', () => {
    const { session } = setupGame({ playersPerTeam: 2 });
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: 'twenty',
      now: AT,
    });

    expect(result.outcome).toEqual({ status: 'rejected', reason: 'malformed_answer' });
    expect(result.session.round!.teams.blue.attemptedPlayerIds).toHaveLength(0);
  });
});

describe('submitAnswer - client cannot influence authoritative state', () => {
  it('ignores extra fields a malicious client might send', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const hostile = {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT,
      // None of these are part of the command type and must have no effect.
      score: 9999,
      ropePosition: 0.99,
      pull: 5,
      streak: 50,
    } as Parameters<typeof submitAnswer>[1];

    const result = submitAnswer(session, hostile);

    expect(result.session.teams.blue.score).toBe(1);
    expect(result.session.teams.blue.streak).toBe(1);
    expect(Math.abs(result.session.ropePosition)).toBeLessThan(0.2);
  });

  it('derives elapsed time from the server clock, not the client', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT,
    });

    expect(result.session.answers[0]!.elapsedMs).toBe(AT - session.round!.startedAt);
  });
});

describe('setAnswerDraft', () => {
  it('records digits for the classroom mirror', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = setAnswerDraft(session, { playerId: blue, value: '2', now: AT });

    expect(result.session.round!.teams.blue.draft).toMatchObject({ playerId: blue, value: '2' });
    expect(result.events[0]).toMatchObject({ type: 'draft_updated', teamId: 'blue' });
  });

  it('strips non-numeric characters and caps the length', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = setAnswerDraft(session, {
      playerId: blue,
      value: '1a2<script>3' + '9'.repeat(40),
      now: AT,
    });

    expect(result.session.round!.teams.blue.draft!.value).toBe('123999999999');
  });

  it('never touches score or rope position', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const result = setAnswerDraft(session, { playerId: blue, value: '20', now: AT });

    expect(result.session.teams.blue.score).toBe(0);
    expect(result.session.ropePosition).toBe(0);
  });

  it('is cleared once the player submits', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;
    const drafted = setAnswerDraft(session, { playerId: blue, value: '2', now: AT });

    const submitted = submitAnswer(drafted.session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: AT + 10,
    });

    expect(submitted.session.round!.teams.blue.draft).toBeNull();
  });

  it('ignores drafts from a player who already answered', () => {
    const { session } = setupGame({ playersPerTeam: 2 });
    const blue = session.teams.blue.playerIds[0]!;
    const spent = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue') + 3,
      now: AT,
    });

    const result = setAnswerDraft(spent.session, { playerId: blue, value: '7', now: AT + 10 });
    expect(result.events).toHaveLength(0);
  });

  it('ignores drafts from a stranger', () => {
    const { session } = setupGame();
    const result = setAnswerDraft(session, {
      playerId: 'ghost' as PlayerId,
      value: '5',
      now: AT,
    });
    expect(result.session).toBe(session);
    expect(result.events).toHaveLength(0);
  });
});
