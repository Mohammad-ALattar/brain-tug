import type { GameResult } from '../domain/result.js';
import type { PlayerId } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import type { TeamId } from '../domain/team.js';
import type { ModeState } from '../modes/types.js';
import { expectModeState } from '../modes/types.js';
import { leadingTeam, ropeToMetres } from './rope.js';

/**
 * Converts a gain (or a player's accumulated contribution) into metres for
 * display. One function so presentation never branches on `kind`.
 */
export function displayMetresForGain(state: ModeState, gain: number): number {
  if (state.kind === 'tug_of_war') return Math.abs(ropeToMetres(state, gain));
  if (state.kind === 'brain_race') return Math.abs(gain * state.trackMetres);
  return 0;
}

export function displayPlayerMetres(state: ModeState, playerId: PlayerId): number {
  if (state.kind !== 'brain_race') return 0;
  const race = expectModeState(state, 'brain_race');
  return (race.progress[playerId] ?? 0) * race.trackMetres;
}

/** Connected finishers for a team in Brain Race. */
export function displayTeamFinishers(
  state: ModeState,
  session: GameSession,
  teamId: TeamId,
  winThreshold: number,
): { finished: number; required: number } {
  if (state.kind !== 'brain_race') return { finished: 0, required: 0 };
  const race = expectModeState(state, 'brain_race');
  let finished = 0;
  for (const playerId of session.teams[teamId].playerIds) {
    const player = session.players[playerId];
    if (!player?.connected) continue;
    if ((race.progress[playerId] ?? 0) >= winThreshold) finished += 1;
  }
  return {
    finished,
    required: race.finishersRequiredPerTeam,
  };
}

/** The team currently ahead, or null when the sides are level. Tug only. */
export function displayLeader(state: ModeState): TeamId | null {
  if (state.kind === 'tug_of_war') return leadingTeam(state.ropePosition);
  return null;
}

/** How far the leader is ahead, in metres. Tug only. */
export function displayLeadGapMetres(state: ModeState): number {
  if (state.kind === 'tug_of_war') {
    return Math.abs(ropeToMetres(state, state.ropePosition));
  }
  return 0;
}

/** The distance to show on a finished match, or null when there is no single winning team. */
export function displayFinishMetres(result: GameResult): number | null {
  const state = result.finalModeState;
  if (state.kind === 'tug_of_war') {
    return Math.abs(ropeToMetres(state, state.ropePosition));
  }
  return null;
}
