import { memo, type ReactNode } from 'react';
import type { AnswerOutcome, RejectionReason } from '@mtow/shared';
import { ropeToMetres } from '@mtow/shared';
import { useRules } from '../../store/selectors';

export type AnswerFeedbackProps = {
  outcome: AnswerOutcome | null;
};

/**
 * Why a submission was refused, in words a child can act on.
 *
 * Every reason the server can return is covered, so a rejection never surfaces
 * as a raw enum or a dead-end "something went wrong".
 */
const REJECTION_COPY: Record<RejectionReason, string> = {
  game_not_active: 'The game has not started yet.',
  game_paused: 'Your teacher paused the game.',
  round_not_active: 'This question has closed.',
  stale_question: 'That was the last question. Here comes the next one.',
  team_already_locked: 'A teammate already got this one.',
  player_already_answered: 'You have already answered this question.',
  time_expired: 'Time ran out on that question.',
  malformed_answer: 'That answer was not a number.',
  not_a_player: 'You are not in this game any more.',
};

/**
 * The result of this student's last submission.
 *
 * Driven by the `submit_answer` acknowledgement rather than a broadcast, which
 * is what keeps one student's mistake private: the revealed correct answer is
 * only ever sent to the player who already spent their attempt.
 */
export const AnswerFeedback = memo(function AnswerFeedback({ outcome }: AnswerFeedbackProps) {
  const rules = useRules();

  if (!outcome) return null;

  if (outcome.status === 'correct') {
    const metres = rules ? ropeToMetres(rules, outcome.pull) : 0;
    return (
      <Banner tone="good" title="Correct!">
        You pulled the rope {metres.toFixed(1)}m
        {outcome.streak >= 3 ? ` \u2022 ${outcome.streak} in a row` : ''}
      </Banner>
    );
  }

  if (outcome.status === 'incorrect') {
    return (
      <Banner tone="bad" title="Not quite">
        The answer was {outcome.correctAnswer}
      </Banner>
    );
  }

  return (
    <Banner tone="neutral" title="No pull">
      {REJECTION_COPY[outcome.reason]}
    </Banner>
  );
});

type BannerTone = 'good' | 'bad' | 'neutral';

const TONES: Record<BannerTone, string> = {
  good: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  bad: 'border-redteam-300 bg-redteam-50 text-redteam-900',
  neutral: 'border-paper-line bg-paper-sunk text-ink-muted',
};

function Banner({
  tone,
  title,
  children,
}: {
  tone: BannerTone;
  title: string;
  children: ReactNode;
}) {
  return (
    // `assertive`: the student has just acted and is waiting on this specific
    // answer, so it should interrupt rather than queue behind other updates.
    <div
      role="status"
      aria-live="assertive"
      className={`rounded-card border-2 px-4 py-3 text-center ${TONES[tone]}`}
    >
      <p className="font-display text-lg font-extrabold leading-tight">{title}</p>
      <p className="mt-0.5 text-sm font-semibold">{children}</p>
    </div>
  );
}
