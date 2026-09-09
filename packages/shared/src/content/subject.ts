/**
 * What a game is about, independent of how it is played. A subject pairs with
 * any game mode: a Geography Brain Race and a Geography Tug of War draw from the
 * same content.
 */
export const SUBJECTS = [
  'math',
  'science',
  'english',
  'history',
  'geography',
  'coding',
  'general',
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_LABEL: Record<Subject, string> = {
  math: 'Math',
  science: 'Science',
  english: 'English',
  history: 'History',
  geography: 'Geography',
  coding: 'Coding',
  general: 'General Knowledge',
};

/**
 * Math is generated on demand from operand bounds, so it is endless and tunable.
 * Every other subject is drawn from an authored bank, which is finite.
 */
export function isGeneratedSubject(subject: Subject): boolean {
  return subject === 'math';
}
