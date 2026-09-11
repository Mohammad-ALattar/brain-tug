import { defaultIdFactory, type IdFactory } from '../domain/ids.js';
import type { QuestionBank } from './banks/types.js';
import type { GameLanguage } from './language.js';
import { localizeBankEntry, questionDedupKey } from './localize.js';
import { generateMathQuestion } from './math/generator.js';
import type { OperationChoice } from './math/operations.js';
import type { Difficulty, Question } from './question.js';
import { defaultRng, randomInt, type Rng } from './random.js';
import type { Subject } from './subject.js';

/**
 * Where questions come from. One method, because that is all any caller needs:
 * the difference between a generated subject and an authored one is entirely
 * behind this interface.
 */
export type QuestionSource = {
  /**
   * One question. `avoid` holds prompts the caller would rather not see again;
   * a source should honour it when it can and ignore it when its supply is too
   * small to, rather than failing.
   */
  next(avoid: ReadonlySet<string>): Question;
};

/** How many draws to spend looking for an unseen prompt before settling. */
const MAX_ATTEMPTS = 24;

export type MathSourceOptions = {
  operation: OperationChoice;
  difficulty: Difficulty;
  language?: GameLanguage;
  rng?: Rng;
  ids?: IdFactory;
};

export function createMathSource(options: MathSourceOptions): QuestionSource {
  const rng = options.rng ?? defaultRng;
  const ids = options.ids ?? defaultIdFactory;

  return {
    next(avoid) {
      let fallback: Question | null = null;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const question = generateMathQuestion({
          operation: options.operation,
          difficulty: options.difficulty,
          language: options.language,
          rng,
          ids,
        });
        fallback ??= question;
        if (!avoid.has(questionDedupKey(question))) return question;
      }
      // Exhausted the space, e.g. easy addition with a long history. Reusing a
      // prompt is better than stalling the round.
      return fallback as Question;
    },
  };
}

export type BankSourceOptions = {
  bank: QuestionBank;
  difficulty: Difficulty;
  language: GameLanguage;
  rng?: Rng;
  ids?: IdFactory;
};

/**
 * Draws from an authored bank, preferring the requested difficulty and unseen
 * prompts, but always returning something: a classroom bank is finite and a
 * long match will legitimately run past it.
 */
export function createBankSource(options: BankSourceOptions): QuestionSource {
  const rng = options.rng ?? defaultRng;
  const ids = options.ids ?? defaultIdFactory;
  const { bank } = options;

  const atDifficulty = bank.entries.filter((entry) => entry.difficulty === options.difficulty);
  // A bank with nothing at this difficulty still has to deal a question.
  const pool = atDifficulty.length > 0 ? atDifficulty : bank.entries;

  if (pool.length === 0) {
    throw new Error(`Question bank for "${bank.subject}" is empty`);
  }

  return {
    next(avoid) {
      const unseen = pool.filter((entry) => !avoid.has(entry.bankKey));
      const candidates = unseen.length > 0 ? unseen : pool;
      const picked = candidates[randomInt(rng, 0, candidates.length - 1)]!;
      return localizeBankEntry(
        picked,
        options.language,
        ids.questionId(),
        bank.subject,
      );
    },
  };
}

/** The content a host picked, fixed for the whole match. */
export type ContentConfig = {
  subject: Subject;
  difficulty: Difficulty;
  language: GameLanguage;
  /** Only meaningful for math, which is generated rather than authored. */
  operation?: OperationChoice;
};

export type QuestionSourceDeps = {
  rng?: Rng;
  ids?: IdFactory;
  /** Banks by subject. Injected so the engine never imports content data. */
  banks: Partial<Record<Subject, QuestionBank>>;
};

/**
 * Resolves a content choice to a source. This is the only place that knows math
 * is generated and everything else is authored.
 */
export function createQuestionSource(
  config: ContentConfig,
  deps: QuestionSourceDeps,
): QuestionSource {
  if (config.subject === 'math') {
    return createMathSource({
      operation: config.operation ?? 'mixed',
      difficulty: config.difficulty,
      language: config.language,
      rng: deps.rng,
      ids: deps.ids,
    });
  }

  const bank = deps.banks[config.subject];
  if (!bank) {
    throw new Error(`No question bank registered for subject "${config.subject}"`);
  }

  return createBankSource({
    bank,
    difficulty: config.difficulty,
    language: config.language,
    rng: deps.rng,
    ids: deps.ids,
  });
}
