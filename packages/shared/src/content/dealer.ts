import { TEAM_IDS, type TeamId } from '../domain/team.js';
import { questionDedupKey } from './localize.js';
import type { Question } from './question.js';
import type { QuestionSource } from './source.js';

/**
 * How a round's questions are handed out.
 *
 * `shared` gives the whole class one question, which is what a race needs so
 * both teams are answering the same thing at the same time. `per_team` gives
 * each side its own, which is what lets a tug of war show both prompts on the
 * classroom display without one team reading the other's answer.
 */
export type QuestionAssignment = 'shared' | 'per_team';

/**
 * Deals a round's worth of questions. The engine holds one of these rather than
 * a `QuestionSource` directly, so reducers stay free of both content selection
 * and repeat-avoidance.
 */
export type QuestionDealer = {
  deal(assignment: QuestionAssignment): Record<TeamId, Question>;
};

/** How many recent prompts to avoid repeating. */
const DEFAULT_HISTORY = 8;

export type DealerOptions = {
  historySize?: number;
};

export function createQuestionDealer(
  source: QuestionSource,
  options: DealerOptions = {},
): QuestionDealer {
  const historySize = options.historySize ?? DEFAULT_HISTORY;
  const recent: string[] = [];

  const remember = (question: Question): void => {
    recent.push(questionDedupKey(question));
    while (recent.length > historySize) recent.shift();
  };

  return {
    deal(assignment) {
      if (assignment === 'shared') {
        const question = source.next(new Set(recent));
        remember(question);
        // Both lanes hold the same object, which is what makes a submission
        // from either team match the same question id.
        return { blue: question, red: question };
      }

      const avoid = new Set(recent);
      const dealt = {} as Record<TeamId, Question>;
      for (const teamId of TEAM_IDS) {
        const question = source.next(avoid);
        // Block the sibling team from drawing the same question this round.
        avoid.add(questionDedupKey(question));
        remember(question);
        dealt[teamId] = question;
      }
      return dealt;
    },
  };
}
