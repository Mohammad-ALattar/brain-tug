import type { GameConfig } from '../domain/game.js';
import { defaultIdFactory, type IdFactory } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import { DEFAULT_TEAM_NAMES, createTeam, type TeamId } from '../domain/team.js';
import { OPERATION_LABEL, type Difficulty, type OperationChoice } from '../domain/question.js';
import {
  COUNTDOWN_MS,
  DEFAULT_RULES,
  DEFAULT_SECONDS_PER_QUESTION,
  DEFAULT_TOTAL_QUESTIONS,
  MAX_COUNTDOWN_MS,
  MAX_SECONDS_PER_QUESTION,
  MAX_TOTAL_QUESTIONS,
  MIN_COUNTDOWN_MS,
  MIN_SECONDS_PER_QUESTION,
  MIN_TOTAL_QUESTIONS,
  type GameRules,
} from '../rules/rules.js';

export type CreateGameOptions = {
  operation?: OperationChoice;
  difficulty?: Difficulty;
  totalQuestions?: number;
  secondsPerQuestion?: number;
  countdownMs?: number;
  teamNames?: Partial<Record<TeamId, string>>;
  rules?: Partial<GameRules>;
  ids?: IdFactory;
  now: number;
};

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function buildConfig(options: CreateGameOptions): GameConfig {
  const operation = options.operation ?? 'mixed';
  const difficulty = options.difficulty ?? 'easy';
  const teamNames: Record<TeamId, string> = {
    blue: options.teamNames?.blue?.trim() || DEFAULT_TEAM_NAMES.blue,
    red: options.teamNames?.red?.trim() || DEFAULT_TEAM_NAMES.red,
  };

  return {
    operation,
    difficulty,
    totalQuestions: clampInt(
      options.totalQuestions ?? DEFAULT_TOTAL_QUESTIONS,
      MIN_TOTAL_QUESTIONS,
      MAX_TOTAL_QUESTIONS,
      DEFAULT_TOTAL_QUESTIONS,
    ),
    secondsPerQuestion: clampInt(
      options.secondsPerQuestion ?? DEFAULT_SECONDS_PER_QUESTION,
      MIN_SECONDS_PER_QUESTION,
      MAX_SECONDS_PER_QUESTION,
      DEFAULT_SECONDS_PER_QUESTION,
    ),
    countdownMs: clampInt(
      options.countdownMs ?? COUNTDOWN_MS,
      MIN_COUNTDOWN_MS,
      MAX_COUNTDOWN_MS,
      COUNTDOWN_MS,
    ),
    teamNames,
    // Matches the reference subtitle `ROUND 1 - MULTIPLICATION DRILL`.
    roundLabel: `${OPERATION_LABEL[operation]} drill`,
  };
}

/** Mints a fresh game in `lobby`. No questions exist until the host starts. */
export function createGame(options: CreateGameOptions): GameSession {
  const ids = options.ids ?? defaultIdFactory;
  const config = buildConfig(options);
  const rules: GameRules = { ...DEFAULT_RULES, ...options.rules };

  return {
    gameId: ids.gameId(),
    roomCode: ids.roomCode(),
    hostToken: ids.hostToken(),
    status: 'lobby',
    config,
    rules,
    teams: {
      blue: createTeam('blue', config.teamNames.blue),
      red: createTeam('red', config.teamNames.red),
    },
    players: {},
    playerTokens: {},
    round: null,
    currentQuestionIndex: -1,
    totalQuestions: config.totalQuestions,
    ropePosition: 0,
    winner: null,
    answers: [],
    createdAt: options.now,
    startedAt: null,
    finishedAt: null,
    pausedRemainingMs: null,
    countdownEndsAt: null,
    nextRoundAt: null,
    result: null,
  };
}
