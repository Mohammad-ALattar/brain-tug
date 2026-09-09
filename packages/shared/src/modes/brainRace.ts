import {
  DEFAULT_TRACK_METRES,
  advanceLane,
  raceWinnerByFinishers,
  raceWinnerOnExhaustion,
  recordPlayerFinish,
  teamFinisherFraction,
} from '../rules/track.js';
import type { GameSession } from '../domain/session.js';
import type { PlayerId } from '../domain/ids.js';
import type { TeamId } from '../domain/team.js';
import { expectModeState, type GameMode } from './types.js';

/**
 * Every seated student has their own racer. Correct answers move only that
 * student's lane forward; the team wins once enough connected racers finish.
 */
export const brainRace: GameMode = {
  id: 'brain_race',
  label: 'Brain Race',
  blurb: 'Every student races to the finish. The first team with enough finishers wins.',

  questionAssignment: 'shared',
  locksTeamOnCorrect: false,

  createState(setup) {
    return {
      kind: 'brain_race',
      progress: {},
      trackMetres: setup.trackMetres ?? DEFAULT_TRACK_METRES,
      finishersRequiredPerTeam: 1,
      finishOrder: [],
    };
  },

  applyGain(state, target, gain) {
    const race = expectModeState(state, 'brain_race');
    const current = race.progress[target.playerId] ?? 0;
    return {
      ...race,
      progress: {
        ...race.progress,
        [target.playerId]: advanceLane(current, gain),
      },
    };
  },

  victor(state, rules, session) {
    return raceWinnerByFinishers(expectModeState(state, 'brain_race'), session, rules.winThreshold);
  },

  winnerOnExhaustion(state, session) {
    return raceWinnerOnExhaustion(
      expectModeState(state, 'brain_race'),
      session,
      session.rules.winThreshold,
    );
  },

  progressFraction(state) {
    const race = expectModeState(state, 'brain_race');
    const required = Math.max(1, race.finishersRequiredPerTeam);
    const countFor = (teamId: TeamId) =>
      race.finishOrder.filter((entry) => entry.teamId === teamId).length;
    return {
      blue: Math.min(1, countFor('blue') / required),
      red: Math.min(1, countFor('red') / required),
    };
  },
};

export function brainRaceProgressFraction(
  session: GameSession,
  state: ReturnType<typeof expectModeState<'brain_race'>>,
): Record<TeamId, number> {
  const threshold = session.rules.winThreshold;
  return {
    blue: teamFinisherFraction(session, state, 'blue', threshold),
    red: teamFinisherFraction(session, state, 'red', threshold),
  };
}

export function finalizeBrainRaceGain(
  session: GameSession,
  state: ReturnType<typeof expectModeState<'brain_race'>>,
  playerId: PlayerId,
  teamId: TeamId,
): ReturnType<typeof expectModeState<'brain_race'>> {
  return recordPlayerFinish(state, playerId, teamId, session.rules.winThreshold);
}
