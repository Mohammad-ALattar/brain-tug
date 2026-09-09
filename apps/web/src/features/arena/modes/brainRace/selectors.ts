import { useGameStore } from '../../../../store/gameStore';

export const useRaceModeState = () =>
  useGameStore((s) => (s.state?.modeState.kind === 'brain_race' ? s.state.modeState : null));
