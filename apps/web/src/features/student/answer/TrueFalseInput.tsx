import { memo } from 'react';
import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../../design/teamTheme';

export type TrueFalseInputProps = {
  teamId: TeamId;
  disabled: boolean;
  onChoose: (value: string) => void;
};

export const TrueFalseInput = memo(function TrueFalseInput({
  teamId,
  disabled,
  onChoose,
}: TrueFalseInputProps) {
  const theme = TEAM_THEME[teamId];

  return (
    <div className="grid grid-cols-2 gap-3" role="group" aria-label="True or false">
      {(
        [
          { value: 'true', label: 'True' },
          { value: 'false', label: 'False' },
        ] as const
      ).map((choice) => (
        <button
          key={choice.value}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(choice.value)}
          className={`bt-focus grid h-24 touch-manipulation place-items-center rounded-card border-2 font-display text-2xl font-extrabold shadow-key transition active:translate-y-px disabled:opacity-40 ${theme.border} bg-paper-card text-ink`}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
});
