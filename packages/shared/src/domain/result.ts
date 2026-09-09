import { GAME_MODE } from '../modes/registry.js';
import type { GameModeId, ModeState } from '../modes/types.js';
import { expectModeState } from '../modes/types.js';
import type { GameId, PlayerId, RoomCode } from './ids.js';
import type { GameSession } from './session.js';
import type { TeamId } from './team.js';

export type PlayerResult = {
  playerId: PlayerId;
  name: string;
  teamId: TeamId;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  contribution: number;
  fastestCorrectMs: number | null;
};

export type TeamResult = {
  teamId: TeamId;
  name: string;
  score: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  bestStreak: number;
  totalGain: number;
};

/** Immutable summary produced once, when the game finishes. */
export type GameResult = {
  gameId: GameId;
  roomCode: RoomCode;
  mode: GameModeId;
  winner: TeamId | 'draw' | null;
  /** Why the game ended, which the victory screen words differently. */
  reason: 'target_reached' | 'questions_exhausted' | 'ended_by_host';
  /** The mode's own final snapshot, so results UI does not need a live session. */
  finalModeState: ModeState;
  questionsPlayed: number;
  totalQuestions: number;
  durationMs: number;
  teams: Record<TeamId, TeamResult>;
  players: PlayerResult[];
  /** Highest contributor across both teams, for the results screen callout. */
  topPlayerId: PlayerId | null;
  /** Brain Race finish order, earliest first. */
  finishOrder: Array<{ playerId: PlayerId; name: string; teamId: TeamId }>;
};

function accuracy(correct: number, incorrect: number): number {
  const total = correct + incorrect;
  return total === 0 ? 0 : correct / total;
}

export function buildGameResult(
  session: GameSession,
  reason: GameResult['reason'],
  now: number,
): GameResult {
  const players: PlayerResult[] = Object.values(session.players).map((player) => ({
    playerId: player.id,
    name: player.name,
    teamId: player.teamId,
    correctCount: player.correctCount,
    incorrectCount: player.incorrectCount,
    accuracy: accuracy(player.correctCount, player.incorrectCount),
    contribution: player.contribution,
    fastestCorrectMs: player.fastestCorrectMs,
  }));

  const teamResult = (teamId: TeamId): TeamResult => {
    const team = session.teams[teamId];
    return {
      teamId,
      name: team.name,
      score: team.score,
      correctCount: team.correctCount,
      incorrectCount: team.incorrectCount,
      accuracy: accuracy(team.correctCount, team.incorrectCount),
      bestStreak: team.bestStreak,
      totalGain: team.totalGain,
    };
  };

  const ranked = [...players].sort(
    (a, b) => b.contribution - a.contribution || b.correctCount - a.correctCount,
  );
  const top = ranked[0];

  const finishOrder =
    session.config.mode === 'brain_race' && session.modeState.kind === 'brain_race'
      ? session.modeState.finishOrder.map((entry) => ({
          playerId: entry.playerId,
          name: session.players[entry.playerId]?.name ?? 'Player',
          teamId: entry.teamId,
        }))
      : [];

  return {
    gameId: session.gameId,
    roomCode: session.roomCode,
    mode: session.config.mode,
    winner: session.winner,
    reason,
    finalModeState: session.modeState,
    // `currentQuestionIndex` is zero-based and points at the last round played.
    questionsPlayed: session.startedAt === null ? 0 : session.currentQuestionIndex + 1,
    totalQuestions: session.totalQuestions,
    durationMs: session.startedAt === null ? 0 : now - session.startedAt,
    teams: { blue: teamResult('blue'), red: teamResult('red') },
    players,
    topPlayerId: top && top.contribution > 0 ? top.playerId : null,
    finishOrder,
  };
}

/** Finishers recorded per team at the end of a Brain Race. */
export function resultTeamFinishers(
  result: GameResult,
  teamId: TeamId,
): { finished: number; required: number } {
  if (result.mode !== 'brain_race' || result.finalModeState.kind !== 'brain_race') {
    return { finished: 0, required: 0 };
  }
  const race = expectModeState(result.finalModeState, 'brain_race');
  return {
    finished: race.finishOrder.filter((entry) => entry.teamId === teamId).length,
    required: race.finishersRequiredPerTeam,
  };
}

/** Progress 0..1 per team, derived from the finished result's mode snapshot. */
export function resultProgress(result: GameResult): Record<TeamId, number> {
  return GAME_MODE[result.mode].progressFraction(result.finalModeState);
}
