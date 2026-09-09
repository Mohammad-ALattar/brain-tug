import { memo } from 'react';
import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../design/teamTheme';

export type AnswerInputProps = {
  teamId: TeamId;
  value: string;
  /** Dimmed and caret-free once the student can no longer type. */
  disabled?: boolean;
};

/**
 * The student's own answer readout.
 *
 * Shown in full, unlike the arena's `<AnswerDisplay />`, which masks digits
 * while typing: this screen is held by one child at arm's length, so there is
 * nothing to hide from.
 */
export const AnswerInput = memo(function AnswerInput({
  teamId,
  value,
  disabled = false,
}: AnswerInputProps) {
  const theme = TEAM_THEME[teamId];

  return (
    <div
      className={[
        'flex h-[72px] items-center justify-center rounded-card border-2 px-4',
        theme.border,
        disabled ? 'bg-paper-sunk opacity-60' : 'bg-paper-card',
      ].join(' ')}
      // The value changes as the student types, so it is announced politely
      // rather than assertively to avoid interrupting a screen reader per key.
      aria-live="polite"
      aria-label="Your answer"
      role="status"
    >
      {value ? (
        <span className={`tabular font-display text-[40px] font-extrabold leading-none ${theme.textStrong}`}>
          {value}
        </span>
      ) : (
        <span className="font-display text-xl font-bold text-ink-faint">Tap the numbers</span>
      )}
      {!disabled && value ? (
        <span
          aria-hidden
          className={`ml-1 h-9 w-[3px] animate-pulse rounded-full ${theme.solid}`}
        />
      ) : null}
    </div>
  );
});
