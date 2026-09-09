import {
  submitAnswer,
  toGameStateView,
  type GameSession,
  type GameStateView,
  type PlayerId,
  type PublicPlayer,
  type TeamId,
} from '@braintug/shared';
import {
  correctAnswerFor,
  questionIdFor,
  scriptedProvider,
  setupGame,
  T0,
} from '@braintug/shared/testing';
import { useGameStore } from '../store/gameStore';

export type FixtureOptions = {
  playersPerTeam?: number;
  totalQuestions?: number;
  /** Teams that should have already locked in a correct answer. */
  lockedTeams?: TeamId[];
  /** Players who should have already spent a wrong attempt, as `[team, index]`. */
  wrongAttempts?: [TeamId, number][];
  ropePosition?: number;
  /** Leave the game in `lobby`, before the host has pressed start. */
  stayInLobby?: boolean;
};

/**
 * Builds a realistic session by driving the real engine, so component tests
 * assert against the same shape the server actually produces rather than a
 * hand-written stub that could drift from it.
 */
export function makeSession(options: FixtureOptions = {}): GameSession {
  const { session } = setupGame({
    playersPerTeam: options.playersPerTeam ?? 2,
    totalQuestions: options.totalQuestions ?? 20,
    stayInLobby: options.stayInLobby ?? false,
    // Distinct problems per team, mirroring the reference's `2 x 10` vs `9 x 10`.
    provider: scriptedProvider([
      { left: 2, right: 10, answer: 20 },
      { left: 9, right: 10, answer: 90 },
      { left: 3, right: 7, answer: 21 },
      { left: 6, right: 8, answer: 48 },
    ]),
  });

  let current = session;

  for (const [teamId, index] of options.wrongAttempts ?? []) {
    current = submitAnswer(current, {
      playerId: current.teams[teamId].playerIds[index]!,
      questionId: questionIdFor(current, teamId),
      // Guaranteed wrong: the scripted answers are all products of the operands.
      value: correctAnswerFor(current, teamId) + 1,
      now: T0 + 1000,
    }).session;
  }

  for (const teamId of options.lockedTeams ?? []) {
    current = submitAnswer(current, {
      playerId: current.teams[teamId].playerIds[0]!,
      questionId: questionIdFor(current, teamId),
      value: correctAnswerFor(current, teamId),
      now: T0 + 2000,
    }).session;
  }

  if (options.ropePosition !== undefined) {
    current = { ...current, ropePosition: options.ropePosition };
  }

  return current;
}

/** The broadcast projection of `makeSession`, which is what components consume. */
export function makeState(options: FixtureOptions = {}): GameStateView {
  return toGameStateView(makeSession(options));
}

/**
 * Seeds the store as if a `game_state_updated` had just arrived. Pass `me` to
 * stand in for a joined student, which is what the controller keys its lockout
 * and feedback off.
 */
export function seedStore(
  state: GameStateView,
  me: { playerId: PlayerId; teamId: TeamId } | null = null,
): void {
  useGameStore.setState({
    state,
    result: null,
    connection: 'connected',
    error: null,
    drafts: { blue: '', red: '' },
    lastPull: null,
    lastResolution: null,
    me,
    myOutcome: null,
  });
}

/** The nth player on a team, for standing in as "this client". */
export function playerOn(state: GameStateView, teamId: TeamId, index = 0): PublicPlayer {
  const player = state.players.filter((p) => p.teamId === teamId)[index];
  if (!player) throw new Error(`No player ${index} on team ${teamId}`);
  return player;
}

export function resetStore(): void {
  useGameStore.getState().reset();
  useGameStore.setState({ connection: 'connected' });
}
