import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnswerOption, TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../../design/teamTheme';

export type ChoiceInputProps = {
  options: AnswerOption[];
  teamId: TeamId;
  disabled: boolean;
  onChoose: (optionId: string) => void;
};

export const ChoiceInput = memo(function ChoiceInput({
  options,
  teamId,
  disabled,
  onChoose,
}: ChoiceInputProps) {
  const { t } = useTranslation('student');
  const theme = TEAM_THEME[teamId];

  return (
    <div className="grid grid-cols-1 gap-2.5" role="group" aria-label={t('input.choicesAria')}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(option.id)}
          className={`bt-focus flex min-h-16 touch-manipulation items-center gap-3 rounded-card border-2 px-4 py-3 text-start shadow-key transition active:translate-y-px disabled:opacity-40 ${theme.border} bg-paper-card`}
        >
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-lg font-extrabold ${theme.solid} text-white`}
          >
            {option.id.toUpperCase()}
          </span>
          <span className="font-display text-xl font-extrabold leading-tight text-ink">
            {option.text}
          </span>
        </button>
      ))}
    </div>
  );
});
