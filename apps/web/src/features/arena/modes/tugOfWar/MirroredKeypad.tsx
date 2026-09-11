import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../../../design/teamTheme';
import { useTeamDraft, useTeamLocked } from '../../../../store/selectors';

export type MirroredKeypadProps = {
  teamId: TeamId;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'] as const;

export const MirroredKeypad = memo(function MirroredKeypad({ teamId }: MirroredKeypadProps) {
  const { t } = useTranslation('game');
  const draft = useTeamDraft(teamId);
  const locked = useTeamLocked(teamId);
  const theme = TEAM_THEME[teamId];

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
        {t('arena.tug.mirroredKeypad')}
      </p>
    </div>
  );
});
