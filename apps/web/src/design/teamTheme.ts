import type { TeamId } from '@mtow/shared';

/**
 * One place for every team-coloured class, so components read
 * `theme.solid` instead of branching on `teamId` inline. Tailwind needs literal
 * class strings, which is why these are spelled out rather than interpolated.
 */
export type TeamTheme = {
  /** Saturated fill for headers and badges. */
  solid: string;
  /** Pale tint for panel backgrounds and field halves. */
  tint: string;
  /** Border colour matching the tint. */
  border: string;
  /** Text colour on a pale background. */
  text: string;
  /** Strong text colour for headings. */
  textStrong: string;
  /** Ring colour for focus and emphasis. */
  ring: string;
  chip: 'blue' | 'red';
  /** Side of the arena this team pulls toward. */
  side: 'left' | 'right';
};

export const TEAM_THEME: Record<TeamId, TeamTheme> = {
  blue: {
    solid: 'bg-blueteam-600',
    tint: 'bg-blueteam-50',
    border: 'border-blueteam-200',
    text: 'text-blueteam-700',
    textStrong: 'text-blueteam-800',
    ring: 'ring-blueteam-300',
    chip: 'blue',
    side: 'left',
  },
  red: {
    solid: 'bg-redteam-600',
    tint: 'bg-redteam-50',
    border: 'border-redteam-200',
    text: 'text-redteam-700',
    textStrong: 'text-redteam-800',
    ring: 'ring-redteam-300',
    chip: 'red',
    side: 'right',
  },
};
