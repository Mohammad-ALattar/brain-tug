import { useGameStore } from '../../../../store/gameStore';

/** Tug of War's own slice of mode state, or null when another mode is live. */
export const useTugModeState = () =>
  useGameStore((s) => (s.state?.modeState.kind === 'tug_of_war' ? s.state.modeState : null));
