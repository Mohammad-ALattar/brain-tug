import { DEFAULT_LANGUAGE, type GameLanguage } from '../content/language.js';
import type { ContentConfig } from '../content/source.js';
import { SUBJECT_LABEL, type Subject } from '../content/subject.js';
import { OPERATION_LABEL, type OperationChoice } from '../content/math/operations.js';
import type { Difficulty } from '../content/question.js';
import type { GameConfig } from '../domain/game.js';
import { defaultIdFactory, type IdFactory } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import { createTeam, defaultTeamNames, type TeamId } from '../domain/team.js';
import { GAME_MODE } from '../modes/registry.js';
import { GAME_MODES, type GameModeId } from '../modes/types.js';
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
  language?: GameLanguage;
  mode?: GameModeId;
  subject?: Subject;
  operation?: OperationChoice;
  difficulty?: Difficulty;
  totalQuestions?: number;
  secondsPerQuestion?: number;
  countdownMs?: number;
  teamNames?: Partial<Record<TeamId, string>>;
  rules?: Partial<GameRules>;
  /** Brain Race track length in metres. Ignored by other modes. */
  trackMetres?: number;
  /** Tug of War arena half-width in metres. Ignored by other modes. */
  arenaHalfMetres?: number;
  /** Brain Race: finishers needed to win. Host override; defaults at start. */
  finishersRequiredPerTeam?: number;
  ids?: IdFactory;
  now: number;
};

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function buildContent(options: CreateGameOptions): ContentConfig {
  const subject = options.subject ?? 'math';
  const difficulty = options.difficulty ?? 'easy';
  const language = options.language ?? 'en';
  if (subject === 'math') {
    return { subject, difficulty, language, operation: options.operation ?? 'mixed' };
  }
  return { subject, difficulty, language };
}

function buildRoundLabel(mode: GameModeId, content: ContentConfig): string {
  const modeLabel = GAME_MODE[mode].label;
  if (content.subject === 'math') {
    return `${OPERATION_LABEL[content.operation ?? 'mixed']} · ${modeLabel}`;
  }
  return `${SUBJECT_LABEL[content.subject]} · ${modeLabel}`;
}

export function buildConfig(options: CreateGameOptions): GameConfig {
  const mode = options.mode ?? 'tug_of_war';
  if (!GAME_MODES.includes(mode)) {
    throw new Error(`Unknown game mode "${String(mode)}"`);
  }

  const content = buildContent(options);
  const language = options.language ?? DEFAULT_LANGUAGE;
  const defaults = defaultTeamNames(language);
  const teamNames: Record<TeamId, string> = {
    blue: options.teamNames?.blue?.trim() || defaults.blue,
    red: options.teamNames?.red?.trim() || defaults.red,
  };

  return {
    mode,
    content,
    language,
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
    roundLabel: buildRoundLabel(mode, content),
    finishersRequiredPerTeam:
      mode === 'brain_race' && options.finishersRequiredPerTeam !== undefined
        ? Math.max(1, Math.round(options.finishersRequiredPerTeam))
        : undefined,
  };
}

/** Mints a fresh game in `lobby`. No questions exist until the host starts. */
export function createGame(options: CreateGameOptions): GameSession {
  const ids = options.ids ?? defaultIdFactory;
  const config = buildConfig(options);
  const rules: GameRules = { ...DEFAULT_RULES, ...options.rules };
  const mode = GAME_MODE[config.mode];

  return {
    gameId: ids.gameId(),
    roomCode: ids.roomCode(),
    hostToken: ids.hostToken(),
    status: 'lobby',
    config,
    rules,
    modeState: mode.createState({
      rules,
      trackMetres: options.trackMetres,
      arenaHalfMetres: options.arenaHalfMetres,
    }),
    teams: {
      blue: createTeam('blue', config.teamNames.blue),
      red: createTeam('red', config.teamNames.red),
    },
    players: {},
    playerTokens: {},
    round: null,
    currentQuestionIndex: -1,
    totalQuestions: config.totalQuestions,
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
