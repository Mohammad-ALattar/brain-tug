import { defaultIdFactory, type IdFactory } from '../domain/ids.js';
import {
  OPERATIONS,
  formatPrompt,
  type Difficulty,
  type Operation,
  type OperationChoice,
  type Question,
} from '../domain/question.js';
import { BOUNDS } from './difficulty.js';
import { defaultRng, pick, randomInt, type Rng } from './random.js';

export type GenerateQuestionOptions = {
  operation: OperationChoice;
  difficulty: Difficulty;
  rng?: Rng;
  ids?: IdFactory;
};

/** Resolves `mixed` to a concrete operation; passes others through. */
export function resolveOperation(choice: OperationChoice, rng: Rng): Operation {
  return choice === 'mixed' ? pick(rng, OPERATIONS) : choice;
}

/**
 * Produces one problem. Invariants held for every difficulty and operation:
 * subtraction never yields a negative answer, and division is always exact with
 * a non-zero divisor, because the dividend is built as `quotient x divisor`.
 */
export function generateQuestion(options: GenerateQuestionOptions): Question {
  const rng = options.rng ?? defaultRng;
  const ids = options.ids ?? defaultIdFactory;
  const operation = resolveOperation(options.operation, rng);
  const bounds = BOUNDS[operation][options.difficulty];

  let left: number;
  let right: number;
  let answer: number;

  switch (operation) {
    case 'addition': {
      left = randomInt(rng, bounds.left.min, bounds.left.max);
      right = randomInt(rng, bounds.right.min, bounds.right.max);
      answer = left + right;
      break;
    }
    case 'subtraction': {
      // Draw both operands then order them so the answer is never negative.
      const a = randomInt(rng, bounds.left.min, bounds.left.max);
      const b = randomInt(rng, bounds.right.min, bounds.right.max);
      left = Math.max(a, b);
      right = Math.min(a, b);
      answer = left - right;
      break;
    }
    case 'multiplication': {
      left = randomInt(rng, bounds.left.min, bounds.left.max);
      right = randomInt(rng, bounds.right.min, bounds.right.max);
      answer = left * right;
      break;
    }
    case 'division': {
      // Build backwards from the quotient so the division is always exact.
      const quotient = randomInt(rng, bounds.left.min, bounds.left.max);
      const divisor = Math.max(1, randomInt(rng, bounds.right.min, bounds.right.max));
      left = quotient * divisor;
      right = divisor;
      answer = quotient;
      break;
    }
  }

  return {
    id: ids.questionId(),
    operation,
    difficulty: options.difficulty,
    left,
    right,
    answer,
    prompt: formatPrompt(operation, left, right),
  };
}
