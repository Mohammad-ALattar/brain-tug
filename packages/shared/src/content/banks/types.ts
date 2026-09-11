import type { Question } from '../question.js';
import type { Subject } from '../subject.js';
import type { ArabicBankOverlay } from './helpers.js';

/** `Omit` that distributes over a union instead of collapsing it. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/**
 * An authored question as it is written in a bank file: everything except the
 * id, which the engine mints when the question is dealt, and the subject, which
 * the bank as a whole declares.
 *
 * English fields are the authoring default; `translations.ar` is required for
 * Phase 6 classroom Arabic.
 */
export type BankEntry = DistributiveOmit<Question, 'id' | 'subject' | 'bankKey' | 'locale'> & {
  bankKey: string;
  translations: {
    ar: ArabicBankOverlay;
  };
};

export type QuestionBank = {
  subject: Subject;
  entries: BankEntry[];
};

/** Convenience for authoring: infers the entry union without widening it. */
export function defineBank(subject: Subject, entries: BankEntry[]): QuestionBank {
  return { subject, entries };
}
