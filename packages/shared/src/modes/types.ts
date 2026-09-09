import type { QuestionAssignment } from '../content/dealer.js';
import type { PlayerId } from '../domain/ids.js';
import type { GameSession } from '../domain/session.js';
import type { TeamId } from '../domain/team.js';
import type { GameRules } from '../rules/rules.js';

export const GAME_MODES = ['tug_of_war', 'brain_race'] as const;
export type GameModeId = (typeof GAME_MODES)[number];

export type GainTarget = {
  teamId: TeamId;
  playerId: PlayerId;
};

/**
 * Tug of war measures one shared axis: the rope. Blue pulls it negative, red
 * pulls it positive, and the sides are in direct opposition.
 */
export type TugOfWarState = {
  kind: 'tug_of_war';
  /** Normalised to [-1, 1]. -1 is a blue win, +1 a red win, 0 the centre. */
  ropePosition: number;
  /** Half the arena width in metres, for the display's distance labels. */
  arenaHalfMetres: number;
};

/**
 * Brain Race tracks every seated student on their own lane. Teams still compete,
 * but progress lives on individual racers rather than a shared team lane.
 */
export type BrainRaceState = {
  kind: 'brain_race';
  /** Fraction of the track covered per player, each in [0, 1]. */
  progress: Record<PlayerId, number>;
  /** Track length in metres, for the display's distance labels. */
  trackMetres: number;
  /** Connected finishers a team needs to win. Resolved when the race starts. */
  finishersRequiredPerTeam: number;
  /** Players in the order they first crossed the finish line. */
  finishOrder: Array<{ playerId: PlayerId; teamId: TeamId }>;
};

/**
 * The mode-owned slice of a game's state. Every mode-specific number lives in
 * here, which is what keeps `GameSession` free of rope and race concepts.
 *
 * `kind` matches the mode's own id, so the state always identifies the mode
 * that can interpret it.
 */
export type ModeState = TugOfWarState | BrainRaceState;

export type ModeSetup = {
  rules: GameRules;
  /** Brain race track length in metres. Ignored by other modes. */
  trackMetres?: number;
  /** Tug of war arena half-width in metres. Ignored by other modes. */
  arenaHalfMetres?: number;
};

/**
 * What one game mode is.
 *
 * Deliberately small. Everything both games share -- lobby and countdown,
 * membership, one attempt per player per round, the streak and speed-bonus
 * formulas, timers, results -- stays in the engine. Only the genuine
 * differences appear here, and two of them are plain data rather than
 * behaviour, so the round reducer reads as a rule rather than a dispatch table.
 */
export type GameMode = {
  id: GameModeId;
  label: string;
  /** One sentence for the host's mode picker. */
  blurb: string;

  /** Whether a round issues one question to the class or one to each team. */
  questionAssignment: QuestionAssignment;

  /**
   * Whether the first correct answer closes its team out of the round.
   *
   * A tug of war locks: the team has landed its pull and the round moves on.
   * A race does not: every correct answer adds distance, so a bigger or faster
   * team genuinely pulls ahead.
   */
  locksTeamOnCorrect: boolean;

  createState(setup: ModeSetup): ModeState;

  /** Applies one correct answer's worth of progress. */
  applyGain(state: ModeState, target: GainTarget, gain: number): ModeState;

  /** The team that has already won, checked after every answer. */
  victor(state: ModeState, rules: GameRules, session: GameSession): TeamId | null;

  /** The winner when the question bank runs out or the host ends the match. */
  winnerOnExhaustion(state: ModeState, session: GameSession): TeamId | 'draw';

  /**
   * How far along each team is, 0..1. Lets generic UI and the results screen
   * show progress without knowing whether it is measuring a rope or a track.
   */
  progressFraction(state: ModeState): Record<TeamId, number>;
};

/**
 * Narrows mode state to the variant a mode owns.
 *
 * A mismatch is a programming error, not a runtime condition: `config.mode` and
 * `modeState.kind` are written together by `createGame` and never diverge. This
 * throws rather than returning a default so the bug surfaces where it is made.
 */
export function expectModeState<K extends ModeState['kind']>(
  state: ModeState,
  kind: K,
): Extract<ModeState, { kind: K }> {
  if (state.kind !== kind) {
    throw new Error(`Expected "${kind}" mode state, received "${state.kind}"`);
  }
  return state as Extract<ModeState, { kind: K }>;
}
