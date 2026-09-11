import type { PlayerId } from './ids.js';

/**
 * Exactly two teams, fixed at compile time. `blue` pulls the rope negative and
 * `red` pulls it positive, matching the reference layout (blue left, red right).
 */
export const TEAM_IDS = ['blue', 'red'] as const;
export type TeamId = (typeof TEAM_IDS)[number];

export const OPPOSING_TEAM: Record<TeamId, TeamId> = {
  blue: 'red',
  red: 'blue',
};

/** Sign each team applies to `ropePosition`. Blue pulls left, red pulls right. */
export const TEAM_PULL_SIGN: Record<TeamId, -1 | 1> = {
  blue: -1,
  red: 1,
};

export type Team = {
  id: TeamId;
  name: string;
  /** One point per correct answer. Shown as `SCORE 4` in the reference header. */
  score: number;
  /** Consecutive correct answers by this team; resets on a wrong answer. */
  streak: number;
  /** Highest streak reached, kept for the results screen. */
  bestStreak: number;
  /** Total correct answers across the game. */
  correctCount: number;
  /** Total incorrect submissions across the game. */
  incorrectCount: number;
  /** Cumulative progress this team has won, in normalised units. */
  totalGain: number;
  playerIds: PlayerId[];
};

export function createTeam(id: TeamId, name: string): Team {
  return {
    id,
    name,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    incorrectCount: 0,
    totalGain: 0,
    playerIds: [],
  };
}

import type { GameLanguage } from '../content/language.js';

export const DEFAULT_TEAM_NAMES: Record<TeamId, string> = {
  blue: 'Blue Tigers',
  red: 'Red Dragons',
};

const DEFAULT_TEAM_NAMES_AR: Record<TeamId, string> = {
  blue: 'نمور زرقاء',
  red: 'تنانين حمراء',
};

export function defaultTeamNames(language: GameLanguage): Record<TeamId, string> {
  return language === 'ar' ? DEFAULT_TEAM_NAMES_AR : DEFAULT_TEAM_NAMES;
}
