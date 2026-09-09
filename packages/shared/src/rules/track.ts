import type { PlayerId } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import { TEAM_IDS, type TeamId } from '../domain/team.js';
import type { BrainRaceState } from '../modes/types.js';

/** Progress along a lane is normalised: 0 is the start line, 1 the finish. */
export const TRACK_MIN = 0;
export const TRACK_MAX = 1;

/** Default race length in metres, as labelled on the classroom display. */
export const DEFAULT_TRACK_METRES = 1000;

export function clampProgress(progress: number): number {
  if (Number.isNaN(progress)) return 0;
  return Math.min(TRACK_MAX, Math.max(TRACK_MIN, progress));
}

/** Advances one racer along the track. */
export function advanceLane(progress: number, gain: number): number {
  return clampProgress(progress + Math.max(0, gain));
}

export function playerProgress(state: BrainRaceState, playerId: PlayerId): number {
  return clampProgress(state.progress[playerId] ?? 0);
}

export function playerMetres(state: BrainRaceState, playerId: PlayerId): number {
  return playerProgress(state, playerId) * state.trackMetres;
}

/** A progress delta in metres, for the floating gain badge. */
export function gainToMetres(state: BrainRaceState, gain: number): number {
  return gain * state.trackMetres;
}

export function isPlayerFinished(
  state: BrainRaceState,
  playerId: PlayerId,
  winThreshold: number,
): boolean {
  return playerProgress(state, playerId) >= winThreshold;
}

/** Connected players on a team who have crossed the finish line. */
export function connectedFinisherCount(
  session: GameSession,
  state: BrainRaceState,
  teamId: TeamId,
  winThreshold: number,
): number {
  let count = 0;
  for (const playerId of session.teams[teamId].playerIds) {
    const player = session.players[playerId];
    if (!player?.connected) continue;
    if (isPlayerFinished(state, playerId, winThreshold)) count += 1;
  }
  return count;
}

/** Default quota: half of the larger team, at least one finisher. */
export function defaultFinishersRequired(blueSeated: number, redSeated: number): number {
  const largestTeam = Math.max(blueSeated, redSeated);
  return Math.max(1, Math.floor(largestTeam / 2));
}

/** The first team with enough connected finishers wins. */
export function raceWinnerByFinishers(
  state: BrainRaceState,
  session: GameSession,
  winThreshold: number,
): TeamId | null {
  const required = state.finishersRequiredPerTeam;
  const winners = TEAM_IDS.filter(
    (teamId) => connectedFinisherCount(session, state, teamId, winThreshold) >= required,
  );
  return winners.length === 1 ? winners[0]! : null;
}

/** Records a player's first crossing of the finish line for results ordering. */
export function recordPlayerFinish(
  state: BrainRaceState,
  playerId: PlayerId,
  teamId: TeamId,
  winThreshold: number,
): BrainRaceState {
  if (state.finishOrder.some((entry) => entry.playerId === playerId)) return state;
  if (!isPlayerFinished(state, playerId, winThreshold)) return state;
  return {
    ...state,
    finishOrder: [...state.finishOrder, { playerId, teamId }],
  };
}

/** Team progress toward the finisher quota, 0..1. */
export function teamFinisherFraction(
  session: GameSession,
  state: BrainRaceState,
  teamId: TeamId,
  winThreshold: number,
): number {
  const required = Math.max(1, state.finishersRequiredPerTeam);
  return Math.min(1, connectedFinisherCount(session, state, teamId, winThreshold) / required);
}

/** How close the race leader is to winning, 0..1, for visual tension. */
export function raceTension(
  state: BrainRaceState,
  session: GameSession,
  winThreshold: number,
): number {
  const required = Math.max(1, state.finishersRequiredPerTeam);
  let best = 0;
  for (const teamId of TEAM_IDS) {
    best = Math.max(best, connectedFinisherCount(session, state, teamId, winThreshold) / required);
  }
  return Math.min(1, best);
}

/** Exhaustion winner: most connected finishers, then earliest finish order. */
export function raceWinnerOnExhaustion(
  state: BrainRaceState,
  session: GameSession,
  winThreshold: number,
): TeamId | 'draw' {
  const counts = Object.fromEntries(
    TEAM_IDS.map((teamId) => [
      teamId,
      connectedFinisherCount(session, state, teamId, winThreshold),
    ]),
  ) as Record<TeamId, number>;

  if (counts.blue > counts.red) return 'blue';
  if (counts.red > counts.blue) return 'red';
  if (counts.blue === 0 && counts.red === 0) return 'draw';

  const firstBlue = state.finishOrder.find((entry) => entry.teamId === 'blue');
  const firstRed = state.finishOrder.find((entry) => entry.teamId === 'red');
  if (firstBlue && !firstRed) return 'blue';
  if (firstRed && !firstBlue) return 'red';
  if (firstBlue && firstRed) {
    return state.finishOrder.indexOf(firstBlue) < state.finishOrder.indexOf(firstRed)
      ? 'blue'
      : 'red';
  }

  const bestBlue = bestConnectedProgress(session, state, 'blue');
  const bestRed = bestConnectedProgress(session, state, 'red');
  if (bestBlue > bestRed) return 'blue';
  if (bestRed > bestBlue) return 'red';
  return 'draw';
}

function bestConnectedProgress(
  session: GameSession,
  state: BrainRaceState,
  teamId: TeamId,
): number {
  let best = 0;
  for (const playerId of session.teams[teamId].playerIds) {
    const player = session.players[playerId];
    if (!player?.connected) continue;
    best = Math.max(best, playerProgress(state, playerId));
  }
  return best;
}

/** Racers sorted by progress descending, then roster order, for overtakes. */
export function racersByProgress(
  session: GameSession,
  state: BrainRaceState,
): { playerId: PlayerId; teamId: TeamId; progress: number }[] {
  const rows: { playerId: PlayerId; teamId: TeamId; progress: number; order: number }[] = [];
  for (const teamId of TEAM_IDS) {
    session.teams[teamId].playerIds.forEach((playerId, index) => {
      if (!session.players[playerId]) return;
      rows.push({
        playerId,
        teamId,
        progress: playerProgress(state, playerId),
        order: index,
      });
    });
  }
  return rows
    .sort((a, b) => b.progress - a.progress || a.order - b.order)
    .map(({ playerId, teamId, progress }) => ({ playerId, teamId, progress }));
}
