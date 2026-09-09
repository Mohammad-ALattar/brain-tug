import type { Subject } from '../subject.js';
import { codingBank } from './coding.js';
import { englishBank } from './english.js';
import { generalBank } from './general.js';
import { geographyBank } from './geography.js';
import { historyBank } from './history.js';
import { scienceBank } from './science.js';
import type { QuestionBank } from './types.js';

/**
 * Every authored bank, by subject. Math is absent by design: it is generated
 * rather than authored, so it has no finite list to register here.
 */
export const QUESTION_BANKS: Partial<Record<Subject, QuestionBank>> = {
  science: scienceBank,
  english: englishBank,
  history: historyBank,
  geography: geographyBank,
  coding: codingBank,
  general: generalBank,
};

export { codingBank, englishBank, generalBank, geographyBank, historyBank, scienceBank };
export * from './types.js';
