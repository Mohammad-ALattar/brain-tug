import { describe, expect, it } from 'vitest';
import type { QuestionId } from '../domain/ids.js';
import { QUESTION_TYPES, toPublicQuestion, type Question } from './question.js';

const id = 'q1' as QuestionId;

/** One of every question variant, each carrying an answer and an explanation. */
const questions: Question[] = [
  {
    id,
    subject: 'science',
    difficulty: 'easy',
    type: 'multiple_choice',
    prompt: 'Which planet is known as the Red Planet?',
    options: [
      { id: 'a', text: 'Mars' },
      { id: 'b', text: 'Earth' },
    ],
    correctOptionId: 'a',
    explanation: 'Iron oxide on the surface gives Mars its colour.',
  },
  {
    id,
    subject: 'history',
    difficulty: 'medium',
    type: 'true_false',
    prompt: 'The Great Wall of China is a single unbroken wall.',
    correct: false,
    explanation: 'It is a network of walls built over many dynasties.',
  },
  {
    id,
    subject: 'geography',
    difficulty: 'hard',
    type: 'type_answer',
    inputMode: 'text',
    prompt: 'What is the capital of Peru?',
    accepted: ['Lima'],
    explanation: 'Lima was founded in 1535.',
  },
];

describe('toPublicQuestion', () => {
  it('covers every question type', () => {
    expect(questions.map((q) => q.type).sort()).toEqual([...QUESTION_TYPES].sort());
  });

  it('carries no answer field for any variant', () => {
    for (const question of questions) {
      const serialised = JSON.stringify(toPublicQuestion(question));
      for (const leak of ['correctOptionId', '"accepted"', '"correct":']) {
        expect(serialised).not.toContain(leak);
      }
      if (question.type === 'type_answer') {
        for (const accepted of question.accepted) {
          expect(serialised).not.toContain(accepted);
        }
      }
    }
  });

  it('withholds the explanation, which would give the answer away', () => {
    for (const question of questions) {
      expect(toPublicQuestion(question)).not.toHaveProperty('explanation');
    }
  });

  it('keeps everything the client needs to render the question', () => {
    for (const question of questions) {
      const view = toPublicQuestion(question);
      expect(view.id).toBe(question.id);
      expect(view.prompt).toBe(question.prompt);
      expect(view.subject).toBe(question.subject);
      expect(view.difficulty).toBe(question.difficulty);
      expect(view.type).toBe(question.type);
    }
  });

  it('publishes the options of a multiple choice question, unmarked', () => {
    const view = toPublicQuestion(questions[0]!);
    if (view.type !== 'multiple_choice') throw new Error('expected a multiple choice projection');
    expect(view.options).toEqual([
      { id: 'a', text: 'Mars' },
      { id: 'b', text: 'Earth' },
    ]);
  });

  it('copies the options rather than aliasing them, so a mutation cannot reach the session', () => {
    const source = questions[0]!;
    const view = toPublicQuestion(source);
    if (view.type !== 'multiple_choice') throw new Error('expected a multiple choice projection');
    view.options[0]!.text = 'tampered';
    if (source.type !== 'multiple_choice') throw new Error('expected a multiple choice question');
    expect(source.options[0]!.text).toBe('Mars');
  });

  it('publishes the input mode so the phone can choose a keypad', () => {
    const view = toPublicQuestion(questions[2]!);
    if (view.type !== 'type_answer') throw new Error('expected a typed projection');
    expect(view.inputMode).toBe('text');
  });
});
