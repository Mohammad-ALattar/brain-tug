import { GAME_MODE_LIST, type GameModeId } from '@braintug/shared';

export type ModePickerProps = {
  value: GameModeId;
  onChange: (mode: GameModeId) => void;
};

export function ModePicker({ value, onChange }: ModePickerProps) {
  return (
    <fieldset>
      <legend className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        Game
      </legend>
      <div role="radiogroup" aria-label="Game" className="mt-2 grid gap-2 sm:grid-cols-2">
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
                'bt-focus rounded-card border-2 px-3 py-3 text-left transition',
                selected
                  ? 'border-ink bg-ink text-white'
                  : 'border-paper-line bg-paper-card text-ink hover:border-ink/30',
              ].join(' ')}
            >
              <span className="block font-display text-base font-extrabold">{mode.label}</span>
              <span className={`mt-1 block text-xs font-semibold ${selected ? 'text-white/75' : 'text-ink-muted'}`}>
                {mode.blurb}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
