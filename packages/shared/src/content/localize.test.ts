import { describe, expect, it } from 'vitest';
import { createSequentialIdFactory } from '../domain/ids.js';
import { QUESTION_BANKS } from './banks/index.js';
import { checkAnswer, revealAnswer } from './answer.js';
import { localizeBankEntry } from './localize.js';
import type { Question } from './question.js';

describe('localizeBankEntry', () => {
  const entry = QUESTION_BANKS.science!.entries[0]!;

  it('keeps English copy for en', () => {
    const question = localizeBankEntry(entry, 'en', createSequentialIdFactory().questionId(), 'science');
    expect(question.prompt).toBe(entry.prompt);
    expect(question.locale).toBe('en');
    expect(question.bankKey).toBe(entry.bankKey);
  });

  it('applies Arabic overlay for ar', () => {
    const question = localizeBankEntry(entry, 'ar', createSequentialIdFactory().questionId(), 'science');
    expect(question.prompt).toBe(entry.translations.ar.prompt);
    expect(question.locale).toBe('ar');
    if (question.type === 'multiple_choice') {
      expect(question.options[0]?.text).toBe(entry.translations.ar.options?.[0]?.text);
    }
  });

  it('round-trips Arabic type_answer acceptance', () => {
    const typed = QUESTION_BANKS.science!.entries.find((e) => e.bankKey === 'science.gravity')!;
    const question = localizeBankEntry(
      typed,
      'ar',
      createSequentialIdFactory().questionId(),
      'science',
    ) as Question;
    const accepted = question.type === 'type_answer' ? question.accepted[0] : '';
    expect(checkAnswer(question, accepted)).toMatchObject({ correct: true });
  });

  it('reveals Arabic true/false labels', () => {
    const tf = QUESTION_BANKS.science!.entries.find((e) => e.type === 'true_false' && e.correct)!;
    const question = localizeBankEntry(tf, 'ar', createSequentialIdFactory().questionId(), 'science');
    expect(revealAnswer(question)).toBe('صحيح');
  });
});
