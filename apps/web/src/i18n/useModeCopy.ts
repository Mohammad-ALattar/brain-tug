import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameModeId, ModeState } from '@braintug/shared';

export function useModeCopy(mode: GameModeId) {
  const { t } = useTranslation('game');
  const gapDigits = mode === 'tug_of_war' ? 1 : 0;

  return {
    countdownCue: t(`modes.${mode}.countdownCue`),
    targetReached: t(`modes.${mode}.targetReached`),
    wonBy: t(`modes.${mode}.wonBy`),
    topContributor: t(`modes.${mode}.topContributor`),
    contributionColumn: t(`modes.${mode}.contributionColumn`),
    level: t(`modes.${mode}.level`),
    rejectedTitle: t(`modes.${mode}.rejectedTitle`),
    roundStillOpen: t(`modes.${mode}.roundStillOpen`),
    gapDigits,
    correctGain: useCallback(
      (metres: number) =>
        t(`modes.${mode}.correctGain`, {
          metres: metres.toFixed(gapDigits),
        }),
      [gapDigits, mode, t],
    ),
    finishLine: useCallback(
      (metres: number) =>
        t(`modes.${mode}.finishLine`, {
          metres: metres.toFixed(gapDigits === 1 ? 1 : 0),
        }),
      [gapDigits, mode, t],
    ),
  };
}

export function useModeCopyFromState(state: ModeState | null) {
  const mode = state?.kind ?? 'tug_of_war';
  return useModeCopy(mode);
}
