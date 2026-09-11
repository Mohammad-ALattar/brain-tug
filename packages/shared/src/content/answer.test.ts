import { describe, expect, it } from 'vitest';
import type { QuestionId } from '../domain/ids.js';
import {
  checkAnswer,
  normaliseArabicTextAnswer,
  normaliseTextAnswer,
  parseIntegerAnswer,
  revealAnswer,
} from './answer.js';
import type {
  MultipleChoiceQuestion,
  Question,
  TrueFalseQuestion,
  TypeAnswerQuestion,
} from './question.js';

const id = 'q1' as QuestionId;

const choice: MultipleChoiceQuestion = {
  id,
  subject: 'science',
  difficulty: 'easy',
  type: 'multiple_choice',
  prompt: 'Which planet is known as the Red Planet?',
  options: [
    { id: 'a', text: 'Mars' },
    { id: 'b', text: 'Earth' },
    { id: 'c', text: 'Venus' },
    { id: 'd', text: 'Jupiter' },
  ],
  correctOptionId: 'a',
};

const trueFalse: TrueFalseQuestion = {
  id,
  subject: 'science',
  difficulty: 'easy',
  type: 'true_false',
  prompt: 'Sound travels faster in water than in air.',
  correct: true,
};

const typedText: TypeAnswerQuestion = {
  id,
  subject: 'geography',
  difficulty: 'medium',
  type: 'type_answer',
  inputMode: 'text',
  prompt: 'What is the longest river in Africa?',
  accepted: ['Nile', 'The Nile', 'River Nile'],
};

const typedNumber: TypeAnswerQuestion = {
  id,
  subject: 'math',
  difficulty: 'easy',
  type: 'type_answer',
  inputMode: 'number',
  prompt: '2 \u00d7 10',
  accepted: ['20'],
};

describe('normaliseTextAnswer', () => {
  it('folds case, padding and repeated whitespace', () => {
    expect(normaliseTextAnswer('  The   NILE ')).toBe('the nile');
  });

  it('strips punctuation and accents', () => {
    expect(normaliseTextAnswer('Caf\u00e9!')).toBe('cafe');
    expect(normaliseTextAnswer("it's, here.")).toBe('its here');
  });

  it('does not change English behaviour when language is omitted', () => {
    expect(normaliseTextAnswer('Nile')).toBe('nile');
  });
});

describe('normaliseArabicTextAnswer', () => {
  it('strips diacritics and normalises alef and ta marbuta', () => {
    expect(normaliseArabicTextAnswer('الجَاذِبِيَّة')).toBe('الجاذبيه');
    expect(normaliseArabicTextAnswer('جاذبية')).toBe('جاذبيه');
    expect(normaliseArabicTextAnswer('أرض')).toBe('ارض');
  });
});

describe('checkAnswer: Arabic typed text', () => {
  const arabicNile: TypeAnswerQuestion = {
    ...typedText,
    locale: 'ar',
    prompt: 'ما أطول نهر في أفريقيا؟',
    accepted: ['النيل', 'نهر النيل'],
  };

  it('accepts Arabic answers with normalisation', () => {
    expect(checkAnswer(arabicNile, 'النيل')).toMatchObject({ correct: true });
    expect(checkAnswer(arabicNile, 'نَهر النيل')).toMatchObject({ correct: true });
  });

  it('still uses English normalisation for English locale', () => {
    expect(checkAnswer(typedText, 'Nile')).toMatchObject({ correct: true });
  });
});

describe('parseIntegerAnswer', () => {
  it('accepts integers, with or without a sign', () => {
    expect(parseIntegerAnswer('20')).toBe(20);
    expect(parseIntegerAnswer(' -7 ')).toBe(-7);
    expect(parseIntegerAnswer(42)).toBe(42);
  });

  it('rejects anything that is not a plain integer', () => {
    for (const raw of ['', ' ', '1.5', '1e3', 'twenty', '20a', '--3', Number.NaN, 1.5]) {
      expect(parseIntegerAnswer(raw)).toBeNull();
    }
  });
});

