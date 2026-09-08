import type { AnswerOutcome, RejectionReason } from '../domain/answer.js';
import type { AnswerDraft, PublicRound } from '../domain/game.js';
import type { PlayerId } from '../domain/ids.js';
import type { PublicPlayer, GameSession } from '../domain/session.js';
import type { GameResult } from '../domain/result.js';
import type { TeamId } from '../domain/team.js';

/**
 * Why a round ended. `victory` means a pull reached the win threshold;
 * `all_attempted` means nobody left on either team can still answer.
 */
export type RoundResolution =
  | 'both_locked'
  | 'all_attempted'
  | 'timeout'
  | 'skipped'
  | 'victory';

/**
 * What the engine reports happened. The server maps these onto socket events and
 * decides the audience for each; the engine has no opinion about transport.
 */
export type EngineEvent =
  | { type: 'player_joined'; player: PublicPlayer }
  | { type: 'player_left'; playerId: PlayerId; teamId: TeamId }
  | { type: 'player_reconnected'; playerId: PlayerId }
  | { type: 'team_joined'; playerId: PlayerId; teamId: TeamId }
  | { type: 'countdown_started'; endsAt: number }
  | { type: 'game_started'; startedAt: number }
  | { type: 'question_started'; round: PublicRound }
  | { type: 'answer_result'; playerId: PlayerId; teamId: TeamId; outcome: AnswerOutcome }
  | {
      type: 'pull_applied';
      teamId: TeamId;
      playerId: PlayerId;
      pull: number;
      ropePosition: number;
      streak: number;
      /**
       * The team's score after this pull. Included so the arena can update the
       * header from this event alone, without a full state broadcast per answer.
       */
      score: number;
    }
  | { type: 'draft_updated'; teamId: TeamId; draft: AnswerDraft }
  | {
      type: 'round_resolved';
      index: number;
      reason: RoundResolution;
      nextRoundAt: number | null;
    }
  | { type: 'game_paused'; remainingMs: number }
  | { type: 'game_resumed'; endsAt: number }
  | { type: 'game_finished'; result: GameResult }
  /** State changed in a way clients must re-read but that has no richer event. */
  | { type: 'state_changed' };

/** Every reducer returns the next session plus what observers should be told. */
export type EngineResult = {
  session: GameSession;
  events: EngineEvent[];
};

/**
 * A refused command. Reducers never throw for expected refusals, so the server
 * can turn them into a targeted `answer_result`/error without a try/catch.
 */
export type EngineRejection = {
  ok: false;
  reason: RejectionReason | 'not_host' | 'game_full' | 'already_started' | 'invalid_config';
  message: string;
};

export type EngineOutcome = ({ ok: true } & EngineResult) | EngineRejection;

export function ok(session: GameSession, events: EngineEvent[] = []): { ok: true } & EngineResult {
  return { ok: true, session, events };
}

export function reject(
  reason: EngineRejection['reason'],
  message: string,
): EngineRejection {
  return { ok: false, reason, message };
}
