import type { AnswerOutcome, AnswerRecord, RejectionReason } from '../domain/answer.js';
import type { QuestionId } from '../domain/ids.js';
import type { PlayerId } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import type { RoundTeamState } from '../domain/game.js';
import { parseAnswerInput, validateAnswer } from '../questions/validate.js';
import { applyPull } from '../rules/rope.js';
import { computePull } from '../rules/scoring.js';
import { roundDurationMs, settleAfterPull } from './rounds.js';
import type { EngineEvent, EngineResult } from './types.js';

export type SubmitAnswerCommand = {
  playerId: PlayerId;
  /**
   * The question the client believes it is answering. Compared against the
   * server's current question so a late or replayed submission is refused rather
   * than silently applied to the wrong round.
   */
  questionId: QuestionId;
  /** Raw student input. Never trusted; parsed and validated here. */
  value: string | number;
  now: number;
};

export type SubmitAnswerResult = EngineResult & { outcome: AnswerOutcome };

function rejected(session: GameSession, reason: RejectionReason): SubmitAnswerResult {
  const outcome: AnswerOutcome = { status: 'rejected', reason };
  return { session, events: [], outcome };
}

/**
 * The authoritative answer path. Every guard the client could try to bypass is
 * checked here, in order, before any state changes:
 *
 *  1. the submitter is a seated player in this game
 *  2. the game is active (not lobby, countdown, paused or finished)
 *  3. a round is open and unresolved
 *  4. the question id matches the one issued to *that player's own team*
 *  5. the round clock has not expired, measured against the server clock
 *  6. the team has not already been locked by a correct answer
 *  7. the player has not already spent their attempt this round
 *  8. the submitted value parses as an integer
 *
 * Score, streak, rope position and pull are all computed here from the server's
 * own rules; nothing the client sends contributes to them.
 */
export function submitAnswer(
  session: GameSession,
  command: SubmitAnswerCommand,
): SubmitAnswerResult {
  const player = session.players[command.playerId];
  if (!player) return rejected(session, 'not_a_player');

  if (session.status === 'paused') return rejected(session, 'game_paused');
  if (session.status !== 'active') return rejected(session, 'game_not_active');

  const round = session.round;
  if (!round || round.resolvedAt !== null) return rejected(session, 'round_not_active');

  const teamId = player.teamId;
  const teamRound: RoundTeamState = round.teams[teamId];

  // A player may only ever answer their own team's question. Sending the other
  // team's question id lands here as a stale question, not a cross-team answer.
  if (teamRound.question.id !== command.questionId) {
    return rejected(session, 'stale_question');
  }
  if (command.now > round.endsAt) return rejected(session, 'time_expired');
  if (teamRound.locked) return rejected(session, 'team_already_locked');
  if (teamRound.attemptedPlayerIds.includes(command.playerId)) {
    return rejected(session, 'player_already_answered');
  }

  const parsed = parseAnswerInput(command.value);
  if (parsed === null) return rejected(session, 'malformed_answer');

  const correct = validateAnswer(teamRound.question, parsed);
  const elapsedMs = Math.max(0, command.now - round.startedAt);

  const record: AnswerRecord = {
    playerId: command.playerId,
    teamId,
    questionId: teamRound.question.id,
    questionIndex: round.index,
    value: parsed,
    correct,
    elapsedMs,
    submittedAt: command.now,
  };

  return correct
    ? applyCorrect(session, command, record, elapsedMs)
    : applyIncorrect(session, command, record, elapsedMs);
}

