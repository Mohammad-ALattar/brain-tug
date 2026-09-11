import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TEAM_THEME } from '../../../../design/teamTheme';

import { useLastProgress, usePlayers, useTeamName } from '../../../../store/selectors';

import { useRaceModeState } from './selectors';

import { formatRaceGainPresentation } from './raceFeedback';

type FeedItem = {
  key: number;
  teamId: 'blue' | 'red';
  playerName: string;
  teamName: string;
  metresLabel: string;
};

/** Recent correct answers, so the class can scan who moved while answering continues. */
export function ActivityFeed() {
  const { t } = useTranslation('game');
  const lastProgress = useLastProgress();
  const race = useRaceModeState();
  const players = usePlayers();
  const blueName = useTeamName('blue');
  const redName = useTeamName('red');
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    if (!lastProgress || !race) return;

    const player = players.find((entry) => entry.id === lastProgress.playerId);
    const presentation = formatRaceGainPresentation(t, {
      flash: lastProgress,
      playerName: player?.name ?? t('arena.race.defaultPlayer'),
      teamName: lastProgress.teamId === 'blue' ? blueName : redName,
      modeState: race,
    });

    const next: FeedItem = {
      key: lastProgress.key,
      teamId: presentation.teamId,
      playerName: presentation.playerName,
      teamName: presentation.teamName,
      metresLabel: presentation.metresLabel,
    };

    setItems((prev) => [next, ...prev.filter((item) => item.key !== next.key)].slice(0, 6));
  }, [lastProgress, race, blueName, redName, players, t]);

  return (
    <section className="bt-card h-[120px] overflow-hidden p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {t('arena.race.recentGains')}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs font-semibold text-ink-faint">
          {t('arena.race.waitingFirstAnswer')}
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => {
            const theme = TEAM_THEME[item.teamId];
            return (
              <li key={item.key} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className={`font-extrabold ${theme.text}`}>{item.playerName}</span>
                  <span className="ms-1.5 text-xs font-bold text-ink-muted">{item.teamName}</span>
                </div>
                <span className="tabular shrink-0 font-bold text-ink">{item.metresLabel}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
