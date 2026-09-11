import { describe, expect, it } from 'vitest';
import { buildConfig, createGame } from './createGame.js';

describe('createGame language', () => {
  it('defaults to English', () => {
    const config = buildConfig({ now: 0 });
    expect(config.language).toBe('en');
    expect(config.teamNames.blue).toBe('Blue Tigers');
  });

  it('uses Arabic default team names when language is ar', () => {
    const config = buildConfig({ language: 'ar', now: 0 });
    expect(config.language).toBe('ar');
    expect(config.teamNames.blue).toBe('نمور زرقاء');
    expect(config.teamNames.red).toBe('تنانين حمراء');
  });

  it('stores language on the session config', () => {
    const session = createGame({ language: 'ar', now: 0 });
    expect(session.config.language).toBe('ar');
  });
});
