import { describe, expect, it } from 'vitest';
import { createSequentialIdFactory } from '../domain/ids.js';
import { createQuestionQueue } from './queue.js';
import { createSeededRng } from './random.js';

const build = (overrides: Partial<Parameters<typeof createQuestionQueue>[0]> = {}) =>
  createQuestionQueue({
    operation: 'multiplication',
    difficulty: 'medium',
    rng: createSeededRng(42),
    ids: createSequentialIdFactory(),
    ...overrides,
  });

describe('createQuestionQueue', () => {
  it('mints a unique id per question', () => {
    const queue = build();
    const ids = Array.from({ length: 30 }, () => queue.getNextQuestion().id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('avoids repeating a prompt inside the history window', () => {
    const queue = build({ historySize: 6 });
    const window: string[] = [];
    for (let i = 0; i < 40; i += 1) {
      const prompt = queue.getNextQuestion().prompt;
      expect(window).not.toContain(prompt);
      window.push(prompt);
      if (window.length > 6) window.shift();
    }
  });

  it('gives the two teams different prompts in the same round', () => {
    const queue = build();
    for (let round = 0; round < 50; round += 1) {
      const pair = queue.getNextQuestionPair();
      expect(pair.blue.prompt).not.toBe(pair.red.prompt);
      expect(pair.blue.id).not.toBe(pair.red.id);
    }
  });

  it('gives both teams the same difficulty so the match stays fair', () => {
    const queue = build({ operation: 'mixed', difficulty: 'hard' });
    for (let round = 0; round < 20; round += 1) {
      const pair = queue.getNextQuestionPair();
      expect(pair.blue.difficulty).toBe('hard');
      expect(pair.red.difficulty).toBe('hard');
    }
  });

  it('still returns a question when the problem space is smaller than the history', () => {
    // Easy division has few distinct prompts; the queue must not loop forever.
    const queue = build({ operation: 'division', difficulty: 'easy', historySize: 500 });
    for (let i = 0; i < 200; i += 1) {
      expect(queue.getNextQuestion().answer).toBeGreaterThanOrEqual(0);
    }
  });
});
