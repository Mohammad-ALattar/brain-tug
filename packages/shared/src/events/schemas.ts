import { z } from 'zod';
import { DIFFICULTIES } from '../content/question.js';
import { OPERATION_CHOICES } from '../content/math/operations.js';
import { SUBJECTS } from '../content/subject.js';
import { GAME_MODES } from '../modes/types.js';
import { TEAM_IDS } from '../domain/team.js';
import {
  MAX_COUNTDOWN_MS,
  MAX_SECONDS_PER_QUESTION,
  MAX_TOTAL_QUESTIONS,
  MIN_COUNTDOWN_MS,
  MIN_SECONDS_PER_QUESTION,
  MIN_TOTAL_QUESTIONS,
} from '../rules/rules.js';

/**
 * Every inbound payload is parsed with one of these before it reaches the
 * engine. The client is untrusted, so these schemas are the only doorway, and
 * they deliberately do not accept score, progress or any other authoritative
 * field even if a client sends one.
 */

const roomCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(12)
  .transform((value) => value.replace(/[\s-]/g, '').toUpperCase());

const idSchema = z.string().min(1).max(64);
const tokenSchema = z.string().min(8).max(128);
const teamIdSchema = z.enum(TEAM_IDS);

export const createGameSchema = z.object({
  mode: z.enum(GAME_MODES).default('tug_of_war'),
  subject: z.enum(SUBJECTS).default('math'),
  operation: z.enum(OPERATION_CHOICES).default('mixed'),
  difficulty: z.enum(DIFFICULTIES).default('easy'),
  totalQuestions: z.coerce
    .number()
    .int()
    .min(MIN_TOTAL_QUESTIONS)
    .max(MAX_TOTAL_QUESTIONS)
    .default(20),
  secondsPerQuestion: z.coerce
    .number()
    .int()
    .min(MIN_SECONDS_PER_QUESTION)
    .max(MAX_SECONDS_PER_QUESTION)
    .default(20),
  countdownMs: z.coerce
    .number()
    .int()
    .min(MIN_COUNTDOWN_MS)
    .max(MAX_COUNTDOWN_MS)
    .optional(),
  teamNames: z
    .object({
      blue: z.string().trim().max(24).optional(),
      red: z.string().trim().max(24).optional(),
    })
    .optional(),
  winThreshold: z.coerce.number().min(0.1).max(1).optional(),
  /** Brain Race track length in metres. Ignored by other modes. */
  trackMetres: z.coerce.number().int().min(100).max(10_000).optional(),
  /** Brain Race finishers required per team. Defaults from roster at start. */
  finishersRequiredPerTeam: z.coerce.number().int().min(1).max(40).optional(),
});

export const joinGameSchema = z.object({
  roomCode: roomCodeSchema,
  name: z.string().trim().min(1).max(20),
  /** Omitted asks the server to balance the teams. */
  teamId: teamIdSchema.optional(),
});

export const rejoinGameSchema = z.object({
  roomCode: roomCodeSchema,
  playerToken: tokenSchema,
});

/**
 * The host reclaiming their dashboard after a dropped socket. Distinct from
 * `watch_arena`, which also subscribes to the draft firehose the classroom
 * display needs and the dashboard does not.
 */
export const rejoinHostSchema = z.object({
  roomCode: roomCodeSchema,
  hostToken: tokenSchema,
});

export const watchArenaSchema = z.object({
  roomCode: roomCodeSchema,
  /** Supplying a host token upgrades the socket to host privileges. */
  hostToken: tokenSchema.optional(),
});

export const switchTeamSchema = z.object({
  teamId: teamIdSchema,
});

export const submitAnswerSchema = z.object({
  /** Which question the client believes it is answering. */
  questionId: idSchema,
  /** Raw input; parsed and validated server-side against the real answer. */
  value: z.union([z.string().max(64), z.number()]),
});

export const answerDraftSchema = z.object({
  questionId: idSchema,
  value: z.string().max(64),
});

export const hostActionSchema = z.object({
  hostToken: tokenSchema,
});

export const removePlayerSchema = z.object({
  hostToken: tokenSchema,
  playerId: idSchema,
});

/**
 * The host moving someone else's seat. Separate from `switch_team`, which a
 * player sends for themselves: that one derives the player from the socket, so
 * it can never be aimed at another child, while this one is host-only.
 */
export const movePlayerSchema = z.object({
  hostToken: tokenSchema,
  playerId: idSchema,
  teamId: teamIdSchema,
});

export const clockSyncSchema = z.object({
  /** The client's clock when it sent the ping, echoed back untouched. */
  clientSentAt: z.number(),
});

export type CreateGamePayload = z.infer<typeof createGameSchema>;
export type JoinGamePayload = z.infer<typeof joinGameSchema>;
export type RejoinGamePayload = z.infer<typeof rejoinGameSchema>;
export type RejoinHostPayload = z.infer<typeof rejoinHostSchema>;
export type WatchArenaPayload = z.infer<typeof watchArenaSchema>;
export type SwitchTeamPayload = z.infer<typeof switchTeamSchema>;
export type SubmitAnswerPayload = z.infer<typeof submitAnswerSchema>;
export type AnswerDraftPayload = z.infer<typeof answerDraftSchema>;
export type HostActionPayload = z.infer<typeof hostActionSchema>;
export type RemovePlayerPayload = z.infer<typeof removePlayerSchema>;
export type MovePlayerPayload = z.infer<typeof movePlayerSchema>;
export type ClockSyncPayload = z.infer<typeof clockSyncSchema>;
