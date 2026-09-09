import type { GameId, TeamId } from '@braintug/shared';

/**
 * Room naming. Every broadcast targets one of these rather than the whole
 * server, which is how the fan-out stays scoped and how team-private data (a
 * draft, an answer outcome) is kept away from the opposing team.
 */
export const rooms = {
  /** Everyone attached to a game: host, all players, all displays. */
  game: (gameId: GameId) => `game:${gameId}`,
  /** Only the classroom displays. Receives mirrored keypad drafts. */
  arena: (gameId: GameId) => `game:${gameId}:arena`,
  /** Only the host sockets. Receives roster and control confirmations. */
  host: (gameId: GameId) => `game:${gameId}:host`,
  /** One team's players. Never receives the other team's question or draft. */
  team: (gameId: GameId, teamId: TeamId) => `game:${gameId}:team:${teamId}`,
  /** All player sockets, regardless of team. */
  players: (gameId: GameId) => `game:${gameId}:players`,
} as const;
