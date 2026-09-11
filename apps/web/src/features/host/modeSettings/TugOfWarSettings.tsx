import { useTranslation } from 'react-i18next';

const LENGTHS = [
  { value: 0.5, labelKey: 'short', hintKey: 'shortHint' },
  { value: 0.75, labelKey: 'standard', hintKey: 'standardHint' },
  { value: 1, labelKey: 'full', hintKey: 'fullHint' },
] as const;

export type TugOfWarSettingsProps = {
  winThreshold: number;
  onChange: (winThreshold: number) => void;
};

export function TugOfWarSettings({ winThreshold, onChange }: TugOfWarSettingsProps) {
  const { t } = useTranslation('host');

  return (
    <fieldset>
      <legend className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {t('tugOfWar.distanceToWin')}
      </legend>
      <div
        role="radiogroup"
        aria-label={t('tugOfWar.distanceToWin')}
        className="mt-2 flex flex-wrap gap-2"
      >
        {LENGTHS.map((option) => {
          const selected = option.value === winThreshold;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={[
                'bt-focus flex-1 rounded-card border-2 px-3 py-2.5 text-sm font-extrabold transition',
                selected
                  ? 'border-ink bg-ink text-white'
                  : 'border-paper-line bg-paper-card text-ink-muted hover:border-ink/30',
              ].join(' ')}
            >
              {t(`tugOfWar.${option.labelKey}`)}
              <span
                className={`block text-[10px] font-semibold ${selected ? 'text-white/70' : 'text-ink-faint'}`}
              >
                {t(`tugOfWar.${option.hintKey}`)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
