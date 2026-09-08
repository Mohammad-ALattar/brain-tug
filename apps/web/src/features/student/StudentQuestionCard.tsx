import { memo } from 'react';
import type { TeamId } from '@mtow/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { useQuestionIndex, useTeamPrompt, useTotalQuestions } from '../../store/selectors';

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
  const prompt = useTeamPrompt(teamId);
  const index = useQuestionIndex();
  const total = useTotalQuestions();
  const theme = TEAM_THEME[teamId];

  return (
    <section className={`rounded-panel border ${theme.border} ${theme.tint} px-4 py-5 text-center`}>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {index >= 0 ? `Question ${index + 1} of ${total}` : 'Your problem'}
      </p>

      <p
        className="tabular mt-2 font-display text-[46px] font-extrabold leading-none text-ink sm:text-[56px]"
        aria-live="polite"
      >
        {prompt ? (
          <>
            {prompt} <span className="text-ink-faint">=</span>{' '}
            <span className={theme.text}>?</span>
          </>
        ) : (
          <span className="text-2xl text-ink-faint">Waiting&hellip;</span>
        )}
      </p>
    </section>
  );
});
