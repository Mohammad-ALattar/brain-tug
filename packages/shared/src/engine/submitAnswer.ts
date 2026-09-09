import { checkAnswer } from '../content/answer.js';
import type { AnswerOutcome, AnswerRecord, RejectionReason } from '../domain/answer.js';
import type { RoundTeamState } from '../domain/game.js';
import type { QuestionId } from '../domain/ids.js';
import type { PlayerId } from '../domain/ids.js';
import { modeOf, type GameSession } from '../domain/session.js';
import { finalizeBrainRaceGain } from '../modes/brainRace.js';
import { expectModeState } from '../modes/types.js';
import { computeGain } from '../rules/scoring.js';
import { roundDurationMs, settleAfterAnswer } from './rounds.js';
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
 *  8. the submitted value is well-formed for the question type
 *
 * Score, streak and progress are all computed here from the server's own rules;
 * nothing the client sends contributes to them.
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

  const checked = checkAnswer(teamRound.question, command.value);
  if (checked.status === 'malformed') return rejected(session, 'malformed_answer');

  const elapsedMs = Math.max(0, command.now - round.startedAt);

  const record: AnswerRecord = {
    playerId: command.playerId,
    teamId,
    questionId: teamRound.question.id,
    questionIndex: round.index,
    value: checked.value,
    correct: checked.correct,
    elapsedMs,
    submittedAt: command.now,
  };

  return checked.correct
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
  const mode = modeOf(session);
  const isRace = session.config.mode === 'brain_race';

  // Tug of War scores with the team streak; Brain Race streaks are per-player
  // and presentation-only in this phase, so distance gain ignores streak.
  const streakBefore = isRace ? player.streak : team.streak;
  const breakdown = computeGain(session.rules, {
    difficulty: teamRound.question.difficulty,
    elapsedMs,
    roundDurationMs: roundDurationMs(session),
    streak: isRace ? 0 : streakBefore,
  });

  const streak = streakBefore + 1;
  let modeState = mode.applyGain(session.modeState, { teamId, playerId: command.playerId }, breakdown.gain);
  if (isRace) {
    modeState = finalizeBrainRaceGain(
      session,
      expectModeState(modeState, 'brain_race'),
      command.playerId,
      teamId,
    );
  }

  const nextTeam = isRace
    ? {
        ...team,
        score: team.score + session.rules.pointsPerCorrect,
        correctCount: team.correctCount + 1,
        totalGain: team.totalGain + breakdown.gain,
      }
    : {
        ...team,
        score: team.score + session.rules.pointsPerCorrect,
        streak,
        bestStreak: Math.max(team.bestStreak, streak),
        correctCount: team.correctCount + 1,
        totalGain: team.totalGain + breakdown.gain,
      };

  const nextPlayer = isRace
    ? {
        ...player,
        correctCount: player.correctCount + 1,
        contribution: player.contribution + breakdown.gain,
        streak,
        bestStreak: Math.max(player.bestStreak, streak),
        fastestCorrectMs:
          player.fastestCorrectMs === null
            ? elapsedMs
            : Math.min(player.fastestCorrectMs, elapsedMs),
      }
    : {
        ...player,
        correctCount: player.correctCount + 1,
        contribution: player.contribution + breakdown.gain,
        fastestCorrectMs:
          player.fastestCorrectMs === null
            ? elapsedMs
            : Math.min(player.fastestCorrectMs, elapsedMs),
      };

  const next: GameSession = {
    ...session,
    modeState,
    answers: [...session.answers, record],
    teams: {
      ...session.teams,
      [teamId]: nextTeam,
    },
    players: {
      ...session.players,
      [command.playerId]: nextPlayer,
    },
    round: {
      ...round,
      teams: {
        ...round.teams,
        [teamId]: {
          ...teamRound,
          locked: mode.locksTeamOnCorrect,
          lockedByPlayerId: mode.locksTeamOnCorrect ? command.playerId : null,
          lockedAt: mode.locksTeamOnCorrect ? command.now : null,
          attemptedPlayerIds: [...teamRound.attemptedPlayerIds, command.playerId],
          draft: null,
        },
      },
    },
  };

  const outcome: AnswerOutcome = {
    status: 'correct',
    questionId: record.questionId,
    gain: breakdown.gain,
    points: session.rules.pointsPerCorrect,
    streak,
    elapsedMs,
  };

  const events: EngineEvent[] = [
    { type: 'answer_result', playerId: command.playerId, teamId, outcome },
    {
      type: 'progress_applied',
      teamId,
      playerId: command.playerId,
      gain: breakdown.gain,
      streak,
      score: next.teams[teamId].score,
      modeState,
    },
  ];

  const settled = settleAfterAnswer(next, command.now);
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
  const isRace = session.config.mode === 'brain_race';

  const nextTeam = isRace
    ? { ...team, incorrectCount: team.incorrectCount + 1 }
    : { ...team, streak: 0, incorrectCount: team.incorrectCount + 1 };

  const nextPlayer = isRace
    ? { ...player, incorrectCount: player.incorrectCount + 1, streak: 0 }
    : { ...player, incorrectCount: player.incorrectCount + 1 };

  const next: GameSession = {
    ...session,
    answers: [...session.answers, record],
    teams: {
      ...session.teams,
      [teamId]: nextTeam,
    },
    players: {
      ...session.players,
      [command.playerId]: nextPlayer,
    },
    round: {
      ...round,
      teams: {
        ...round.teams,
        [teamId]: {
          ...teamRound,
          attemptedPlayerIds: [...teamRound.attemptedPlayerIds, command.playerId],
          draft: null,
        },
      },
    },
  };

  const outcome: AnswerOutcome = {
    status: 'incorrect',
    questionId: record.questionId,
    elapsedMs,
  };

  const events: EngineEvent[] = [
    { type: 'answer_result', playerId: command.playerId, teamId, outcome },
  ];

  const settled = settleAfterAnswer(next, command.now);
  return { session: settled.session, events: [...events, ...settled.events], outcome };
}

/**
 * Records in-progress typing for the classroom display's mirrored keypad. Held
 * to the same membership and round guards as a real submission, but it never
 * touches score, progress or attempt state, and it is ignored for any question
 * that is not a typed answer.
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
  if (teamRound.question.type !== 'type_answer') return { session, events: [] };
  if (teamRound.locked || teamRound.attemptedPlayerIds.includes(command.playerId)) {
    return { session, events: [] };
  }

  const value =
    teamRound.question.inputMode === 'number'
      ? command.value.replace(/[^\d-]/g, '').slice(0, 12)
      : command.value.slice(0, 32);
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
