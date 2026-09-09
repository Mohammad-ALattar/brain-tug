import {
  brainRaceStreakVisualTier,
  playerProgress,
  type ModeState,
  type PlayerId,
  type PublicPlayer,
  type TeamId,
} from '@braintug/shared';



/** How far, in px, a racer travels from the start line to the finish. */

export const RACE_TRAVEL_PX = 720;



/** Racer settle duration when animating between consecutive server positions. */

export const RACE_SETTLE_MS = 650;

export const RACE_SETTLE_ANIMATE = `${RACE_SETTLE_MS / 1000}s`;

export const RACE_SETTLE_SNAP = '0s';



export type RacePlayerSlot = {

  slotIndex: number;

  playerId: PlayerId;

  teamId: TeamId;

};



export type RaceMotionVars = Record<string, string>;



/** Stable slot order: blue roster, then red roster. */

export function racePlayerSlots(input: {

  teams: { blue: { playerIds: PlayerId[] }; red: { playerIds: PlayerId[] } };

  players: PublicPlayer[];

}): RacePlayerSlot[] {

  const known = new Set(input.players.map((player) => player.id));

  const slots: RacePlayerSlot[] = [];

  let slotIndex = 0;



  for (const teamId of ['blue', 'red'] as const) {

    for (const playerId of input.teams[teamId].playerIds) {

      if (!known.has(playerId)) continue;

      slots.push({ slotIndex, playerId, teamId });

      slotIndex += 1;

    }

  }



  return slots;

}



/** Reads normalised lane progress per slot from the authoritative mode state. */

export function readRaceProgress(

  modeState: ModeState | null | undefined,

  slots: RacePlayerSlot[],

): number[] {

  if (modeState?.kind !== 'brain_race') {

    return slots.map(() => 0);

  }

  return slots.map(({ playerId }) => playerProgress(modeState, playerId));

}



export type RaceMotionTick = {

  progressKey: number | null;

  lastHandledProgressKey: number | null;

  primed: boolean;

};



export type RaceMotionTickResult = RaceMotionTick & {

  shouldAnimate: boolean;

  shouldBoost: boolean;

};



/**

 * Decides whether this store tick should animate racers or snap them.

 *

 * Animation only follows a fresh `progress_applied` key after the stage has

 * been primed. Full snapshots, the first frame, and reconnects always snap.

 */

export function nextRaceMotionTick(tick: RaceMotionTick): RaceMotionTickResult {

  const isNewProgress =

    tick.progressKey !== null && tick.progressKey !== tick.lastHandledProgressKey;

  const shouldAnimate = tick.primed && isNewProgress;



  return {

    progressKey: tick.progressKey,

    lastHandledProgressKey: isNewProgress ? tick.progressKey : tick.lastHandledProgressKey,

    primed: true,

    shouldAnimate,

    shouldBoost: isNewProgress,

  };

}



export function buildRaceMotionVars(input: {

  progress: number[];

  shouldAnimate: boolean;

  streakTiers: number[];

  travelPx?: number;

}): RaceMotionVars {

  const vars: RaceMotionVars = {

    '--race-travel': `${input.travelPx ?? RACE_TRAVEL_PX}px`,

    '--race-settle': input.shouldAnimate ? RACE_SETTLE_ANIMATE : RACE_SETTLE_SNAP,

  };



  input.progress.forEach((value, index) => {

    vars[`--race-${index}`] = value.toFixed(4);

    vars[`--streak-${index}`] = String(input.streakTiers[index] ?? 0);

  });



  return vars;

}



export function streakTierForPlayer(streak: number): number {

  return brainRaceStreakVisualTier(streak);

}


