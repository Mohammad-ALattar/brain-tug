import { formatPrompt } from '../content/math/operations.js';
import type { QuestionDealer } from '../content/dealer.js';
import type { Difficulty, Question, TypeAnswerQuestion } from '../content/question.js';
import { createSequentialIdFactory, type IdFactory, type PlayerId } from '../domain/ids.js';
import type { QuestionId } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import { TEAM_IDS, type TeamId } from '../domain/team.js';
import { expectModeState, type GameModeId, type BrainRaceState, type TugOfWarState } from '../modes/types.js';
import type { GameRules } from '../rules/rules.js';
import { revealAnswer } from '../content/answer.js';
import { createGame } from './createGame.js';
import { joinGame } from './membership.js';
import { startGame } from './lifecycle.js';
import { advance } from './timers.js';

/**
 * Test doubles for the engine. Exported from the package (rather than kept in a
 * test file) so the server's tests can drive real games through the same
 * deterministic dealer.
 */

export type ScriptedProblem = {
  left: number;
  right: number;
  answer: number;
  difficulty?: Difficulty;
};

function mathQuestion(
  spec: ScriptedProblem,
  ids: IdFactory,
): TypeAnswerQuestion {
  return {
    id: ids.questionId(),
    subject: 'math',
    difficulty: spec.difficulty ?? 'easy',
    type: 'type_answer',
    inputMode: 'number',
    prompt: formatPrompt('multiplication', spec.left, spec.right),
    accepted: [String(spec.answer)],
  };
}

/** A dealer that hands out scripted math problems, cycling if it runs dry. */
export function scriptedDealer(
  problems: ScriptedProblem[],
  ids: IdFactory = createSequentialIdFactory(),
): QuestionDealer {
  let cursor = 0;
  const nextQuestion = (): Question => {
    const spec = problems[cursor % problems.length]!;
    cursor += 1;
    return mathQuestion(spec, ids);
  };

  return {
    deal(assignment) {
      if (assignment === 'shared') {
        const question = nextQuestion();
        return { blue: question, red: question };
      }
      return { blue: nextQuestion(), red: nextQuestion() };
    },
  };
}

/** A dealer whose every question is `2 × 10 = 20`, for simple assertions. */
export function constantDealer(answer = 20, difficulty: Difficulty = 'easy'): QuestionDealer {
  return scriptedDealer([{ left: 2, right: 10, answer, difficulty }]);
}

export type TestGame = {
  session: GameSession;
  dealer: QuestionDealer;
  blue: PlayerId[];
  red: PlayerId[];
};

export type SetupOptions = {
  mode?: GameModeId;
  subject?: GameSession['config']['content']['subject'];
  playersPerTeam?: number;
  totalQuestions?: number;
  secondsPerQuestion?: number;
  rules?: Partial<GameRules>;
  dealer?: QuestionDealer;
  trackMetres?: number;
  /** Brain Race: finishers needed to win. Resolved at start when omitted. */
  finishersRequiredPerTeam?: number;
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
  const dealer = options.dealer ?? constantDealer();
  const perTeam = options.playersPerTeam ?? 1;

  let session = createGame({
    mode: options.mode ?? 'tug_of_war',
    subject: options.subject ?? 'math',
    operation: 'multiplication',
    difficulty: 'easy',
    totalQuestions: options.totalQuestions ?? 5,
    secondsPerQuestion: options.secondsPerQuestion ?? 20,
    rules: options.rules,
    trackMetres: options.trackMetres,
    finishersRequiredPerTeam: options.finishersRequiredPerTeam,
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
    session = advance(started.session, dealer, now + 5000).session;
  }

  return { session, dealer, blue, red };
}

/** The question id currently issued to a team, for building submissions. */
export function questionIdFor(session: GameSession, teamId: TeamId): QuestionId {
  const round = session.round;
  if (!round) throw new Error('no active round');
  return round.teams[teamId].question.id;
}

/** The canonical correct answer for a team's current question, as a string. */
export function correctAnswerFor(session: GameSession, teamId: TeamId): string {
  const round = session.round;
  if (!round) throw new Error('no active round');
  return revealAnswer(round.teams[teamId].question);
}

export function asTug(session: GameSession): TugOfWarState {
  return expectModeState(session.modeState, 'tug_of_war');
}

export function asRace(session: GameSession): BrainRaceState {
  return expectModeState(session.modeState, 'brain_race');
}

/** Overwrites tug-of-war rope position without going through scoring. */
export function withRope(session: GameSession, ropePosition: number): GameSession {
  return { ...session, modeState: { ...asTug(session), ropePosition } };
}

export function withRaceProgress(
  session: GameSession,
  progress: Partial<Record<PlayerId, number>>,
): GameSession {
  const race = asRace(session);
  const merged: Record<PlayerId, number> = { ...race.progress };
  for (const [playerId, value] of Object.entries(progress) as [PlayerId, number | undefined][]) {
    if (value !== undefined) merged[playerId] = value;
  }
  return {
    ...session,
    modeState: { ...race, progress: merged },
  };
}

export function playerRaceProgress(session: GameSession, playerId: PlayerId): number {
  return asRace(session).progress[playerId] ?? 0;
}
