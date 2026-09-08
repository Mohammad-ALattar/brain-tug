import type { Question } from '../domain/question.js';

/**
 * Parses raw student input into a number, or null when it is not a well-formed
 * integer answer. Accepts a leading minus and surrounding whitespace; rejects
 * decimals, exponents, and anything non-numeric.
 */
export function parseAnswerInput(raw: string | number): number | null {
  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) ? raw : null;
  }
  const trimmed = raw.trim();
  if (trimmed === '' || !/^-?\d{1,12}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

/** Answers are integers by construction, so this is an exact comparison. */
export function validateAnswer(question: Question, submitted: number): boolean {
  return Number.isSafeInteger(submitted) && submitted === question.answer;
}

/** Parses then validates in one step. Returns null when the input is malformed. */
export function parseAndValidate(
  question: Question,
  raw: string | number,
): { value: number; correct: boolean } | null {
  const value = parseAnswerInput(raw);
  if (value === null) return null;
  return { value, correct: validateAnswer(question, value) };
}
