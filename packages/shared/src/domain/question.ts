import type { QuestionId } from './ids.js';

export const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division'] as const;
export type Operation = (typeof OPERATIONS)[number];

/** What a host can pick. `mixed` draws from all four concrete operations. */
export const OPERATION_CHOICES = [...OPERATIONS, 'mixed'] as const;
export type OperationChoice = (typeof OPERATION_CHOICES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const OPERATION_SYMBOL: Record<Operation, string> = {
  addition: '+',
  subtraction: '-',
  multiplication: '\u00d7',
  division: '\u00f7',
};

export const OPERATION_LABEL: Record<OperationChoice, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
  mixed: 'Mixed',
};

/**
 * A single generated problem. `answer` is present because questions only ever
 * exist server-side in full; clients receive a redacted projection that omits it
 * (see `PublicQuestion`).
 */
export type Question = {
  id: QuestionId;
  operation: Operation;
  difficulty: Difficulty;
  left: number;
  right: number;
  answer: number;
  /** Pre-rendered prompt, e.g. `2 x 10`. */
  prompt: string;
};

/** The question as clients see it: no answer field exists on the wire. */
export type PublicQuestion = Omit<Question, 'answer'>;

/** Strips the answer so it can never leak through a broadcast. */
export function toPublicQuestion(question: Question): PublicQuestion {
  const { answer: _answer, ...rest } = question;
  return rest;
}

export function formatPrompt(operation: Operation, left: number, right: number): string {
  return `${left} ${OPERATION_SYMBOL[operation]} ${right}`;
}
