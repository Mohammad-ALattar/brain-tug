import { memo } from 'react';
import { SharedQuestionPrompt } from '../../../question/SharedQuestionPrompt';
import { QuestionOptions } from '../../../question/QuestionOptions';
import { useRoundAnswerProgress, useStatus, useTeamQuestion } from '../../../../store/selectors';
import { formatAnswerProgressLabel } from './raceFeedback';
import { RaceRoundNotice } from './RaceRoundNotice';

/**
 * The shared prompt for the class. Both teams hold the same question, so this
 * reads the blue slot; the red slot is identical by construction.
 */
export const RaceQuestionPanel = memo(function RaceQuestionPanel() {
  const question = useTeamQuestion('blue');
  const status = useStatus();
  const progress = useRoundAnswerProgress();

  return (
    <section className="bt-panel flex min-h-0 flex-1 flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
          Shared question
        </p>
        <p
          className="tabular rounded-chip bg-paper-sunk px-2.5 py-1 text-xs font-extrabold text-ink-muted"
          aria-live="polite"
        >
          {formatAnswerProgressLabel(progress)}
        </p>
      </div>

      <RaceRoundNotice />

      <div className="mt-3 text-center">
        <SharedQuestionPrompt
          question={question}
          empty={status === 'lobby' ? 'Waiting to start' : 'Get ready'}
        />
      </div>

      {question ? <QuestionOptions question={question} columns={2} /> : null}
    </section>
  );
});
