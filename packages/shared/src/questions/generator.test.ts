import { describe, expect, it } from 'vitest';
import {
  DIFFICULTIES,
  OPERATIONS,
  toPublicQuestion,
  type Difficulty,
  type Operation,
} from '../domain/question.js';
import { createSequentialIdFactory } from '../domain/ids.js';
import { generateQuestion, resolveOperation } from './generator.js';
import { createSeededRng } from './random.js';
import { BOUNDS } from './difficulty.js';

/** Exercises every operation/difficulty pair across many seeds. */
function sample(operation: Operation | 'mixed', difficulty: Difficulty, count = 300) {
  return Array.from({ length: count }, (_, i) =>
    generateQuestion({
      operation,
      difficulty,
      rng: createSeededRng(i + 1),
      ids: createSequentialIdFactory(),
    }),
  );
}

describe('generateQuestion', () => {
  it('produces the requested operation and difficulty', () => {
    for (const operation of OPERATIONS) {
      for (const difficulty of DIFFICULTIES) {
        for (const q of sample(operation, difficulty, 40)) {
          expect(q.operation).toBe(operation);
          expect(q.difficulty).toBe(difficulty);
        }
      }
    }
  });

  it('always computes the arithmetically correct answer', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const q of sample('mixed', difficulty)) {
        const expected =
          q.operation === 'addition'
            ? q.left + q.right
            : q.operation === 'subtraction'
              ? q.left - q.right
              : q.operation === 'multiplication'
                ? q.left * q.right
                : q.left / q.right;
        expect(q.answer).toBe(expected);
      }
    }
  });

  it('yields integer answers only', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const q of sample('mixed', difficulty)) {
        expect(Number.isInteger(q.answer)).toBe(true);
      }
    }
  });

  it('never produces a negative subtraction answer', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const q of sample('subtraction', difficulty)) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.left).toBeGreaterThanOrEqual(q.right);
      }
    }
  });

  it('never divides by zero and always divides exactly', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const q of sample('division', difficulty)) {
        expect(q.right).toBeGreaterThan(0);
        expect(q.left % q.right).toBe(0);
      }
    }
  });

  it('keeps operands inside the configured bounds', () => {
    for (const operation of OPERATIONS) {
      for (const difficulty of DIFFICULTIES) {
        const bounds = BOUNDS[operation][difficulty];
        for (const q of sample(operation, difficulty, 60)) {
          if (operation === 'division') {
            // Division is built from a quotient and divisor, so the bounds
            // constrain the answer and the divisor rather than the dividend.
            expect(q.answer).toBeGreaterThanOrEqual(bounds.left.min);
            expect(q.answer).toBeLessThanOrEqual(bounds.left.max);
            expect(q.right).toBeGreaterThanOrEqual(Math.max(1, bounds.right.min));
            expect(q.right).toBeLessThanOrEqual(bounds.right.max);
          } else if (operation === 'subtraction') {
            // Operands are reordered, so each falls in the union of both ranges.
            const lo = Math.min(bounds.left.min, bounds.right.min);
            const hi = Math.max(bounds.left.max, bounds.right.max);
            expect(q.left).toBeGreaterThanOrEqual(lo);
            expect(q.left).toBeLessThanOrEqual(hi);
            expect(q.right).toBeGreaterThanOrEqual(lo);
            expect(q.right).toBeLessThanOrEqual(hi);
          } else {
            expect(q.left).toBeGreaterThanOrEqual(bounds.left.min);
            expect(q.left).toBeLessThanOrEqual(bounds.left.max);
            expect(q.right).toBeGreaterThanOrEqual(bounds.right.min);
            expect(q.right).toBeLessThanOrEqual(bounds.right.max);
          }
        }
      }
    }
  });

  it('renders the prompt as operands only, with no result', () => {
    const q = generateQuestion({
      operation: 'multiplication',
      difficulty: 'easy',
      rng: createSeededRng(7),
      ids: createSequentialIdFactory(),
    });
    expect(q.prompt).toBe(`${q.left} \u00d7 ${q.right}`);
    expect(q.prompt).not.toContain('=');
  });

  it('drops the answer from the public projection', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const q of sample('mixed', difficulty, 20)) {
        const publicQuestion = toPublicQuestion(q);
        expect(publicQuestion).not.toHaveProperty('answer');
        expect(JSON.stringify(publicQuestion)).not.toContain('"answer"');
        // The operands still round-trip so the client can render the prompt.
        expect(publicQuestion.prompt).toBe(q.prompt);
      }
    }
  });

  it('is reproducible for a given seed', () => {
    const build = () =>
      generateQuestion({
        operation: 'mixed',
        difficulty: 'hard',
        rng: createSeededRng(1234),
        ids: createSequentialIdFactory(),
      });
    expect(build()).toEqual(build());
  });

  it('mixed eventually draws every operation', () => {
    const seen = new Set(sample('mixed', 'medium', 400).map((q) => q.operation));
    expect([...seen].sort()).toEqual([...OPERATIONS].sort());
  });
});

describe('resolveOperation', () => {
  it('passes concrete operations through untouched', () => {
    for (const operation of OPERATIONS) {
      expect(resolveOperation(operation, createSeededRng(5))).toBe(operation);
    }
  });

  it('resolves mixed to one of the concrete operations', () => {
    expect(OPERATIONS).toContain(resolveOperation('mixed', createSeededRng(5)));
  });
});
