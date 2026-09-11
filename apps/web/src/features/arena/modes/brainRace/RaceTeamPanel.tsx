import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { TeamId } from '@braintug/shared';

import { TEAM_THEME } from '../../../../design/teamTheme';

import { useBrainRaceFinishers, useTeamName } from '../../../../store/selectors';
import { useGameStore } from '../../../../store/gameStore';

export type RaceTeamPanelProps = {
  teamId: TeamId;
  terminalNumber: number;
};

export const RaceTeamPanel = memo(function RaceTeamPanel({ teamId }: RaceTeamPanelProps) {
  const { t } = useTranslation('game');
  const theme = TEAM_THEME[teamId];
  const name = useTeamName(teamId);
  const finishers = useBrainRaceFinishers(teamId);
  const correctCount = useGameStore((s) => s.state?.teams[teamId].correctCount ?? 0);

  return (
    <aside className="bt-panel flex h-full w-[340px] shrink-0 flex-col gap-3 p-4">
      <div className={`${theme.solid} rounded-card px-4 py-3`}>
        <p className="truncate font-display text-lg font-extrabold uppercase leading-tight tracking-wide text-white">
          {name}
        </p>
      </div>

      <div className={`rounded-card border ${theme.border} ${theme.tint} px-4 py-3`}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
          {t('arena.race.finishers')}
        </p>
        <p className={`tabular font-display text-4xl font-extrabold leading-none ${theme.text}`}>
          {finishers.finished}
          <span className="text-2xl text-ink-muted"> / {finishers.required}</span>
        </p>
        <p className="tabular mt-1 text-xs font-bold text-ink-muted">
          {t('arena.race.correctAnswer', { count: correctCount })}
        </p>
      </div>
    </aside>
  );
});
