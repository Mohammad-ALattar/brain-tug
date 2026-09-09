import type { Question } from '../question.js';
import type { Subject } from '../subject.js';

/** `Omit` that distributes over a union instead of collapsing it. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/**
 * An authored question as it is written in a bank file: everything except the
 * id, which the engine mints when the question is dealt, and the subject, which
 * the bank as a whole declares.
 */
export type BankEntry = DistributiveOmit<Question, 'id' | 'subject'>;

export type QuestionBank = {
  subject: Subject;
  entries: BankEntry[];
};

/** Convenience for authoring: infers the entry union without widening it. */
export function defineBank(subject: Subject, entries: BankEntry[]): QuestionBank {
  return { subject, entries };
}
