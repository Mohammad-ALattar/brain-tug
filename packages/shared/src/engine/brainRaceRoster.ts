import type { PlayerId } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import { TEAM_IDS, type TeamId } from '../domain/team.js';
import { expectModeState } from '../modes/types.js';
import { defaultFinishersRequired } from '../rules/track.js';

function connectedCount(session: GameSession, teamId: TeamId): number {
  return session.teams[teamId].playerIds.filter((id) => session.players[id]?.connected).length;
}

/** Adds a lobby racer slot when a student joins before the race starts. */
export function addBrainRaceRosterEntry(session: GameSession, playerId: PlayerId): GameSession {
  if (session.config.mode !== 'brain_race' || session.status !== 'lobby') return session;
  const race = expectModeState(session.modeState, 'brain_race');
  if (race.progress[playerId] !== undefined) return session;
  return {
    ...session,
    modeState: {
      ...race,
      progress: { ...race.progress, [playerId]: 0 },
    },
  };
}

/** Removes a lobby racer slot when a student leaves before the race starts. */
export function removeBrainRaceRosterEntry(session: GameSession, playerId: PlayerId): GameSession {
  if (session.config.mode !== 'brain_race' || session.status !== 'lobby') return session;
  const race = expectModeState(session.modeState, 'brain_race');
  if (race.progress[playerId] === undefined) return session;
  const progress = { ...race.progress };
  delete progress[playerId];
  return {
    ...session,
    modeState: {
      ...race,
      progress,
      finishOrder: race.finishOrder.filter((entry) => entry.playerId !== playerId),
    },
  };
}

/** Locks the roster and resolves the finisher quota when the host starts the race. */
export function prepareBrainRaceAtStart(session: GameSession): GameSession {
  if (session.config.mode !== 'brain_race') return session;
  const race = expectModeState(session.modeState, 'brain_race');
  const progress: Record<PlayerId, number> = {};
  for (const player of Object.values(session.players)) {
    progress[player.id] = race.progress[player.id] ?? 0;
  }

  const configured = session.config.finishersRequiredPerTeam;
  const finishersRequired =
    configured ?? defaultFinishersRequired(connectedCount(session, 'blue'), connectedCount(session, 'red'));

  return {
    ...session,
    modeState: {
      ...race,
      progress,
      finishersRequiredPerTeam: Math.max(1, finishersRequired),
      finishOrder: [],
    },
  };
}

export function maxFinishersRequired(session: GameSession): number {
  return Math.max(1, ...TEAM_IDS.map((teamId) => connectedCount(session, teamId)));
}
