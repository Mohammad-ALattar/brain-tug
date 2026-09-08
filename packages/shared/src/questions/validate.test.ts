import { describe, expect, it } from 'vitest';
import type { Question } from '../domain/question.js';
import type { QuestionId } from '../domain/ids.js';
import { parseAndValidate, parseAnswerInput, validateAnswer } from './validate.js';

const question: Question = {
  id: 'q1' as QuestionId,
  operation: 'multiplication',
  difficulty: 'easy',
  left: 2,
  right: 10,
  answer: 20,
  prompt: '2 \u00d7 10',
};

describe('parseAnswerInput', () => {
  it('accepts plain integers and trims whitespace', () => {
    expect(parseAnswerInput('20')).toBe(20);
    expect(parseAnswerInput('  20  ')).toBe(20);
    expect(parseAnswerInput('-7')).toBe(-7);
    expect(parseAnswerInput('007')).toBe(7);
    expect(parseAnswerInput(20)).toBe(20);
  });

  it('rejects malformed and non-integer input', () => {
    for (const bad of ['', '   ', 'abc', '2.5', '1e3', '20a', '--3', '+3', '2 0', '\u0662\u0660']) {
      expect(parseAnswerInput(bad)).toBeNull();
    }
    expect(parseAnswerInput(2.5)).toBeNull();
    expect(parseAnswerInput(Number.NaN)).toBeNull();
    expect(parseAnswerInput(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('rejects absurdly long input rather than overflowing', () => {
    expect(parseAnswerInput('9'.repeat(13))).toBeNull();
  });
});

describe('validateAnswer', () => {
  it('accepts only the exact answer', () => {
    expect(validateAnswer(question, 20)).toBe(true);
    expect(validateAnswer(question, 19)).toBe(false);
    expect(validateAnswer(question, -20)).toBe(false);
    expect(validateAnswer(question, 0)).toBe(false);
  });

  it('rejects non-integers even when numerically equal', () => {
    expect(validateAnswer(question, 20.000000001)).toBe(false);
    expect(validateAnswer(question, Number.NaN)).toBe(false);
  });
});

describe('parseAndValidate', () => {
  it('reports a correct answer', () => {
    expect(parseAndValidate(question, '20')).toEqual({ value: 20, correct: true });
  });

  it('reports an incorrect but well-formed answer', () => {
    expect(parseAndValidate(question, '21')).toEqual({ value: 21, correct: false });
  });

  it('distinguishes malformed input from a wrong answer', () => {
    expect(parseAndValidate(question, 'twenty')).toBeNull();
  });
});
