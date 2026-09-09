import { OPTION_IDS, type OptionId, type Question } from './question.js';

/** Longest submission any question type accepts, as a cheap abuse guard. */
const MAX_SUBMISSION_LENGTH = 64;

/**
 * Folds away everything a child could reasonably vary without being wrong:
 * case, surrounding and repeated whitespace, accents, and trailing punctuation.
 * `"  The   Nile!"` and `"the nile"` both reduce to `nile` once articles are
 * stripped by the caller's accepted list.
 */
export function normaliseTextAnswer(raw: string): string {
  return raw
    .normalize('NFD')
    // Combining marks, so `café` matches `cafe`.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses raw input into an integer, or null when it is not one. Accepts a
 * leading minus and surrounding whitespace; rejects decimals and exponents.
 */
export function parseIntegerAnswer(raw: string | number): number | null {
  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) ? raw : null;
  }
  const trimmed = raw.trim();
  if (!/^-?\d{1,12}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

/**
 * The result of checking a submission.
 *
 * `malformed` is kept distinct from an incorrect answer because the two mean
 * different things to a student: one is "that is not an answer to this
 * question", the other is "that answer is wrong". Only the latter spends the
 * player's attempt in a way worth reporting as incorrect.
 */
export type AnswerCheck =
  | { status: 'malformed' }
  | {
      status: 'checked';
      /** The submission as it should be recorded, normalised for its type. */
      value: string;
      correct: boolean;
    };

function checkOption(question: Question & { type: 'multiple_choice' }, raw: string): AnswerCheck {
  const value = raw.trim().toLowerCase();
  if (!OPTION_IDS.includes(value as OptionId)) return { status: 'malformed' };
  // Naming an option this question does not offer is not a wrong answer, it is
  // a malformed one; there was nothing there to choose.
  if (!question.options.some((option) => option.id === value)) return { status: 'malformed' };
  return { status: 'checked', value, correct: value === question.correctOptionId };
}

function checkTrueFalse(question: Question & { type: 'true_false' }, raw: string): AnswerCheck {
  const value = raw.trim().toLowerCase();
  if (value !== 'true' && value !== 'false') return { status: 'malformed' };
  return { status: 'checked', value, correct: (value === 'true') === question.correct };
}

function checkTyped(question: Question & { type: 'type_answer' }, raw: string): AnswerCheck {
  if (question.inputMode === 'number') {
    const parsed = parseIntegerAnswer(raw);
    if (parsed === null) return { status: 'malformed' };
    const value = String(parsed);
    return {
      status: 'checked',
      value,
      correct: question.accepted.some((accepted) => parseIntegerAnswer(accepted) === parsed),
    };
  }

  const value = normaliseTextAnswer(raw);
  if (value.length === 0) return { status: 'malformed' };
  return {
    status: 'checked',
    value,
    correct: question.accepted.some((accepted) => normaliseTextAnswer(accepted) === value),
  };
}

/**
 * The authoritative correctness decision. Lives here rather than in the engine
 * so that adding a question type never means touching a reducer.
 */
export function checkAnswer(question: Question, raw: string | number): AnswerCheck {
  const text = typeof raw === 'number' ? String(raw) : raw;
  if (text.length > MAX_SUBMISSION_LENGTH) return { status: 'malformed' };

  switch (question.type) {
    case 'multiple_choice':
      return checkOption(question, text);
    case 'true_false':
      return checkTrueFalse(question, text);
    case 'type_answer':
      return checkTyped(question, text);
  }
}

/**
 * The correct answer written out for a human. Released only once a round has
 * resolved, never while students can still answer.
 */
export function revealAnswer(question: Question): string {
  switch (question.type) {
    case 'multiple_choice': {
      const option = question.options.find((o) => o.id === question.correctOptionId);
      return option ? option.text : question.correctOptionId.toUpperCase();
    }
    case 'true_false':
      return question.correct ? 'True' : 'False';
    case 'type_answer':
      return question.accepted[0] ?? '';
  }
}
