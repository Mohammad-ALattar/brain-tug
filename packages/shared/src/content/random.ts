/** Returns a float in [0, 1). Injected everywhere so tests stay deterministic. */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/**
 * mulberry32: small, fast, well-distributed enough for question generation and,
 * critically, reproducible from a seed so generator tests can assert exact output.
 */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inclusive integer in [min, max]. */
export function randomInt(rng: Rng, min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi < lo) return lo;
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() called with an empty list');
  const item = items[randomInt(rng, 0, items.length - 1)];
  // `noUncheckedIndexedAccess` cannot see that the index is in range.
  return item as T;
}
