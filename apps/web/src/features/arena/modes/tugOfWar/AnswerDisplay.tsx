import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../../../design/teamTheme';
import { useTeamDraft, useTeamLocked, useTeamRevealedAnswer } from '../../../../store/selectors';

export type AnswerDisplayProps = {
  teamId: TeamId;
  maskWhileTyping?: boolean;
};

export const AnswerDisplay = memo(function AnswerDisplay({
  teamId,
  maskWhileTyping = true,
}: AnswerDisplayProps) {
  const { t } = useTranslation('game');
  const draft = useTeamDraft(teamId);
  const locked = useTeamLocked(teamId);
  const lockedValue = useTeamRevealedAnswer(teamId);
  const theme = TEAM_THEME[teamId];

  const shown = locked
    ? String(lockedValue ?? '')
    : draft.length > 0
      ? maskWhileTyping
        ? '\u2022'.repeat(draft.length)
        : draft
      : '';

  return (
    <div className="space-y-2">
      <div
        className={[
          'flex h-14 items-center justify-center rounded-card border-2 bg-white',
          locked ? 'border-emerald-400' : draft.length > 0 ? theme.border : 'border-dashed border-paper-line',
        ].join(' ')}
        aria-live="polite"
        aria-label={
          locked
            ? t('arena.tug.answerLocked', { value: lockedValue })
            : t('arena.tug.answerInProgress')
        }
      >
        <span className="tabular font-display text-3xl font-extrabold tracking-wider text-ink">
          {shown ? (
            <>
              <span className="text-ink-faint">[</span>
              {shown}
              <span className="text-ink-faint">]</span>
            </>
          ) : (
            <span className="text-xl text-ink-faint">[ ? ]</span>
          )}
        </span>
      </div>

      {locked ? (
        <p className="flex items-center justify-center gap-1.5 rounded-chip bg-emerald-100 py-1 text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
          <span aria-hidden>&#10003;</span> {t('arena.tug.confirmed')}
        </p>
      ) : draft.length > 0 ? (
        <p className={`text-center text-[11px] font-extrabold uppercase tracking-wide ${theme.text}`}>
          {t('arena.tug.typing')}
        </p>
      ) : (
        <p className="text-center text-[11px] font-bold uppercase tracking-wide text-ink-faint">
          {t('arena.tug.awaitingAnswer')}
        </p>
      )}
    </div>
  );
});
