import type { PlayerId } from './ids.js';
import type { TeamId } from './team.js';

export type Player = {
  id: PlayerId;
  name: string;
  teamId: TeamId;
  /** False while the socket is gone; the player keeps their seat and stats. */
  connected: boolean;
  /** Set when the player last disconnected, used to reap abandoned seats. */
  disconnectedAt: number | null;
  joinedAt: number;
  correctCount: number;
  incorrectCount: number;
  /** Sum of rope distance this player personally won for their team. */
  contributedPull: number;
  /** Fastest correct answer in milliseconds, or null if never correct. */
  fastestCorrectMs: number | null;
};

export function createPlayer(
  id: PlayerId,
  name: string,
  teamId: TeamId,
  now: number,
): Player {
  return {
    id,
    name,
    teamId,
    connected: true,
    disconnectedAt: null,
    joinedAt: now,
    correctCount: 0,
    incorrectCount: 0,
    contributedPull: 0,
    fastestCorrectMs: null,
  };
}

/** Trims and clamps a student-supplied display name. */
export function sanitisePlayerName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 20);
}
