import { defaultIdFactory, type IdFactory } from '../domain/ids.js';
import type { Difficulty, OperationChoice, Question } from '../domain/question.js';
import { TEAM_IDS, type TeamId } from '../domain/team.js';
import { generateQuestion } from './generator.js';
import { defaultRng, type Rng } from './random.js';

/**
 * The engine never generates questions itself; it asks for them through this
 * interface. That keeps the reducers pure and lets tests feed scripted problems.
 */
export type QuestionProvider = {
  /** One question for a single team. */
  getNextQuestion(): Question;
  /** One distinct question per team for a shared round. */
  getNextQuestionPair(): Record<TeamId, Question>;
};

export type QuestionQueueOptions = {
  operation: OperationChoice;
  difficulty: Difficulty;
  rng?: Rng;
  ids?: IdFactory;
  /** How many recent prompts to avoid repeating. */
  historySize?: number;
};

const DEFAULT_HISTORY = 8;
/** Guard against pathological configs where few distinct problems exist. */
const MAX_ATTEMPTS = 24;

/**
 * Generates questions while avoiding recently-seen prompts, and guarantees the
 * two teams in a round never receive the identical prompt (which would let one
 * team read the other's answer off the classroom display).
 */
export function createQuestionQueue(options: QuestionQueueOptions): QuestionProvider {
  const rng = options.rng ?? defaultRng;
  const ids = options.ids ?? defaultIdFactory;
  const historySize = options.historySize ?? DEFAULT_HISTORY;
  const recent: string[] = [];

  const remember = (prompt: string): void => {
    recent.push(prompt);
    while (recent.length > historySize) recent.shift();
  };

  const generate = (avoid: ReadonlySet<string>): Question => {
    let fallback: Question | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const question = generateQuestion({
        operation: options.operation,
        difficulty: options.difficulty,
        rng,
        ids,
      });
      fallback ??= question;
      if (!avoid.has(question.prompt)) return question;
    }
    // Exhausted the space (e.g. easy addition with a large history); reuse.
    return fallback as Question;
  };

  return {
    getNextQuestion() {
      const question = generate(new Set(recent));
      remember(question.prompt);
      return question;
    },

    getNextQuestionPair() {
      const avoid = new Set(recent);
      const pair = {} as Record<TeamId, Question>;
      for (const teamId of TEAM_IDS) {
        const question = generate(avoid);
        // Block the sibling team from drawing the same prompt this round.
        avoid.add(question.prompt);
        remember(question.prompt);
        pair[teamId] = question;
      }
      return pair;
    },
  };
}
