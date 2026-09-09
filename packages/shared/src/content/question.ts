import type { QuestionId } from '../domain/ids.js';
import type { Subject } from './subject.js';

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const QUESTION_TYPES = ['multiple_choice', 'true_false', 'type_answer'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * Options are named rather than positional so a submission travels as `"b"`.
 * A positional index would silently answer the wrong option if the arena and
 * the phone ever disagreed about ordering.
 */
export const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;
export type OptionId = (typeof OPTION_IDS)[number];

export type AnswerOption = { id: OptionId; text: string };

type QuestionBase = {
  id: QuestionId;
  subject: Subject;
  difficulty: Difficulty;
  /** Rendered exactly as the class should read it, with no answer hint. */
  prompt: string;
  /**
   * Teacher-facing note. Never published while a round is open; it is released
   * with the answer once the round resolves.
   */
  explanation?: string;
};

export type MultipleChoiceQuestion = QuestionBase & {
  type: 'multiple_choice';
  options: AnswerOption[];
  correctOptionId: OptionId;
};

export type TrueFalseQuestion = QuestionBase & {
  type: 'true_false';
  correct: boolean;
};

export type TypeAnswerQuestion = QuestionBase & {
  type: 'type_answer';
  /** Chooses the student's input surface: a numeric keypad or a text field. */
  inputMode: 'number' | 'text';
  /** Every spelling accepted as correct. The first is the canonical one. */
  accepted: string[];
};

/**
 * A question in full. This shape only ever exists server-side, because each
 * variant carries the answer in a different field. Clients receive
 * `PublicQuestion`.
 */
export type Question = MultipleChoiceQuestion | TrueFalseQuestion | TypeAnswerQuestion;

type PublicBase = {
  id: QuestionId;
  subject: Subject;
  difficulty: Difficulty;
  prompt: string;
};

/** The question as clients see it. No variant carries an answer field. */
export type PublicQuestion =
  | (PublicBase & { type: 'multiple_choice'; options: AnswerOption[] })
  | (PublicBase & { type: 'true_false' })
  | (PublicBase & { type: 'type_answer'; inputMode: 'number' | 'text' });

/**
 * The single doorway from a `Question` onto the wire.
 *
 * Written as an explicit switch rather than an `Omit`, because each variant
 * hides a different field: a structural helper would have to be updated by hand
 * for every new question type, and forgetting would leak an answer silently.
 * Here, a new variant fails to compile until it is redacted deliberately.
 */
export function toPublicQuestion(question: Question): PublicQuestion {
  const base: PublicBase = {
    id: question.id,
    subject: question.subject,
    difficulty: question.difficulty,
    prompt: question.prompt,
  };

  switch (question.type) {
    case 'multiple_choice':
      return {
        ...base,
        type: 'multiple_choice',
        options: question.options.map((option) => ({ ...option })),
      };
    case 'true_false':
      return { ...base, type: 'true_false' };
    case 'type_answer':
      return { ...base, type: 'type_answer', inputMode: question.inputMode };
  }
}

/** Whether the prompt should render as a numeric equation (`2 × 10 = ?`). */
export function isNumericPrompt(
  question: { type: QuestionType; inputMode?: 'number' | 'text' } | null | undefined,
): boolean {
  return question?.type === 'type_answer' && question.inputMode === 'number';
}
