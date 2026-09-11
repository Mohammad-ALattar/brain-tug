import type { QuestionId } from '../domain/ids.js';
import type { BankEntry } from './banks/types.js';
import type { GameLanguage } from './language.js';
import type { Question } from './question.js';
import type { Subject } from './subject.js';

/** Projects an authored bank entry into a dealt `Question` for the session language. */
export function localizeBankEntry(
  entry: BankEntry,
  language: GameLanguage,
  id: QuestionId,
  subject: Subject,
): Question {
  const { bankKey, translations, ...english } = entry;

  if (language === 'en') {
    return { ...english, id, subject, bankKey, locale: 'en' } as Question;
  }

  const ar = translations.ar;
  const base = {
    id,
    subject,
    bankKey,
    locale: 'ar' as const,
    difficulty: entry.difficulty,
  };

  switch (entry.type) {
    case 'multiple_choice':
      return {
        ...base,
        type: 'multiple_choice',
        prompt: ar.prompt,
        options: ar.options ?? entry.options,
        correctOptionId: entry.correctOptionId,
        explanation: ar.explanation ?? entry.explanation,
      };
    case 'true_false':
      return {
        ...base,
        type: 'true_false',
        prompt: ar.prompt,
        correct: entry.correct,
        explanation: ar.explanation ?? entry.explanation,
      };
    case 'type_answer':
      return {
        ...base,
        type: 'type_answer',
        inputMode: entry.inputMode,
        prompt: ar.prompt,
        accepted: ar.accepted ?? entry.accepted,
        explanation: ar.explanation ?? entry.explanation,
      };
  }
}

/** Repeat-avoidance key: stable across locales for banked questions. */
export function questionDedupKey(question: Question): string {
  return question.bankKey ?? question.prompt;
}
