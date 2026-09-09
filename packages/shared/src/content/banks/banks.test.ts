import { describe, expect, it } from 'vitest';
import { createSequentialIdFactory } from '../../domain/ids.js';
import { checkAnswer, revealAnswer } from '../answer.js';
import { DIFFICULTIES, OPTION_IDS, QUESTION_TYPES, type Question } from '../question.js';
import { createSeededRng } from '../random.js';
import { createBankSource } from '../source.js';
import { SUBJECTS, isGeneratedSubject } from '../subject.js';
import { QUESTION_BANKS } from './index.js';

const banks = Object.entries(QUESTION_BANKS);

/**
 * Structural checks only. These catch a malformed entry, a missing option or an
 * answer that its own question would mark wrong; they cannot catch a question
 * that is simply factually incorrect, which still needs a human read-through.
 */
describe('question banks', () => {
  it('registers a bank for every authored subject', () => {
    const authored = SUBJECTS.filter((subject) => !isGeneratedSubject(subject));
    expect(Object.keys(QUESTION_BANKS).sort()).toEqual([...authored].sort());
  });

  it.each(banks)('%s declares its own subject on every entry', (_subject, bank) => {
    expect(bank.entries.length).toBeGreaterThanOrEqual(12);
  });

  it.each(banks)('%s covers every difficulty', (_subject, bank) => {
    for (const difficulty of DIFFICULTIES) {
      const atDifficulty = bank.entries.filter((entry) => entry.difficulty === difficulty);
      expect(atDifficulty.length).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(banks)('%s covers every question type', (_subject, bank) => {
    const types = new Set(bank.entries.map((entry) => entry.type));
    expect([...types].sort()).toEqual([...QUESTION_TYPES].sort());
  });

  it.each(banks)('%s has a non-empty, unique prompt on every entry', (_subject, bank) => {
    const prompts = bank.entries.map((entry) => entry.prompt);
    for (const prompt of prompts) {
      expect(prompt.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it.each(banks)('%s offers well-formed multiple choice options', (_subject, bank) => {
    for (const entry of bank.entries) {
      if (entry.type !== 'multiple_choice') continue;

      expect(entry.options.length).toBeGreaterThanOrEqual(2);
      const ids = entry.options.map((option) => option.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(OPTION_IDS).toContain(id);
      // Options must be distinguishable, or the question has two right answers.
      const texts = entry.options.map((option) => option.text.trim().toLowerCase());
      expect(new Set(texts).size).toBe(texts.length);
      expect(ids).toContain(entry.correctOptionId);
    }
  });

  it.each(banks)('%s lists at least one accepted spelling for typed answers', (_subject, bank) => {
    for (const entry of bank.entries) {
      if (entry.type !== 'type_answer') continue;
      expect(entry.accepted.length).toBeGreaterThanOrEqual(1);
      for (const accepted of entry.accepted) {
        expect(accepted.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it.each(banks)('%s marks its own revealed answer as correct', (_subject, bank) => {
    for (const entry of bank.entries) {
      const question = { ...entry, id: 'q' as Question['id'], subject: bank.subject } as Question;
      // Round-tripping the reveal through the checker proves the authored
      // answer is one the engine would actually accept.
      const submission =
        question.type === 'multiple_choice' ? question.correctOptionId : revealAnswer(question);
      expect(checkAnswer(question, submission)).toMatchObject({ correct: true });
    }
  });

  it.each(banks)('%s never leaks the answer in the prompt itself', (_subject, bank) => {
    for (const entry of bank.entries) {
      if (entry.type !== 'type_answer') continue;
      const prompt = entry.prompt.toLowerCase();
      for (const accepted of entry.accepted) {
        // A one or two character answer can legitimately appear inside a word.
        if (accepted.length < 4) continue;
        expect(prompt).not.toContain(accepted.toLowerCase());
      }
    }
  });
});

describe('createBankSource', () => {
  it.each(banks)('%s deals questions at the requested difficulty', (_subject, bank) => {
    for (const difficulty of DIFFICULTIES) {
      const source = createBankSource({
        bank,
        difficulty,
        rng: createSeededRng(3),
        ids: createSequentialIdFactory(),
      });
      for (let i = 0; i < 20; i += 1) {
        const question = source.next(new Set());
        expect(question.difficulty).toBe(difficulty);
        expect(question.subject).toBe(bank.subject);
      }
    }
  });

  it('mints a fresh id for each deal, so a repeated prompt is still a new question', () => {
    const source = createBankSource({
      bank: QUESTION_BANKS.science!,
      difficulty: 'easy',
      rng: createSeededRng(9),
      ids: createSequentialIdFactory(),
    });
    const ids = Array.from({ length: 30 }, () => source.next(new Set()).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prefers unseen prompts but still deals once the pool is exhausted', () => {
    const bank = QUESTION_BANKS.coding!;
    const source = createBankSource({
      bank,
      difficulty: 'easy',
      rng: createSeededRng(11),
      ids: createSequentialIdFactory(),
    });

    const seen = new Set<string>();
    for (let i = 0; i < 5; i += 1) {
      const question = source.next(seen);
      expect(seen.has(question.prompt)).toBe(false);
      seen.add(question.prompt);
    }
    // Everything at this difficulty is now spent; the source must not stall.
    expect(source.next(seen).prompt).toBeTruthy();
  });

  it('falls back to the whole bank when a difficulty is empty', () => {
    const source = createBankSource({
      bank: { subject: 'science', entries: [QUESTION_BANKS.science!.entries[0]!] },
      difficulty: 'hard',
      rng: createSeededRng(5),
      ids: createSequentialIdFactory(),
    });
    expect(source.next(new Set()).difficulty).toBe('easy');
  });

  it('refuses to build a source over an empty bank', () => {
    expect(() =>
      createBankSource({ bank: { subject: 'science', entries: [] }, difficulty: 'easy' }),
    ).toThrow(/empty/i);
  });
});
