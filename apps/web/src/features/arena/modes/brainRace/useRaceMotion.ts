import { useEffect, type RefObject } from 'react';
import type { TeamId } from '@braintug/shared';
import { shouldBoostBrainRaceStreak } from '@braintug/shared';
import { useGameStore, type GameStore } from '../../../../store/gameStore';
import {
  buildRaceMotionVars,
  nextRaceMotionTick,
  racePlayerSlots,
  readRaceProgress,
  streakTierForPlayer,
  type RaceMotionVars,
} from './raceMotion';

export { RACE_TRAVEL_PX, RACE_SETTLE_ANIMATE, RACE_SETTLE_SNAP } from './raceMotion';

const BOOST_MS = 700;

function syncSlotProgress(root: HTMLElement, progress: number[]): void {
  root.querySelectorAll<HTMLElement>('[data-race-index]').forEach((element) => {
    const index = Number(element.dataset.raceIndex);
    if (!Number.isFinite(index) || index < 0 || index >= progress.length) return;
    element.style.setProperty('--race-progress', progress[index]!.toFixed(4));
  });
}

/**
 * Drives lane animation from Brain Race progress by writing CSS custom
 * properties onto the stage root. Same contract as the rope: the tree renders
 * once, the compositor moves the racers between server positions.
 */
export function useRaceMotion(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const boostTimers: Partial<Record<TeamId, ReturnType<typeof setTimeout>>> = {};
    let motionTick = {
      progressKey: useGameStore.getState().lastProgress?.key ?? null,
      lastHandledProgressKey: useGameStore.getState().lastProgress?.key ?? null,
      primed: false,
    };

    const write = (vars: RaceMotionVars): void => {
      for (const [name, value] of Object.entries(vars)) {
        if (root.style.getPropertyValue(name) !== value) {
          root.style.setProperty(name, value);
        }
      }
    };

    const boost = (teamId: TeamId): void => {
      const name = `--boost-${teamId}`;
      root.style.setProperty(name, '1');
      clearTimeout(boostTimers[teamId]);
      boostTimers[teamId] = setTimeout(() => root.style.setProperty(name, '0'), BOOST_MS);
    };

    const apply = (store: GameStore): void => {
      const state = store.state;
      if (!state) return;

      const slots = racePlayerSlots({ teams: state.teams, players: state.players });
      const progress = readRaceProgress(state.modeState, slots);
      const tick = nextRaceMotionTick({
        ...motionTick,
        progressKey: store.lastProgress?.key ?? null,
      });
      motionTick = {
        progressKey: tick.progressKey,
        lastHandledProgressKey: tick.lastHandledProgressKey,
        primed: tick.primed,
      };

      const streakTiers = slots.map(({ playerId }) => {
        const player = state.players.find((entry) => entry.id === playerId);
        return streakTierForPlayer(player?.streak ?? 0);
      });

      write(
        buildRaceMotionVars({
          progress,
          shouldAnimate: tick.shouldAnimate,
          streakTiers,
        }),
      );
      syncSlotProgress(root, progress);

      if (
        tick.shouldBoost &&
        store.lastProgress &&
        shouldBoostBrainRaceStreak(store.lastProgress.streak)
      ) {
        boost(store.lastProgress.teamId);
      }
    };

    apply(useGameStore.getState());
    const unsubscribe = useGameStore.subscribe(apply);

    return () => {
      unsubscribe();
      for (const timer of Object.values(boostTimers)) clearTimeout(timer);
    };
  }, [ref]);
}
