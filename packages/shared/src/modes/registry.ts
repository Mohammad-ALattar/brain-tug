import { brainRace } from './brainRace.js';
import { tugOfWar } from './tugOfWar.js';
import { GAME_MODES, type GameMode, type GameModeId } from './types.js';

/**
 * Every playable mode, by id. Adding a mode means adding it here and nowhere
 * else in the engine: the reducers reach for a mode through this map rather
 * than branching on an id.
 */
export const GAME_MODE: Record<GameModeId, GameMode> = {
  tug_of_war: tugOfWar,
  brain_race: brainRace,
};

/** Modes in the order the host's picker should offer them. */
export const GAME_MODE_LIST: GameMode[] = GAME_MODES.map((id) => GAME_MODE[id]);
