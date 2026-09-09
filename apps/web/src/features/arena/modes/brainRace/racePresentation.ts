import type { BrainRaceState, PlayerId } from '@braintug/shared';
import { playerProgress } from '@braintug/shared';

import type { RacePlayerSlot } from './raceMotion';

/** Lane height by roster size so 5v5 still leaves room for the question row. */
export function laneHeightPx(racerCount: number): number {
  if (racerCount <= 4) return 72;
  if (racerCount <= 8) return 56;
  return 48;
}

/** Token diameter and label size for a lane height tier. */
export function racerTokenSize(laneHeight: number): { px: number; textClass: string } {
  if (laneHeight >= 72) return { px: 48, textClass: 'text-lg' };
  if (laneHeight >= 56) return { px: 40, textClass: 'text-base' };
  return { px: 32, textClass: 'text-sm' };
}

/** Two-character initials for a racer token. */
export function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Player ids tied for the furthest individual progress (empty when everyone is at 0). */
export function raceLeaderIds(
  slots: RacePlayerSlot[],
  race: BrainRaceState,
): ReadonlySet<PlayerId> {
  let max = 0;
  const leaders: PlayerId[] = [];

  for (const slot of slots) {
    const progress = playerProgress(race, slot.playerId);
    if (progress > max) {
      max = progress;
      leaders.length = 0;
      leaders.push(slot.playerId);
    } else if (progress === max && max > 0) {
      leaders.push(slot.playerId);
    }
  }

  return new Set(leaders);
}

/**
 * True when a fresh gain moved this player past at least one other racer.
 * Uses normalized progress before/after the gain event.
 */
export function didOvertakeOnGain(input: {
  playerId: PlayerId;
  gain: number;
  race: BrainRaceState;
  slots: RacePlayerSlot[];
}): boolean {
  const newProgress = playerProgress(input.race, input.playerId);
  const oldProgress = newProgress - input.gain;
  if (input.gain <= 0) return false;

  for (const slot of input.slots) {
    if (slot.playerId === input.playerId) continue;
    const other = playerProgress(input.race, slot.playerId);
    if (other > oldProgress && other <= newProgress) return true;
  }

  return false;
}
