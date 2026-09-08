import { memo } from 'react';
import type { TeamId } from '@mtow/shared';
import { TEAM_THEME } from '../../design/teamTheme';

export type KeypadKey = string;

export type NumericKeypadProps = {
  teamId: TeamId;
  disabled: boolean;
  /** Receives a digit, `'C'` to clear, or `'<'` for backspace. */
  onKey: (key: KeypadKey) => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'] as const;

const LABELS: Record<string, string> = { C: 'Clear', '<': 'Backspace' };

/**
 * The student's interactive keypad.
 *
 * A keypad rather than a text input on purpose: `<input type="number">` on a
 * phone brings up an OS keyboard that covers half the screen, allows `e`, `+`
 * and `.`, and lets a child paste. Owning the surface keeps the whole controller
 * visible and makes the input impossible to malform.
 */
export const NumericKeypad = memo(function NumericKeypad({
  teamId,
  disabled,
  onKey,
}: NumericKeypadProps) {
  const theme = TEAM_THEME[teamId];

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3" role="group" aria-label="Answer keypad">
      {KEYS.map((key) => {
        const isAction = key === 'C' || key === '<';
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-label={LABELS[key] ?? key}
            // `onPointerDown` rather than `onClick`: it fires on touch-down, so
            // the keypad feels immediate instead of waiting for touch-end.
            onPointerDown={(event) => {
              event.preventDefault();
              onKey(key);
            }}
            className={[
              'mtow-focus grid h-16 touch-manipulation select-none place-items-center rounded-card border text-2xl font-extrabold shadow-key transition sm:h-[68px]',
              'active:translate-y-px active:shadow-none',
              'disabled:pointer-events-none disabled:opacity-40',
              // Variant-prefixed team classes are avoided here: Tailwind only
              // generates class strings it can see literally in the source.
              isAction
                ? 'border-paper-line bg-paper-sunk text-ink-muted active:bg-paper-line'
                : `${theme.border} bg-paper-card text-ink active:bg-paper-sunk`,
            ].join(' ')}
          >
            {key === '<' ? '\u232b' : key}
          </button>
        );
      })}
    </div>
  );
});
