import { memo } from 'react';
import type { TeamId } from '@mtow/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { useStatus, useTeamPrompt } from '../../store/selectors';
import { AnswerDisplay } from './AnswerDisplay';

export type QuestionCardProps = {
  teamId: TeamId;
};

/**
 * The `CURRENT PROBLEM` block: the team's own prompt rendered large, with the
 * mirrored answer beneath it.
 */
export const QuestionCard = memo(function QuestionCard({ teamId }: QuestionCardProps) {
  const prompt = useTeamPrompt(teamId);
  const status = useStatus();
  const theme = TEAM_THEME[teamId];

  return (
    <section className={`rounded-card border ${theme.border} ${theme.tint} px-4 py-4`}>
      <h2 className="text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        Current problem
      </h2>

      <p
        className="tabular mt-2 text-center font-display text-[44px] font-extrabold leading-none text-ink"
        aria-live="polite"
      >
        {prompt ? (
          <>
            {prompt} <span className="text-ink-faint">=</span>{' '}
            <span className={theme.text}>?</span>
          </>
        ) : status === 'lobby' ? (
          <span className="text-2xl text-ink-faint">Waiting to start</span>
        ) : (
          <span className="text-2xl text-ink-faint">Get ready</span>
        )}
      </p>

      <div className="mt-3">
        <AnswerDisplay teamId={teamId} />
      </div>
    </section>
  );
});
