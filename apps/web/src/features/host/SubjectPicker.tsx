import { useTranslation } from 'react-i18next';
import { SUBJECTS, type Subject } from '@braintug/shared';

export type SubjectPickerProps = {
  value: Subject;
  onChange: (subject: Subject) => void;
};

export function SubjectPicker({ value, onChange }: SubjectPickerProps) {
  const { t } = useTranslation(['game', 'common']);

  return (
    <fieldset>
      <legend className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {t('game:fieldLabels.subject')}
      </legend>
      <div
        role="radiogroup"
        aria-label={t('game:fieldLabels.subject')}
        className="mt-2 flex flex-wrap gap-2"
      >
        {SUBJECTS.map((subject) => {
          const selected = subject === value;
          return (
            <button
              key={subject}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(subject)}
              className={[
                'bt-focus rounded-card border-2 px-3 py-2.5 text-sm font-extrabold transition',
                selected
                  ? 'border-ink bg-ink text-white'
                  : 'border-paper-line bg-paper-card text-ink-muted hover:border-ink/30',
              ].join(' ')}
            >
              {t(`common:subjects.${subject}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
