import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { useQuestionIndex, useTeamQuestion, useTotalQuestions } from '../../store/selectors';
import { SharedQuestionPrompt } from '../question/SharedQuestionPrompt';

export type StudentQuestionCardProps = {
  teamId: TeamId;
};

/**
 * The prompt, sized to be the unmistakable focus of the phone screen.
 *
 * Reads the team's own question from the store rather than taking it as a prop
 * so a new round repaints just this card, not the whole controller.
 */
export const StudentQuestionCard = memo(function StudentQuestionCard({
  teamId,
}: StudentQuestionCardProps) {
  const { t } = useTranslation('student');
  const question = useTeamQuestion(teamId);
  const index = useQuestionIndex();
  const total = useTotalQuestions();
  const theme = TEAM_THEME[teamId];

  return (
    <section className={`rounded-panel border ${theme.border} ${theme.tint} px-4 py-5 text-center`}>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {index >= 0
          ? t('question.questionOf', { current: index + 1, total })
          : t('question.yourProblem')}
      </p>

      <div className="mt-2">
        <SharedQuestionPrompt
          question={question}
          size="phone"
          accentClassName={theme.text}
          empty={t('question.waiting')}
        />
      </div>
    </section>
  );
});