describe('checkAnswer: multiple choice', () => {
  it('accepts the correct option id, in any case', () => {
    expect(checkAnswer(choice, 'a')).toEqual({ status: 'checked', value: 'a', correct: true });
    expect(checkAnswer(choice, ' A ')).toEqual({ status: 'checked', value: 'a', correct: true });
  });

  it('marks a different offered option incorrect', () => {
    expect(checkAnswer(choice, 'c')).toEqual({ status: 'checked', value: 'c', correct: false });
  });

  it('treats an option the question does not offer as malformed', () => {
    const twoOptions: MultipleChoiceQuestion = {
      ...choice,
      options: choice.options.slice(0, 2),
      correctOptionId: 'a',
    };
    expect(checkAnswer(twoOptions, 'd').status).toBe('malformed');
    expect(checkAnswer(choice, 'z').status).toBe('malformed');
    expect(checkAnswer(choice, 'Mars').status).toBe('malformed');
  });
});

describe('checkAnswer: true/false', () => {
  it('reads either literal, in any case', () => {
    expect(checkAnswer(trueFalse, 'true')).toEqual({
      status: 'checked',
      value: 'true',
      correct: true,
    });
    expect(checkAnswer(trueFalse, 'FALSE')).toEqual({
      status: 'checked',
      value: 'false',
      correct: false,
    });
  });

  it('inverts correctly for a false question', () => {
    const falseQuestion: TrueFalseQuestion = { ...trueFalse, correct: false };
    expect(checkAnswer(falseQuestion, 'false')).toMatchObject({ correct: true });
    expect(checkAnswer(falseQuestion, 'true')).toMatchObject({ correct: false });
  });

  it('rejects anything else as malformed', () => {
    for (const raw of ['yes', '1', 't', '']) {
      expect(checkAnswer(trueFalse, raw).status).toBe('malformed');
    }
  });
});

describe('checkAnswer: typed text', () => {
  it('accepts any listed spelling, normalised', () => {
    for (const raw of ['Nile', 'nile', ' the   NILE ', 'River Nile!']) {
      expect(checkAnswer(typedText, raw)).toMatchObject({ correct: true });
    }
  });

  it('marks an unlisted answer incorrect rather than malformed', () => {
    expect(checkAnswer(typedText, 'Amazon')).toEqual({
      status: 'checked',
      value: 'amazon',
      correct: false,
    });
  });

  it('treats an empty submission as malformed', () => {
    expect(checkAnswer(typedText, '   ').status).toBe('malformed');
  });
});

describe('checkAnswer: typed number', () => {
  it('compares numerically, so leading zeroes still match', () => {
    expect(checkAnswer(typedNumber, '020')).toMatchObject({ value: '20', correct: true });
  });

  it('marks a wrong number incorrect and a non-number malformed', () => {
    expect(checkAnswer(typedNumber, '21')).toMatchObject({ correct: false });
    expect(checkAnswer(typedNumber, 'twenty').status).toBe('malformed');
  });
});

describe('checkAnswer: abuse guards', () => {
  it('refuses an oversized submission before parsing it', () => {
    expect(checkAnswer(typedText, 'a'.repeat(500)).status).toBe('malformed');
  });
});

describe('revealAnswer', () => {
  it('renders the correct answer for every question type', () => {
    const cases: [Question, string][] = [
      [choice, 'Mars'],
      [trueFalse, 'True'],
      [{ ...trueFalse, correct: false }, 'False'],
      [typedText, 'Nile'],
      [typedNumber, '20'],
    ];
    for (const [question, expected] of cases) {
      expect(revealAnswer(question)).toBe(expected);
    }
  });

  it('renders Arabic true/false labels when locale is ar', () => {
    expect(revealAnswer({ ...trueFalse, locale: 'ar' })).toBe('صحيح');
    expect(revealAnswer({ ...trueFalse, correct: false, locale: 'ar' })).toBe('خطأ');
  });
});
