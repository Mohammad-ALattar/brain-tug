import { useTranslation } from 'react-i18next';
import { GAME_MODE_LIST, type GameModeId } from '@braintug/shared';

export type ModePickerProps = {
  value: GameModeId;
  onChange: (mode: GameModeId) => void;
};

export function ModePicker({ value, onChange }: ModePickerProps) {
  const { t } = useTranslation(['game', 'common']);

  return (
    <fieldset>
      <legend className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {t('game:fieldLabels.game')}
      </legend>
      <div
        role="radiogroup"
        aria-label={t('game:fieldLabels.game')}
        className="mt-2 grid gap-2 sm:grid-cols-2"
      >
        {GAME_MODE_LIST.map((mode) => {
          const selected = mode.id === value;
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(mode.id)}
              className={[
                'bt-focus rounded-card border-2 px-3 py-3 text-start transition',
                selected
                  ? 'border-ink bg-ink text-white'
                  : 'border-paper-line bg-paper-card text-ink hover:border-ink/30',
              ].join(' ')}
            >
              <span className="block font-display text-base font-extrabold">
                {t(`game:modes.${mode.id}.label`)}
              </span>
              <span
                className={`mt-1 block text-xs font-semibold ${selected ? 'text-white/75' : 'text-ink-muted'}`}
              >
                {t(`game:modes.${mode.id}.blurb`)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
