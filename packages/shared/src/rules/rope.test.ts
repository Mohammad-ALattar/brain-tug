import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from './rules.js';
import {
  DEFAULT_ARENA_HALF_METRES,
  ROPE_MAX,
  ROPE_MIN,
  applyPull,
  clampRope,
  leadingTeam,
  ropeTension,
  ropeToFraction,
  ropeToMetres,
  ropeWinner,
} from './rope.js';

const tug = {
  kind: 'tug_of_war' as const,
  ropePosition: 0,
  arenaHalfMetres: DEFAULT_ARENA_HALF_METRES,
};

describe('clampRope', () => {
  it('passes through in-range positions', () => {
    expect(clampRope(0)).toBe(0);
    expect(clampRope(0.4)).toBe(0.4);
    expect(clampRope(-0.4)).toBe(-0.4);
  });

  it('clamps beyond either end of the rope', () => {
    expect(clampRope(5)).toBe(ROPE_MAX);
    expect(clampRope(-5)).toBe(ROPE_MIN);
  });

  it('treats NaN as centre rather than propagating it', () => {
    expect(clampRope(Number.NaN)).toBe(0);
  });
});

describe('applyPull', () => {
  it('moves the rope toward the pulling team', () => {
    expect(applyPull(0, 'red', 0.2)).toBeCloseTo(0.2, 6);
    expect(applyPull(0, 'blue', 0.2)).toBeCloseTo(-0.2, 6);
  });

  it('accumulates across successive pulls', () => {
    let pos = 0;
    pos = applyPull(pos, 'red', 0.2);
    pos = applyPull(pos, 'red', 0.2);
    expect(pos).toBeCloseTo(0.4, 6);
  });

  it('lets the opposing team pull the rope back', () => {
    const pos = applyPull(applyPull(0, 'red', 0.3), 'blue', 0.1);
    expect(pos).toBeCloseTo(0.2, 6);
  });

  it('never travels past the ends of the rope', () => {
    expect(applyPull(0.95, 'red', 0.5)).toBe(ROPE_MAX);
    expect(applyPull(-0.95, 'blue', 0.5)).toBe(ROPE_MIN);
  });

  it('ignores a negative pull rather than reversing direction', () => {
    expect(applyPull(0.3, 'red', -0.9)).toBeCloseTo(0.3, 6);
  });
});

describe('ropeWinner', () => {
  it('has no winner while the rope is short of the threshold', () => {
    expect(ropeWinner(DEFAULT_RULES, 0)).toBeNull();
    expect(ropeWinner(DEFAULT_RULES, 0.99)).toBeNull();
    expect(ropeWinner(DEFAULT_RULES, -0.99)).toBeNull();
  });

  it('declares a winner exactly at the threshold', () => {
    expect(ropeWinner(DEFAULT_RULES, 1)).toBe('red');
    expect(ropeWinner(DEFAULT_RULES, -1)).toBe('blue');
  });

  it('declares a winner past the threshold', () => {
    expect(ropeWinner(DEFAULT_RULES, 1.5)).toBe('red');
    expect(ropeWinner(DEFAULT_RULES, -1.5)).toBe('blue');
  });

  it('respects a shortened threshold', () => {
    const quick = { ...DEFAULT_RULES, winThreshold: 0.5 };
    expect(ropeWinner(quick, 0.5)).toBe('red');
    expect(ropeWinner(quick, 0.49)).toBeNull();
  });
});

describe('display helpers', () => {
  it('maps rope position to the metre labels in the reference', () => {
    expect(ropeToMetres(tug, 0)).toBe(0);
    expect(ropeToMetres(tug, 1)).toBe(4);
    expect(ropeToMetres(tug, -1)).toBe(-4);
    expect(ropeToMetres(tug, 0.3)).toBeCloseTo(1.2, 6);
  });

  it('maps rope position to a 0..1 arena fraction', () => {
    expect(ropeToFraction(-1)).toBe(0);
    expect(ropeToFraction(0)).toBe(0.5);
    expect(ropeToFraction(1)).toBe(1);
    expect(ropeToFraction(3)).toBe(1);
  });

  it('names the leading team for the pulling banner', () => {
    expect(leadingTeam(0)).toBeNull();
    expect(leadingTeam(0.1)).toBe('red');
    expect(leadingTeam(-0.1)).toBe('blue');
  });

  it('reports tension as progress toward victory', () => {
    expect(ropeTension(DEFAULT_RULES, 0)).toBe(0);
    expect(ropeTension(DEFAULT_RULES, 0.5)).toBeCloseTo(0.5, 6);
    expect(ropeTension(DEFAULT_RULES, -0.5)).toBeCloseTo(0.5, 6);
    expect(ropeTension(DEFAULT_RULES, 2)).toBe(1);
  });
});
