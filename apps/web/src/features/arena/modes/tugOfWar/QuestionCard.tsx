import { memo } from 'react';
import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../../../design/teamTheme';
import { useStatus, useTeamQuestion } from '../../../../store/selectors';
import { SharedQuestionPrompt } from '../../../question/SharedQuestionPrompt';
import { AnswerDisplay } from './AnswerDisplay';

export type QuestionCardProps = {
  teamId: TeamId;
};

/**
 * The `CURRENT PROBLEM` block: the team's own prompt, with a mirrored typed
 * answer beneath it when the question is typed.
 */
export const QuestionCard = memo(function QuestionCard({ teamId }: QuestionCardProps) {
  const question = useTeamQuestion(teamId);
  const status = useStatus();
  const theme = TEAM_THEME[teamId];
  const showTypedAnswer = question?.type === 'type_answer';

  return (
    <section className={`rounded-card border ${theme.border} ${theme.tint} px-4 py-4`}>
      <h2 className="text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        Current problem
      </h2>

      <div className="mt-2 text-center">
        <SharedQuestionPrompt
          question={question}
          accentClassName={theme.text}
          empty={status === 'lobby' ? 'Waiting to start' : 'Get ready'}
        />
      </div>

      {showTypedAnswer ? (
        <div className="mt-3">
          <AnswerDisplay teamId={teamId} />
        </div>
      ) : null}
    </section>
  );
});
