import type { AnswerOption, Question } from '../question.js';
import type { BankEntry } from './types.js';

/** Arabic copy overlaid onto an English-authored bank entry at deal time. */
export type ArabicBankOverlay = {
  prompt: string;
  options?: AnswerOption[];
  accepted?: string[];
  explanation?: string;
};

/** `Omit` that distributes over a union instead of collapsing it. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

type EnglishBankFields = DistributiveOmit<Question, 'id' | 'subject' | 'bankKey' | 'locale'>;

/** Authors an entry with a stable key and required Arabic translation. */
export function entry(
  bankKey: string,
  english: EnglishBankFields,
  ar: ArabicBankOverlay,
): BankEntry {
  return { ...english, bankKey, translations: { ar } } as BankEntry;
}
