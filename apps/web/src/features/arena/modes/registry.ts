import type { ComponentType } from 'react';
import type { GameModeId } from '@braintug/shared';
import { BrainRaceStage } from './brainRace/BrainRaceStage';
import { TugOfWarStage } from './tugOfWar/TugOfWarStage';

/** The classroom stage for each playable mode. */
export const ARENA_STAGE: Record<GameModeId, ComponentType> = {
  tug_of_war: TugOfWarStage,
  brain_race: BrainRaceStage,
};
