import { describe, expect, it } from 'vitest';
import { createSequentialIdFactory } from '../../domain/ids.js';
import { DIFFICULTIES, type Difficulty } from '../question.js';
import { createSeededRng } from '../random.js';
import { BOUNDS } from './difficulty.js';
import { buildMathProblem, generateMathQuestion, resolveOperation } from './generator.js';
import { OPERATIONS, type Operation } from './operations.js';

/** Exercises every operation/difficulty pair across many seeds. */
function sample(operation: Operation | 'mixed', difficulty: Difficulty, count = 300) {
  return Array.from({ length: count }, (_, i) =>
    buildMathProblem({ operation, difficulty, rng: createSeededRng(i + 1) }),
  );
}

describe('buildMathProblem', () => {
  it('produces the requested operation and difficulty', () => {
    for (const operation of OPERATIONS) {
      for (const difficulty of DIFFICULTIES) {
        for (const problem of sample(operation, difficulty, 40)) {
          expect(problem.operation).toBe(operation);
          expect(problem.difficulty).toBe(difficulty);
        }
      }
    }
  });

  it('always computes the arithmetically correct answer', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const p of sample('mixed', difficulty)) {
        const expected =
          p.operation === 'addition'
            ? p.left + p.right
            : p.operation === 'subtraction'
              ? p.left - p.right
              : p.operation === 'multiplication'
                ? p.left * p.right
                : p.left / p.right;
        expect(p.answer).toBe(expected);
      }
    }
  });

  it('yields integer answers only', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const p of sample('mixed', difficulty)) {
        expect(Number.isInteger(p.answer)).toBe(true);
      }
    }
  });

  it('never produces a negative subtraction answer', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const p of sample('subtraction', difficulty)) {
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.left).toBeGreaterThanOrEqual(p.right);
      }
    }
  });

  it('never divides by zero and always divides exactly', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const p of sample('division', difficulty)) {
        expect(p.right).toBeGreaterThan(0);
        expect(p.left % p.right).toBe(0);
      }
    }
  });

  it('keeps operands inside the configured bounds', () => {
    for (const operation of OPERATIONS) {
      for (const difficulty of DIFFICULTIES) {
        const bounds = BOUNDS[operation][difficulty];
        for (const p of sample(operation, difficulty, 60)) {
          if (operation === 'division') {
            // Division is built from a quotient and divisor, so the bounds
            // constrain the answer and the divisor rather than the dividend.
            expect(p.answer).toBeGreaterThanOrEqual(bounds.left.min);
            expect(p.answer).toBeLessThanOrEqual(bounds.left.max);
            expect(p.right).toBeGreaterThanOrEqual(Math.max(1, bounds.right.min));
            expect(p.right).toBeLessThanOrEqual(bounds.right.max);
          } else if (operation === 'subtraction') {
            // Operands are reordered, so each falls in the union of both ranges.
            const lo = Math.min(bounds.left.min, bounds.right.min);
            const hi = Math.max(bounds.left.max, bounds.right.max);
            expect(p.left).toBeGreaterThanOrEqual(lo);
            expect(p.left).toBeLessThanOrEqual(hi);
            expect(p.right).toBeGreaterThanOrEqual(lo);
            expect(p.right).toBeLessThanOrEqual(hi);
          } else {
            expect(p.left).toBeGreaterThanOrEqual(bounds.left.min);
            expect(p.left).toBeLessThanOrEqual(bounds.left.max);
            expect(p.right).toBeGreaterThanOrEqual(bounds.right.min);
            expect(p.right).toBeLessThanOrEqual(bounds.right.max);
          }
        }
      }
    }
  });

  it('is reproducible for a given seed', () => {
    const build = () =>
      buildMathProblem({ operation: 'mixed', difficulty: 'hard', rng: createSeededRng(1234) });
    expect(build()).toEqual(build());
  });

  it('mixed eventually draws every operation', () => {
    const seen = new Set(sample('mixed', 'medium', 400).map((p) => p.operation));
    expect([...seen].sort()).toEqual([...OPERATIONS].sort());
  });
});

describe('generateMathQuestion', () => {
  const build = (difficulty: Difficulty = 'easy', seed = 7) =>
    generateMathQuestion({
      operation: 'multiplication',
      difficulty,
      rng: createSeededRng(seed),
      ids: createSequentialIdFactory(),
    });

  it('is a numeric typed-answer question tagged as math', () => {
    const question = build();
    expect(question.subject).toBe('math');
    expect(question.type).toBe('type_answer');
    expect(question.inputMode).toBe('number');
  });

  it('renders the prompt as operands only, with no result', () => {
    const question = build();
    expect(question.prompt).toMatch(/^\d+ \u00d7 \d+$/);
    expect(question.prompt).not.toContain('=');
  });

  it('accepts exactly the arithmetic answer', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 50; seed += 1) {
        const question = build(difficulty, seed);
        const [left, right] = question.prompt.split(' \u00d7 ').map(Number);
        expect(question.accepted).toEqual([String(left! * right!)]);
      }
    }
  });

  it('carries the requested difficulty through to the question', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(build(difficulty).difficulty).toBe(difficulty);
    }
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
