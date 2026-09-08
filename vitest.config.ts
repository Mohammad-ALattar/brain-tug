import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      './packages/shared/vitest.config.ts',
      './apps/server/vitest.config.ts',
      './apps/web/vitest.config.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // The domain core carries the authoritative rules, so it is held to a
      // higher bar than the presentation layers.
      include: ['packages/shared/src/**/*.ts', 'apps/server/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
    },
  },
});