function applyCorrect(
  session: GameSession,
  command: SubmitAnswerCommand,
  record: AnswerRecord,
  elapsedMs: number,
): SubmitAnswerResult {
  const round = session.round!;
  const teamId = record.teamId;
  const team = session.teams[teamId];
  const player = session.players[command.playerId]!;
  const teamRound = round.teams[teamId];

  // The streak *before* this answer feeds the multiplier, so the first correct
  // answer of a run is unmultiplied.
  const breakdown = computePull(session.rules, {
    difficulty: teamRound.question.difficulty,
    elapsedMs,
    roundDurationMs: roundDurationMs(session),
    streak: team.streak,
  });

  const streak = team.streak + 1;
  const ropePosition = applyPull(session.ropePosition, teamId, breakdown.pull);

  const next: GameSession = {
    ...session,
    ropePosition,
    answers: [...session.answers, record],
    teams: {
      ...session.teams,
      [teamId]: {
        ...team,
        score: team.score + session.rules.pointsPerCorrect,
        streak,
        bestStreak: Math.max(team.bestStreak, streak),
        correctCount: team.correctCount + 1,
        totalPull: team.totalPull + breakdown.pull,
      },
    },
    players: {
      ...session.players,
      [command.playerId]: {
        ...player,
        correctCount: player.correctCount + 1,
        contributedPull: player.contributedPull + breakdown.pull,
        fastestCorrectMs:
          player.fastestCorrectMs === null
            ? elapsedMs
            : Math.min(player.fastestCorrectMs, elapsedMs),
      },
    },
    round: {
      ...round,
      teams: {
        ...round.teams,
        [teamId]: {
          ...teamRound,
          locked: true,
          lockedByPlayerId: command.playerId,
          lockedAt: command.now,
          attemptedPlayerIds: [...teamRound.attemptedPlayerIds, command.playerId],
          // Clear the mirror so the TV stops showing a half-typed answer.
          draft: null,
        },
      },
    },
  };

  const outcome: AnswerOutcome = {
    status: 'correct',
    questionId: record.questionId,
    pull: breakdown.pull,
    points: session.rules.pointsPerCorrect,
    streak,
    elapsedMs,
  };

  const events: EngineEvent[] = [
    { type: 'answer_result', playerId: command.playerId, teamId, outcome },
    {
      type: 'pull_applied',
      teamId,
      playerId: command.playerId,
      pull: breakdown.pull,
      ropePosition,
      streak,
      score: next.teams[teamId].score,
    },
  ];

  // Both teams answering correctly ends the round early, and a pull that reaches
  // the threshold ends the game. Both are rules, so they are applied here rather
  // than being left for the caller to remember.
  const settled = settleAfterPull(next, command.now);
  return { session: settled.session, events: [...events, ...settled.events], outcome };
}

function applyIncorrect(
  session: GameSession,
  command: SubmitAnswerCommand,
  record: AnswerRecord,
  elapsedMs: number,
): SubmitAnswerResult {
  const round = session.round!;
  const teamId = record.teamId;
  const team = session.teams[teamId];
  const player = session.players[command.playerId]!;
  const teamRound = round.teams[teamId];

  const next: GameSession = {
    ...session,
    answers: [...session.answers, record],
    teams: {
      ...session.teams,
      // A wrong answer breaks the team's streak but costs no rope.
      [teamId]: { ...team, streak: 0, incorrectCount: team.incorrectCount + 1 },
    },
    players: {
      ...session.players,
      [command.playerId]: { ...player, incorrectCount: player.incorrectCount + 1 },
    },
    round: {
      ...round,
      teams: {
        ...round.teams,
        [teamId]: {
          ...teamRound,
          // The attempt is spent, which is what prevents brute-forcing.
          attemptedPlayerIds: [...teamRound.attemptedPlayerIds, command.playerId],
          draft: null,
        },
      },
    },
  };

  const outcome: AnswerOutcome = {
    status: 'incorrect',
    questionId: record.questionId,
    correctAnswer: teamRound.question.answer,
    elapsedMs,
  };

  const events: EngineEvent[] = [
    { type: 'answer_result', playerId: command.playerId, teamId, outcome },
  ];

  // A wrong answer can still be the last available attempt, which closes the round.
  const settled = settleAfterPull(next, command.now);
  return { session: settled.session, events: [...events, ...settled.events], outcome };
}

/**
 * Records in-progress typing for the classroom display's mirrored keypad. Held
 * to the same membership and round guards as a real submission, but it never
 * touches score, rope or attempt state.
 */
export function setAnswerDraft(
  session: GameSession,
  command: { playerId: PlayerId; value: string; now: number },
): EngineResult {
  const player = session.players[command.playerId];
  if (!player) return { session, events: [] };
  if (session.status !== 'active') return { session, events: [] };

  const round = session.round;
  if (!round || round.resolvedAt !== null) return { session, events: [] };

  const teamId = player.teamId;
  const teamRound = round.teams[teamId];
  if (teamRound.locked || teamRound.attemptedPlayerIds.includes(command.playerId)) {
    return { session, events: [] };
  }

  // Only digits, and only as many as an answer could plausibly need.
  const value = command.value.replace(/[^\d-]/g, '').slice(0, 12);
  const draft = { playerId: command.playerId, value, updatedAt: command.now };

  const next: GameSession = {
    ...session,
    round: {
      ...round,
      teams: { ...round.teams, [teamId]: { ...teamRound, draft } },
    },
  };

  return { session: next, events: [{ type: 'draft_updated', teamId, draft }] };
}
