import { describe, expect, it } from 'vitest';
import { createSequentialIdFactory } from '../domain/ids.js';
import { createQuestionDealer } from './dealer.js';
import { createSeededRng } from './random.js';
import { createMathSource, type MathSourceOptions } from './source.js';

const build = (
  overrides: Partial<MathSourceOptions> = {},
  options: { historySize?: number } = {},
) =>
  createQuestionDealer(
    createMathSource({
      operation: 'multiplication',
      difficulty: 'medium',
      rng: createSeededRng(42),
      ids: createSequentialIdFactory(),
      ...overrides,
    }),
    options,
  );

describe('createQuestionDealer: per-team assignment', () => {
  it('mints a unique id per question', () => {
    const dealer = build();
    const ids = Array.from({ length: 30 }, () => dealer.deal('per_team').blue.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('avoids repeating a prompt inside the history window', () => {
    const dealer = build({}, { historySize: 6 });
    const window: string[] = [];
    for (let i = 0; i < 40; i += 1) {
      const prompt = dealer.deal('shared').blue.prompt;
      expect(window).not.toContain(prompt);
      window.push(prompt);
      if (window.length > 6) window.shift();
    }
  });

  it('gives the two teams different prompts in the same round', () => {
    const dealer = build();
    for (let round = 0; round < 50; round += 1) {
      const dealt = dealer.deal('per_team');
      expect(dealt.blue.prompt).not.toBe(dealt.red.prompt);
      expect(dealt.blue.id).not.toBe(dealt.red.id);
    }
  });

  it('gives both teams the same difficulty so the match stays fair', () => {
    const dealer = build({ operation: 'mixed', difficulty: 'hard' });
    for (let round = 0; round < 20; round += 1) {
      const dealt = dealer.deal('per_team');
      expect(dealt.blue.difficulty).toBe('hard');
      expect(dealt.red.difficulty).toBe('hard');
    }
  });

  it('still returns a question when the problem space is smaller than the history', () => {
    // Easy division has few distinct prompts; the dealer must not loop forever.
    const dealer = build({ operation: 'division', difficulty: 'easy' }, { historySize: 500 });
    for (let i = 0; i < 200; i += 1) {
      expect(dealer.deal('per_team').blue.prompt).toBeTruthy();
    }
  });
});

describe('createQuestionDealer: shared assignment', () => {
  it('gives both teams the identical question, not a copy', () => {
    const dealer = build();
    for (let round = 0; round < 20; round += 1) {
      const dealt = dealer.deal('shared');
      // Identity matters: a submission from either team must match one id.
      expect(dealt.blue).toBe(dealt.red);
    }
  });

  it('consumes one question per round rather than two', () => {
    const dealer = build({}, { historySize: 100 });
    const prompts = new Set<string>();
    for (let round = 0; round < 15; round += 1) {
      prompts.add(dealer.deal('shared').blue.prompt);
    }
    expect(prompts.size).toBe(15);
  });
});
