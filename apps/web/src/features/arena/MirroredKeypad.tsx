import { memo } from 'react';
import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { useTeamDraft, useTeamLocked } from '../../store/selectors';

export type MirroredKeypadProps = {
  teamId: TeamId;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'] as const;

/**
 * The keypad on the classroom display.
 *
 * Deliberately not interactive and deliberately a separate component from the
 * student's `NumericKeypad`: the TV has no input role at all, so there are no
 * buttons here to click, no handlers to wire and nothing to accidentally hook up
 * later. It exists to show the class which key their teammate just pressed.
 */
export const MirroredKeypad = memo(function MirroredKeypad({ teamId }: MirroredKeypadProps) {
  const draft = useTeamDraft(teamId);
  const locked = useTeamLocked(teamId);
  const theme = TEAM_THEME[teamId];

  // Highlight the most recently mirrored digit so the class can follow along.
  const lastKey = locked ? null : (draft.at(-1) ?? null);

  return (
    <div aria-hidden className={locked ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => {
          const active = key === lastKey;
          const isAction = key === 'C' || key === '<';
          return (
            <div
              key={key}
              className={[
                'grid h-11 place-items-center rounded-card border text-lg font-extrabold shadow-key transition-colors duration-150',
                isAction ? 'text-ink-faint' : 'text-ink',
                active
                  ? `${theme.solid} ${theme.border} !text-white`
                  : 'border-paper-line bg-paper-card',
              ].join(' ')}
            >
              {key === '<' ? '\u232b' : key}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-ink-faint">
        Mirrored from team phones
      </p>
    </div>
  );
});
