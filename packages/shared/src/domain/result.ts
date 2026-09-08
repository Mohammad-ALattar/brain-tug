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
  contributedPull: number;
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
  totalPull: number;
};

/** Immutable summary produced once, when the game finishes. */
export type GameResult = {
  gameId: GameId;
  roomCode: RoomCode;
  winner: TeamId | 'draw' | null;
  /** Why the game ended, which the victory screen words differently. */
  reason: 'rope_victory' | 'questions_exhausted' | 'ended_by_host';
  finalRopePosition: number;
  questionsPlayed: number;
  totalQuestions: number;
  durationMs: number;
  teams: Record<TeamId, TeamResult>;
  players: PlayerResult[];
  /** Highest contributor across both teams, for the results screen callout. */
  topPlayerId: PlayerId | null;
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
    contributedPull: player.contributedPull,
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
      totalPull: team.totalPull,
    };
  };

  const ranked = [...players].sort(
    (a, b) => b.contributedPull - a.contributedPull || b.correctCount - a.correctCount,
  );
  const top = ranked[0];

  return {
    gameId: session.gameId,
    roomCode: session.roomCode,
    winner: session.winner,
    reason,
    finalRopePosition: session.ropePosition,
    // `currentQuestionIndex` is zero-based and points at the last round played.
    questionsPlayed: session.startedAt === null ? 0 : session.currentQuestionIndex + 1,
    totalQuestions: session.totalQuestions,
    durationMs: session.startedAt === null ? 0 : now - session.startedAt,
    teams: { blue: teamResult('blue'), red: teamResult('red') },
    players,
    topPlayerId: top && top.contributedPull > 0 ? top.playerId : null,
  };
}
