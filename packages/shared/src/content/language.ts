/** Session UI and question content language. Fixed for the whole match. */
export const GAME_LANGUAGES = ['en', 'ar'] as const;
export type GameLanguage = (typeof GAME_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: GameLanguage = 'en';

export function isGameLanguage(value: string): value is GameLanguage {
  return (GAME_LANGUAGES as readonly string[]).includes(value);
}
