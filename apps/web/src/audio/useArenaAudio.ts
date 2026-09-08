import { useEffect } from 'react';
import { useGameStore, type GameStore } from '../store/gameStore';
import { playSfx, setSfxEnabled } from './sfx';

/**
 * Plays the arena's sounds by watching the store directly.
 *
 * Subscribing imperatively, like `useArenaMotion`, keeps audio entirely off the
 * render path: a sound effect is a side effect of a state change, not a reason
 * to repaint the classroom display.
 */
export function useArenaAudio(enabled: boolean): void {
  useEffect(() => {
    setSfxEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    let lastPullKey: number | null = null;
    let lastResolvedIndex: number | null = null;
    let announcedFinish = false;

    const react = (store: GameStore): void => {
      const pull = store.lastPull;
      if (pull && pull.key !== lastPullKey) {
        lastPullKey = pull.key;
        playSfx(pull.teamId === 'blue' ? 'pullBlue' : 'pullRed');
      }

      const resolution = store.lastResolution;
      if (resolution && resolution.index !== lastResolvedIndex) {
        lastResolvedIndex = resolution.index;
        // A round that nobody won gets the flat tone; a round decided by an
        // answer already announced itself with that team's pull.
        if (resolution.reason === 'timeout' || resolution.reason === 'skipped') {
          playSfx('roundEnd');
        }
      }

      if (store.result && !announcedFinish) {
        announcedFinish = true;
        playSfx('victory');
      } else if (!store.result) {
        announcedFinish = false;
      }
    };

    // Seed the watermarks from the current state so attaching mid-match does
    // not replay the last pull.
    const current = useGameStore.getState();
    lastPullKey = current.lastPull?.key ?? null;
    lastResolvedIndex = current.lastResolution?.index ?? null;
    announcedFinish = current.result !== null;

    return useGameStore.subscribe(react);
  }, []);
}
