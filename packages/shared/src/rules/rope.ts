import { TEAM_PULL_SIGN, type TeamId } from '../domain/team.js';
import type { GameRules } from './rules.js';

/** Rope travel is normalised: -1 is a blue win, +1 is a red win, 0 is centre. */
export const ROPE_MIN = -1;
export const ROPE_MAX = 1;

export function clampRope(position: number): number {
  if (Number.isNaN(position)) return 0;
  return Math.min(ROPE_MAX, Math.max(ROPE_MIN, position));
}

/**
 * Applies a pull to the rope. `pull` is always a non-negative distance; the
 * direction comes from which team earned it.
 */
export function applyPull(position: number, teamId: TeamId, pull: number): number {
  const magnitude = Math.max(0, pull);
  return clampRope(position + TEAM_PULL_SIGN[teamId] * magnitude);
}

/** The team that has pulled the rope past the win threshold, if any. */
export function ropeWinner(rules: GameRules, position: number): TeamId | null {
  if (position <= -rules.winThreshold) return 'blue';
  if (position >= rules.winThreshold) return 'red';
  return null;
}

/** Which side the rope currently favours, for the `RED DRAGONS PULLING!` banner. */
export function leadingTeam(position: number): TeamId | null {
  if (position < 0) return 'blue';
  if (position > 0) return 'red';
  return null;
}

/** Rope offset in metres, as labelled `-4m / CENTER 0m / +4m` in the reference. */
export function ropeToMetres(rules: GameRules, position: number): number {
  return position * rules.arenaHalfMetres;
}

/**
 * Rope position as a 0..1 fraction across the arena, which is what the
 * presentation layer needs to place the rope marker.
 */
export function ropeToFraction(position: number): number {
  return (clampRope(position) + 1) / 2;
}

/**
 * How close the leader is to winning, 0..1. Drives escalating visual tension in
 * the arena without the UI needing to know the win threshold.
 */
export function ropeTension(rules: GameRules, position: number): number {
  if (rules.winThreshold <= 0) return 1;
  return Math.min(1, Math.abs(position) / rules.winThreshold);
}
