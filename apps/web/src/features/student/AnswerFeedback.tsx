import { memo, type ReactNode } from 'react';
import type { AnswerOutcome } from '@braintug/shared';
import { displayMetresForGain } from '@braintug/shared';
import { useTranslation } from 'react-i18next';
import { useRejectionLabel } from '../../i18n/useErrorCopy';
import { useModeCopyFromState } from '../../i18n/useModeCopy';
import { useGameMode, useModeState } from '../../store/selectors';

export type AnswerFeedbackProps = {
  outcome: AnswerOutcome | null;
};

/**
 * The result of this student's last submission.
 *
 * Driven by the `submit_answer` acknowledgement rather than a broadcast. An
 * incorrect outcome never carries the correct answer: teammates may still be
 * answering the same question.
 */
export const AnswerFeedback = memo(function AnswerFeedback({ outcome }: AnswerFeedbackProps) {
  const { t: tGame } = useTranslation('game');
  const { t } = useTranslation('student');
  const rejectionLabel = useRejectionLabel();
  const modeState = useModeState();
  const mode = useGameMode();
  const copy = useModeCopyFromState(modeState);

  if (!outcome) return null;

  if (outcome.status === 'correct') {
    const metres = modeState ? displayMetresForGain(modeState, outcome.gain) : 0;
    const streakLabel =
      mode === 'brain_race' && outcome.streak >= 2
        ? tGame('arena.race.streakLabel', { count: outcome.streak })
        : null;
    const tugStreak =
      mode !== 'brain_race' && outcome.streak >= 3
        ? ` ${t('feedback.tugStreak', { count: outcome.streak })}`
        : '';

    return (
      <Banner tone="good" title={t('feedback.correct')}>
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
        <Banner tone="bad" title={t('feedback.incorrect')}>
          {t('feedback.streakReset')}
        </Banner>
      );
    }
    return <Banner tone="bad" title={t('feedback.incorrectGeneric')} />;
  }

  return (
    <Banner tone="neutral" title={copy?.rejectedTitle ?? t('feedback.notThisTime')}>
      {rejectionLabel(outcome.reason)}
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
