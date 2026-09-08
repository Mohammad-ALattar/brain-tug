import { createSequentialIdFactory, type IdFactory, type PlayerId } from '../domain/ids.js';
import { formatPrompt, type Difficulty, type Question } from '../domain/question.js';
import type { QuestionId } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import type { QuestionProvider } from '../questions/queue.js';
import { TEAM_IDS, type TeamId } from '../domain/team.js';
import type { GameRules } from '../rules/rules.js';
import { createGame } from './createGame.js';
import { joinGame } from './membership.js';
import { startGame } from './lifecycle.js';
import { advance } from './timers.js';

/**
 * Test doubles for the engine. Exported from the package (rather than kept in a
 * test file) so the server's tests can drive real games through the same
 * deterministic provider.
 */

/** A provider that hands out scripted problems, cycling if it runs dry. */
export function scriptedProvider(
  problems: { left: number; right: number; answer: number; difficulty?: Difficulty }[],
  ids: IdFactory = createSequentialIdFactory(),
): QuestionProvider {
  let cursor = 0;
  const nextQuestion = (): Question => {
    const spec = problems[cursor % problems.length]!;
    cursor += 1;
    return {
      id: ids.questionId(),
      operation: 'multiplication',
      difficulty: spec.difficulty ?? 'easy',
      left: spec.left,
      right: spec.right,
      answer: spec.answer,
      prompt: formatPrompt('multiplication', spec.left, spec.right),
    };
  };

  return {
    getNextQuestion: nextQuestion,
    getNextQuestionPair: () => {
      const pair = {} as Record<TeamId, Question>;
      for (const teamId of TEAM_IDS) pair[teamId] = nextQuestion();
      return pair;
    },
  };
}

/** A provider whose every question is `2 x 10 = 20`, for simple assertions. */
export function constantProvider(answer = 20, difficulty: Difficulty = 'easy'): QuestionProvider {
  return scriptedProvider([{ left: 2, right: 10, answer, difficulty }]);
}

export type TestGame = {
  session: GameSession;
  provider: QuestionProvider;
  blue: PlayerId[];
  red: PlayerId[];
};

export type SetupOptions = {
  playersPerTeam?: number;
  totalQuestions?: number;
  secondsPerQuestion?: number;
  rules?: Partial<GameRules>;
  provider?: QuestionProvider;
  now?: number;
  /** Leave the game in `lobby` instead of starting it. */
  stayInLobby?: boolean;
};

export const T0 = 1_000_000;

/**
 * Builds a game with players seated on both teams and, by default, advances it
 * past the countdown so round 0 is live. Every id is sequential and every
 * timestamp derives from `T0`, so assertions can be exact.
 */
export function setupGame(options: SetupOptions = {}): TestGame {
  const ids = createSequentialIdFactory();
  const now = options.now ?? T0;
  const provider = options.provider ?? constantProvider();
  const perTeam = options.playersPerTeam ?? 1;

  let session = createGame({
    operation: 'multiplication',
    difficulty: 'easy',
    totalQuestions: options.totalQuestions ?? 5,
    secondsPerQuestion: options.secondsPerQuestion ?? 20,
    rules: options.rules,
    ids,
    now,
  });

  const blue: PlayerId[] = [];
  const red: PlayerId[] = [];

  for (const teamId of TEAM_IDS) {
    for (let i = 0; i < perTeam; i += 1) {
      const result = joinGame(session, { name: `${teamId}-${i}`, teamId, ids, now });
      if (!result.ok || !result.joined) throw new Error('join failed in setupGame');
      session = result.session;
      (teamId === 'blue' ? blue : red).push(result.joined.playerId);
    }
  }

  if (!options.stayInLobby) {
    const started = startGame(session, { now, allowEmptyTeams: perTeam === 0 });
    if (!started.ok) throw new Error(`startGame failed: ${started.message}`);
    // Skip the countdown so tests begin on a live round.
    session = advance(started.session, provider, now + 5000).session;
  }

  return { session, provider, blue, red };
}

/** The question id currently issued to a team, for building submissions. */
export function questionIdFor(session: GameSession, teamId: TeamId): QuestionId {
  const round = session.round;
  if (!round) throw new Error('no active round');
  return round.teams[teamId].question.id;
}

/** The correct answer for a team's current question. */
export function correctAnswerFor(session: GameSession, teamId: TeamId): number {
  const round = session.round;
  if (!round) throw new Error('no active round');
  return round.teams[teamId].question.answer;
}
