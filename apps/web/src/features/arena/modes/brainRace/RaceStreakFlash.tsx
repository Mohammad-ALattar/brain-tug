import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../../store/gameStore';
import {
  useLastProgress,
  useLastResolution,
  usePlayers,
  useQuestionIndex,
} from '../../../../store/selectors';
import { formatRaceStreakPresentation } from './raceFeedback';

/**
 * Subtle classroom streak feedback when a player hits the strong threshold.
 *
 * Dismisses on round close, reconnect, and stale progress keys so old streaks
 * never replay after reattaching.
 */
export function RaceStreakFlash() {
  const { t } = useTranslation('game');
  const flash = useLastProgress();
  const players = usePlayers();
  const resolution = useLastResolution();
  const questionIndex = useQuestionIndex();
  const [dismissedKey, setDismissedKey] = useState<number | null>(
    () => useGameStore.getState().lastProgress?.key ?? null,
  );

  useEffect(() => {
    if (resolution && resolution.index === questionIndex) {
      setDismissedKey(flash?.key ?? null);
    }
  }, [resolution, questionIndex, flash?.key]);

  if (!flash || dismissedKey === flash.key) return null;
  if (resolution && resolution.index === questionIndex) return null;

  const player = players.find((entry) => entry.id === flash.playerId);
  const presentation = formatRaceStreakPresentation(t, {
    flash,
    playerName: player?.name ?? t('arena.race.defaultPlayer'),
  });
  if (!presentation) return null;

  return (
    <div
      key={`streak-${flash.key}`}
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute bottom-4 left-4 z-20 animate-[raceGainPop_0.45s_ease-out_both]"
    >
      <div className="rounded-panel border border-amber-300/80 bg-amber-50/95 px-4 py-3 text-start shadow-panel backdrop-blur-sm">
        <p className="font-display text-sm font-extrabold uppercase tracking-[0.14em] text-amber-900">
          {presentation.headline}
        </p>
        {presentation.cheer ? (
          <p className="mt-0.5 text-xs font-bold text-amber-800">{presentation.cheer}</p>
        ) : null}
      </div>
    </div>
  );
}
