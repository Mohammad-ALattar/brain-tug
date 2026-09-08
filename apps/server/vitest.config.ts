import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    // Socket round-trips are slower than pure unit tests but must stay well under this.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
