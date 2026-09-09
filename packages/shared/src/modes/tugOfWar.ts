import { applyPull, DEFAULT_ARENA_HALF_METRES, ropeWinner } from '../rules/rope.js';
import { expectModeState, type GameMode } from './types.js';

/**
 * Two teams pull one rope. A correct answer drags it towards the answering
 * team, and the first side to drag it past the threshold wins.
 */
export const tugOfWar: GameMode = {
  id: 'tug_of_war',
  label: 'Tug of War',
  blurb: 'Two teams, one rope. Correct answers drag it towards your side.',

  questionAssignment: 'per_team',
  locksTeamOnCorrect: true,

  createState(setup) {
    return {
      kind: 'tug_of_war',
      ropePosition: 0,
      arenaHalfMetres: setup.arenaHalfMetres ?? DEFAULT_ARENA_HALF_METRES,
    };
  },

  applyGain(state, target, gain) {
    const rope = expectModeState(state, 'tug_of_war');
    return { ...rope, ropePosition: applyPull(rope.ropePosition, target.teamId, gain) };
  },

  victor(state, rules, _session) {
    return ropeWinner(rules, expectModeState(state, 'tug_of_war').ropePosition);
  },

  winnerOnExhaustion(state, _session) {
    const { ropePosition } = expectModeState(state, 'tug_of_war');
    if (ropePosition < 0) return 'blue';
    if (ropePosition > 0) return 'red';
    return 'draw';
  },

  progressFraction(state) {
    const { ropePosition } = expectModeState(state, 'tug_of_war');
    const toward = (teamId: 'blue' | 'red'): number =>
      teamId === 'blue' ? Math.max(0, -ropePosition) : Math.max(0, ropePosition);
    return { blue: toward('blue'), red: toward('red') };
  },
};
