import { defaultIdFactory, type IdFactory, type PlayerId, type PlayerToken } from '../domain/ids.js';
import { createPlayer, sanitisePlayerName } from '../domain/player.js';
import type { GameSession } from '../domain/session.js';
import { toPublicPlayer } from '../domain/session.js';
import { TEAM_IDS, type TeamId } from '../domain/team.js';
import {
  addBrainRaceRosterEntry,
  removeBrainRaceRosterEntry,
} from './brainRaceRoster.js';
import { ok, reject, type EngineEvent, type EngineOutcome } from './types.js';

/** Guard against a runaway room; a classroom is far below this. */
export const MAX_PLAYERS_PER_GAME = 80;

export type JoinGameOptions = {
  name: string;
  /** Omitted means "put me wherever balances the teams". */
  teamId?: TeamId;
  ids?: IdFactory;
  now: number;
};

export type JoinGameResult = {
  playerId: PlayerId;
  playerToken: PlayerToken;
  teamId: TeamId;
};

/** The team with fewer connected players; blue breaks the tie. */
export function balancedTeam(session: GameSession): TeamId {
  const counts = TEAM_IDS.map((teamId) => ({
    teamId,
    count: session.teams[teamId].playerIds.filter((id) => session.players[id]?.connected).length,
  }));
  const [first, second] = counts;
  if (!first || !second) return 'blue';
  return first.count <= second.count ? first.teamId : second.teamId;
}

/**
 * Seats a new player. Joining mid-game is allowed so a late arrival is not shut
 * out, but they cannot answer the round already in flight: `startRound` is what
 * grants attempts, and the current round's attempt list does not include them.
 */
export function joinGame(
  session: GameSession,
  options: JoinGameOptions,
): EngineOutcome & { joined?: JoinGameResult } {
  if (session.status === 'finished') {
    return reject('game_not_active', 'This game has already finished.');
  }
  if (session.config.mode === 'brain_race' && session.status !== 'lobby') {
    return reject('game_in_progress', 'This race has already started. Wait for the next match.');
  }
  if (Object.keys(session.players).length >= MAX_PLAYERS_PER_GAME) {
    return reject('game_full', 'This game is full.');
  }

  const name = sanitisePlayerName(options.name);
  if (name.length === 0) {
    return reject('invalid_config', 'Please enter a name.');
  }

  const ids = options.ids ?? defaultIdFactory;
  const teamId = options.teamId ?? balancedTeam(session);
  const playerId = ids.playerId();
  const playerToken = ids.playerToken();
  const player = createPlayer(playerId, name, teamId, options.now);

  let next: GameSession = {
    ...session,
    players: { ...session.players, [playerId]: player },
    playerTokens: { ...session.playerTokens, [playerToken]: playerId },
    teams: {
      ...session.teams,
      [teamId]: {
        ...session.teams[teamId],
        playerIds: [...session.teams[teamId].playerIds, playerId],
      },
    },
  };
  next = addBrainRaceRosterEntry(next, playerId);

  const events: EngineEvent[] = [
    { type: 'player_joined', player: toPublicPlayer(player) },
    { type: 'team_joined', playerId, teamId },
  ];

  return { ...ok(next, events), joined: { playerId, playerToken, teamId } };
}

/** Resolves a token to its player, or null when the token is unknown. */
export function playerIdForToken(session: GameSession, token: PlayerToken): PlayerId | null {
  return session.playerTokens[token] ?? null;
}

/**
 * Restores a seat after a dropped socket. The player keeps their stats and, if
 * they already used their attempt this round, they stay locked out of it.
 */
export function reconnectPlayer(session: GameSession, playerId: PlayerId): EngineOutcome {
  const player = session.players[playerId];
  if (!player) return reject('not_a_player', 'You are not in this game.');
  if (player.connected) return ok(session);

  const next: GameSession = {
    ...session,
    players: {
      ...session.players,
      [playerId]: { ...player, connected: true, disconnectedAt: null },
    },
  };

  return ok(next, [{ type: 'player_reconnected', playerId }]);
}

/**
 * Marks a player disconnected without removing them, so a phone that locked its
 * screen can come back to the same seat and the same lockout state.
 */
export function disconnectPlayer(
  session: GameSession,
  playerId: PlayerId,
  now: number,
): EngineOutcome {
  const player = session.players[playerId];
  if (!player || !player.connected) return ok(session);

  const next: GameSession = {
    ...session,
    players: {
      ...session.players,
      [playerId]: { ...player, connected: false, disconnectedAt: now },
    },
  };

  return ok(next, [{ type: 'player_left', playerId, teamId: player.teamId }]);
}

/** Permanently removes a player, used by the host and by lobby departures. */
export function removePlayer(session: GameSession, playerId: PlayerId): EngineOutcome {
  const player = session.players[playerId];
  if (!player) return reject('not_a_player', 'That player is not in this game.');

  const players = { ...session.players };
  delete players[playerId];

  const playerTokens = { ...session.playerTokens };
  for (const [token, id] of Object.entries(playerTokens)) {
    if (id === playerId) delete playerTokens[token as PlayerToken];
  }

  let next: GameSession = {
    ...session,
    players,
    playerTokens,
    teams: {
      ...session.teams,
      [player.teamId]: {
        ...session.teams[player.teamId],
        playerIds: session.teams[player.teamId].playerIds.filter((id) => id !== playerId),
      },
    },
  };
  next = removeBrainRaceRosterEntry(next, playerId);

  return ok(next, [{ type: 'player_left', playerId, teamId: player.teamId }]);
}

/**
 * Moves a player between teams. Only allowed in the lobby, because switching
 * mid-round would let a player claim a second attempt on the other side.
 */
export function switchTeam(
  session: GameSession,
  playerId: PlayerId,
  teamId: TeamId,
): EngineOutcome {
  const player = session.players[playerId];
  if (!player) return reject('not_a_player', 'You are not in this game.');
  if (session.status !== 'lobby') {
    return reject('already_started', 'Teams are locked once the game starts.');
  }
  if (player.teamId === teamId) return ok(session);

  const next: GameSession = {
    ...session,
    players: { ...session.players, [playerId]: { ...player, teamId } },
    teams: {
      ...session.teams,
      [player.teamId]: {
        ...session.teams[player.teamId],
        playerIds: session.teams[player.teamId].playerIds.filter((id) => id !== playerId),
      },
      [teamId]: {
        ...session.teams[teamId],
        playerIds: [...session.teams[teamId].playerIds, playerId],
      },
    },
  };

  return ok(next, [{ type: 'team_joined', playerId, teamId }]);
}
