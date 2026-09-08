import { memo } from 'react';
import type { TeamId } from '@mtow/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { useGameStore } from '../../store/gameStore';
import { useTeamDraft, useTeamLocked } from '../../store/selectors';

export type AnswerDisplayProps = {
  teamId: TeamId;
  /**
   * Masks in-progress digits on the shared display. On by default: the class can
   * see that their teammate is typing and how far along they are, without the
   * answer being readable across the room before it is locked in.
   */
  maskWhileTyping?: boolean;
};

/** The bracketed answer readout, `[20]` in the reference. */
export const AnswerDisplay = memo(function AnswerDisplay({
  teamId,
  maskWhileTyping = true,
}: AnswerDisplayProps) {
  const draft = useTeamDraft(teamId);
  const locked = useTeamLocked(teamId);
  const lockedValue = useGameStore((s) => s.state?.round?.teams[teamId].lockedValue ?? null);
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
        aria-label={locked ? `Answer locked: ${lockedValue}` : 'Answer in progress'}
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
          <span aria-hidden>&#10003;</span> Confirmed
        </p>
      ) : draft.length > 0 ? (
        <p className={`text-center text-[11px] font-extrabold uppercase tracking-wide ${theme.text}`}>
          Typing&hellip;
        </p>
      ) : (
        <p className="text-center text-[11px] font-bold uppercase tracking-wide text-ink-faint">
          Awaiting answer
        </p>
      )}
    </div>
  );
});
