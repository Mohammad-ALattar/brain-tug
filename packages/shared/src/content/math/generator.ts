import { defaultIdFactory, type IdFactory } from '../../domain/ids.js';
import type { Difficulty, TypeAnswerQuestion } from '../question.js';
import { defaultRng, pick, randomInt, type Rng } from '../random.js';
import { BOUNDS } from './difficulty.js';
import { OPERATIONS, formatPrompt, type Operation, type OperationChoice } from './operations.js';

/**
 * A bare arithmetic problem, before it becomes a question.
 *
 * Kept separate from `Question` so the arithmetic invariants (exact division,
 * no negative subtraction, operands inside bounds) can be stated and tested
 * without dragging the question envelope along.
 */
export type MathProblem = {
  operation: Operation;
  difficulty: Difficulty;
  left: number;
  right: number;
  answer: number;
};

export type MathProblemOptions = {
  operation: OperationChoice;
  difficulty: Difficulty;
  rng?: Rng;
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
export function buildMathProblem(options: MathProblemOptions): MathProblem {
  const rng = options.rng ?? defaultRng;
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

  return { operation, difficulty: options.difficulty, left, right, answer };
}

export type MathQuestionOptions = MathProblemOptions & { ids?: IdFactory };

/**
 * Wraps a problem as a typed-answer question on a numeric keypad, which is what
 * every game mode consumes. Math is the one subject generated rather than
 * authored, so it is endless and its difficulty is a knob rather than a label.
 */
export function generateMathQuestion(options: MathQuestionOptions): TypeAnswerQuestion {
  const ids = options.ids ?? defaultIdFactory;
  const problem = buildMathProblem(options);

  return {
    id: ids.questionId(),
    subject: 'math',
    difficulty: problem.difficulty,
    type: 'type_answer',
    inputMode: 'number',
    prompt: formatPrompt(problem.operation, problem.left, problem.right),
    accepted: [String(problem.answer)],
  };
}
