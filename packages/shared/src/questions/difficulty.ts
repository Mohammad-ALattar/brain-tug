import type { Difficulty, Operation } from '../domain/question.js';

/** Inclusive operand bounds per operation and difficulty. */
export type OperandRange = { min: number; max: number };

export type OperationBounds = {
  /** Bounds for the first operand (or the divisor's quotient, see generator). */
  left: OperandRange;
  right: OperandRange;
};

/**
 * Ranges are chosen so mental arithmetic stays plausible for a classroom:
 * multiplication stays inside extended times tables, and division is expressed
 * as `quotient x divisor` so it always divides exactly.
 */
export const BOUNDS: Record<Operation, Record<Difficulty, OperationBounds>> = {
  addition: {
    easy: { left: { min: 1, max: 10 }, right: { min: 1, max: 10 } },
    medium: { left: { min: 10, max: 50 }, right: { min: 10, max: 50 } },
    hard: { left: { min: 25, max: 200 }, right: { min: 25, max: 200 } },
  },
  subtraction: {
    easy: { left: { min: 1, max: 10 }, right: { min: 1, max: 10 } },
    medium: { left: { min: 10, max: 60 }, right: { min: 5, max: 40 } },
    hard: { left: { min: 50, max: 250 }, right: { min: 10, max: 150 } },
  },
  multiplication: {
    easy: { left: { min: 1, max: 6 }, right: { min: 1, max: 10 } },
    medium: { left: { min: 2, max: 12 }, right: { min: 2, max: 12 } },
    hard: { left: { min: 6, max: 20 }, right: { min: 4, max: 15 } },
  },
  division: {
    // `left` is the quotient and `right` the divisor; the dividend is their product.
    easy: { left: { min: 1, max: 10 }, right: { min: 1, max: 5 } },
    medium: { left: { min: 2, max: 12 }, right: { min: 2, max: 10 } },
    hard: { left: { min: 3, max: 20 }, right: { min: 3, max: 12 } },
  },
};
