import { memo, type ReactNode } from 'react';
import type { AnswerOutcome, RejectionReason } from '@braintug/shared';
import { displayMetresForGain, formatBrainRaceStreakLabel } from '@braintug/shared';
import { copyForState } from '../arena/modeCopy';
import { useGameMode, useModeState } from '../../store/selectors';

export type AnswerFeedbackProps = {
  outcome: AnswerOutcome | null;
};

const REJECTION_COPY: Record<RejectionReason, string> = {
  game_not_active: 'The game has not started yet.',
  game_paused: 'Your teacher paused the game.',
  round_not_active: 'This question has closed.',
  stale_question: 'That was the last question. Here comes the next one.',
  team_already_locked: 'A teammate already got this one.',
  player_already_answered: 'You have already answered this question.',
  time_expired: 'Time ran out on that question.',
  malformed_answer: 'That answer was not accepted.',
  not_a_player: 'You are not in this game any more.',
};

/**
 * The result of this student's last submission.
 *
 * Driven by the `submit_answer` acknowledgement rather than a broadcast. An
 * incorrect outcome never carries the correct answer: teammates may still be
 * answering the same question.
 */
export const AnswerFeedback = memo(function AnswerFeedback({ outcome }: AnswerFeedbackProps) {
  const modeState = useModeState();
  const mode = useGameMode();
  const copy = modeState ? copyForState(modeState) : null;

  if (!outcome) return null;

  if (outcome.status === 'correct') {
    const metres = modeState ? displayMetresForGain(modeState, outcome.gain) : 0;
    const streakLabel =
      mode === 'brain_race' ? formatBrainRaceStreakLabel(outcome.streak) : null;
    const tugStreak =
      mode !== 'brain_race' && outcome.streak >= 3 ? ` \u2022 ${outcome.streak} in a row` : '';

    return (
      <Banner tone="good" title="Correct!">
        {copy ? copy.correctGain(metres) : ''}
        {tugStreak}
        {streakLabel ? (
          <span className="mt-1 block text-sm font-bold">{streakLabel}</span>
        ) : null}
      </Banner>
    );
  }

  if (outcome.status === 'incorrect') {
    if (mode === 'brain_race') {
      return (
        <Banner tone="bad" title="Incorrect">
          Streak reset
        </Banner>
      );
    }
    return <Banner tone="bad" title="Your answer was incorrect" />;
  }

  return (
    <Banner tone="neutral" title={copy?.rejectedTitle ?? 'Not this time'}>
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
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className={`rounded-card border-2 px-4 py-3 text-center ${TONES[tone]}`}
    >
      <p className="font-display text-lg font-extrabold leading-tight">{title}</p>
      {children ? <p className="mt-0.5 text-sm font-semibold">{children}</p> : null}
    </div>
  );
}
