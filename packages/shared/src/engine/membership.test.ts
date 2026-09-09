import { describe, expect, it } from 'vitest';
import { createSequentialIdFactory, type PlayerId, type PlayerToken } from '../domain/ids.js';
import { toGameStateView } from '../domain/session.js';
import { createGame } from './createGame.js';
import {
  MAX_PLAYERS_PER_GAME,
  balancedTeam,
  disconnectPlayer,
  joinGame,
  playerIdForToken,
  reconnectPlayer,
  removePlayer,
  switchTeam,
} from './membership.js';
import { endGame } from './lifecycle.js';
import { submitAnswer } from './submitAnswer.js';
import { T0, correctAnswerFor, questionIdFor, setupGame } from './testing.js';

const lobby = () => createGame({ totalQuestions: 5, ids: createSequentialIdFactory(), now: T0 });

describe('joinGame', () => {
  it('seats a player and issues them a private token', () => {
    const result = joinGame(lobby(), { name: 'Amina', teamId: 'blue', now: T0 });

    expect(result.ok).toBe(true);
    if (!result.ok || !result.joined) return;
    expect(result.joined.teamId).toBe('blue');
    expect(result.session.players[result.joined.playerId]!.name).toBe('Amina');
    expect(result.session.teams.blue.playerIds).toContain(result.joined.playerId);
    expect(playerIdForToken(result.session, result.joined.playerToken)).toBe(
      result.joined.playerId,
    );
  });

  it('balances teams when no side is requested', () => {
    let session = lobby();
    const assignments: string[] = [];

    for (let i = 0; i < 4; i += 1) {
      const result = joinGame(session, { name: `P${i}`, now: T0 });
      if (!result.ok || !result.joined) throw new Error('join failed');
      session = result.session;
      assignments.push(result.joined.teamId);
    }

    expect(assignments).toEqual(['blue', 'red', 'blue', 'red']);
    expect(session.teams.blue.playerIds).toHaveLength(2);
    expect(session.teams.red.playerIds).toHaveLength(2);
  });

  it('counts only connected players when balancing', () => {
    let session = lobby();
    const first = joinGame(session, { name: 'A', teamId: 'blue', now: T0 });
    if (!first.ok || !first.joined) throw new Error('join failed');
    session = first.session;

    const dropped = disconnectPlayer(session, first.joined.playerId, T0 + 10);
    if (!dropped.ok) throw new Error('disconnect failed');

    // Blue's only player is gone, so blue is still the emptier side.
    expect(balancedTeam(dropped.session)).toBe('blue');
  });

  it('trims and truncates a supplied name', () => {
    const result = joinGame(lobby(), { name: `  ${'x'.repeat(40)}  `, now: T0 });
    if (!result.ok || !result.joined) throw new Error('join failed');
    expect(result.session.players[result.joined.playerId]!.name).toHaveLength(20);
  });

  it('collapses internal whitespace in a name', () => {
    const result = joinGame(lobby(), { name: 'Ann   Marie', now: T0 });
    if (!result.ok || !result.joined) throw new Error('join failed');
    expect(result.session.players[result.joined.playerId]!.name).toBe('Ann Marie');
  });

  it('refuses a blank name', () => {
    const result = joinGame(lobby(), { name: '   ', now: T0 });
    expect(result.ok).toBe(false);
  });

  it('refuses to join a finished game', () => {
    const { session } = setupGame();
    const ended = endGame(session, T0 + 100);
    if (!ended.ok) throw new Error('end failed');

    const result = joinGame(ended.session, { name: 'Late', now: T0 + 200 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('game_not_active');
  });

  it('refuses to exceed the room cap', () => {
    let session = lobby();
    for (let i = 0; i < MAX_PLAYERS_PER_GAME; i += 1) {
      const result = joinGame(session, { name: `P${i}`, now: T0 });
      if (!result.ok) throw new Error(`join ${i} failed`);
      session = result.session;
    }

    const overflow = joinGame(session, { name: 'One too many', now: T0 });
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.reason).toBe('game_full');
  });

  it('gives each player a distinct token', () => {
    let session = lobby();
    const tokens = new Set<PlayerToken>();
    for (let i = 0; i < 6; i += 1) {
      const result = joinGame(session, { name: `P${i}`, now: T0 });
      if (!result.ok || !result.joined) throw new Error('join failed');
      session = result.session;
      tokens.add(result.joined.playerToken);
    }
    expect(tokens.size).toBe(6);
  });

  it('lets a late arrival join mid-game without an attempt at the live round', () => {
    const { session } = setupGame({ mode: 'tug_of_war', totalQuestions: 5 });
    const result = joinGame(session, { name: 'Late', teamId: 'blue', now: T0 + 5000 });
    if (!result.ok || !result.joined) throw new Error('join failed');

    expect(result.session.teams.blue.playerIds).toContain(result.joined.playerId);
    expect(result.session.round!.teams.blue.attemptedPlayerIds).toHaveLength(0);
  });

  it('refuses a late join once a brain race has started', () => {
    const { session } = setupGame({ mode: 'brain_race', totalQuestions: 5 });
    const result = joinGame(session, { name: 'Late', teamId: 'blue', now: T0 + 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('game_in_progress');
  });
});

describe('reconnect and disconnect', () => {
  it('keeps the seat and the stats when a socket drops', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;
    const scored = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue'),
      now: T0 + 1000,
    }).session;

    const dropped = disconnectPlayer(scored, blue, T0 + 2000);
    if (!dropped.ok) throw new Error('disconnect failed');

    expect(dropped.session.players[blue]!.connected).toBe(false);
    expect(dropped.session.players[blue]!.disconnectedAt).toBe(T0 + 2000);
    expect(dropped.session.players[blue]!.correctCount).toBe(1);
    expect(dropped.session.teams.blue.playerIds).toContain(blue);
  });

  it('restores the seat on reconnect', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;
    const dropped = disconnectPlayer(session, blue, T0 + 100);
    if (!dropped.ok) throw new Error('disconnect failed');

    const back = reconnectPlayer(dropped.session, blue);
    if (!back.ok) throw new Error('reconnect failed');

    expect(back.session.players[blue]!.connected).toBe(true);
    expect(back.session.players[blue]!.disconnectedAt).toBeNull();
    expect(back.events[0]).toMatchObject({ type: 'player_reconnected' });
  });

  it('does not grant a second attempt to a player who reconnects mid-round', () => {
    const { session } = setupGame({ playersPerTeam: 2 });
    const blue = session.teams.blue.playerIds[0]!;

    const spent = submitAnswer(session, {
      playerId: blue,
      questionId: questionIdFor(session, 'blue'),
      value: correctAnswerFor(session, 'blue') + 1,
      now: T0 + 1000,
    }).session;

    const dropped = disconnectPlayer(spent, blue, T0 + 1100);
    if (!dropped.ok) throw new Error('disconnect failed');
    const back = reconnectPlayer(dropped.session, blue);
    if (!back.ok) throw new Error('reconnect failed');

    const retry = submitAnswer(back.session, {
      playerId: blue,
      questionId: questionIdFor(back.session, 'blue'),
      value: correctAnswerFor(back.session, 'blue'),
      now: T0 + 1200,
    });

    expect(retry.outcome).toEqual({ status: 'rejected', reason: 'player_already_answered' });
  });

  it('refuses to reconnect an unknown player', () => {
    const { session } = setupGame();
    expect(reconnectPlayer(session, 'ghost' as PlayerId).ok).toBe(false);
  });

  it('is a no-op to disconnect twice', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;
    const once = disconnectPlayer(session, blue, T0 + 100);
    if (!once.ok) throw new Error('disconnect failed');
    const twice = disconnectPlayer(once.session, blue, T0 + 200);
    if (!twice.ok) throw new Error('second disconnect failed');

    expect(twice.session.players[blue]!.disconnectedAt).toBe(T0 + 100);
    expect(twice.events).toHaveLength(0);
  });
});

describe('removePlayer', () => {
  it('removes the player, their roster entry and their token', () => {
    const joined = joinGame(lobby(), { name: 'Bye', teamId: 'red', now: T0 });
    if (!joined.ok || !joined.joined) throw new Error('join failed');
    const { playerId, playerToken } = joined.joined;

    const removed = removePlayer(joined.session, playerId);
    if (!removed.ok) throw new Error('remove failed');

    expect(removed.session.players[playerId]).toBeUndefined();
    expect(removed.session.teams.red.playerIds).not.toContain(playerId);
    expect(playerIdForToken(removed.session, playerToken)).toBeNull();
  });

  it('refuses to remove an unknown player', () => {
    expect(removePlayer(lobby(), 'ghost' as PlayerId).ok).toBe(false);
  });
});

describe('switchTeam', () => {
  it('moves a player between rosters in the lobby', () => {
    const joined = joinGame(lobby(), { name: 'Mover', teamId: 'blue', now: T0 });
    if (!joined.ok || !joined.joined) throw new Error('join failed');
    const { playerId } = joined.joined;

    const moved = switchTeam(joined.session, playerId, 'red');
    if (!moved.ok) throw new Error('switch failed');

    expect(moved.session.players[playerId]!.teamId).toBe('red');
    expect(moved.session.teams.red.playerIds).toContain(playerId);
    expect(moved.session.teams.blue.playerIds).not.toContain(playerId);
  });

  it('refuses to switch teams once the game has started', () => {
    const { session } = setupGame();
    const blue = session.teams.blue.playerIds[0]!;

    const moved = switchTeam(session, blue, 'red');
    expect(moved.ok).toBe(false);
    if (!moved.ok) expect(moved.reason).toBe('already_started');
  });

  it('is a no-op when the player is already on that team', () => {
    const joined = joinGame(lobby(), { name: 'Stay', teamId: 'blue', now: T0 });
    if (!joined.ok || !joined.joined) throw new Error('join failed');
    const same = switchTeam(joined.session, joined.joined.playerId, 'blue');
    if (!same.ok) throw new Error('switch failed');
    expect(same.events).toHaveLength(0);
  });
});

describe('broadcast projection', () => {
  it('never carries question answers, tokens or the host secret', () => {
    const { session } = setupGame({ playersPerTeam: 2 });
    const view = toGameStateView(session);
    const wire = JSON.stringify(view);

    // The literal correct answers must not appear as an `answer` field anywhere.
    expect(wire).not.toContain('"answer"');
    expect(wire).not.toContain('"hostToken"');
    expect(wire).not.toContain('"playerTokens"');
    expect(wire).not.toContain(session.hostToken);
    for (const token of Object.keys(session.playerTokens)) {
      expect(wire).not.toContain(token);
    }
  });

  it('exposes one question per team, with prompts but no answers', () => {
    const { session } = setupGame();
    const view = toGameStateView(session);

    expect(view.currentQuestion).not.toBeNull();
    expect(view.currentQuestion!.blue.prompt).toBe(session.round!.teams.blue.question.prompt);
    expect(view.currentQuestion!.blue).not.toHaveProperty('answer');
    expect(view.currentQuestion!.red).not.toHaveProperty('answer');
    expect(view.currentQuestion!.blue.id).not.toBe(view.currentQuestion!.red.id);
  });

  it('sends an absolute round end time instead of a countdown', () => {
    const { session } = setupGame({ secondsPerQuestion: 25 });
    const view = toGameStateView(session);
    expect(view.roundEndsAt).toBe(session.round!.endsAt);
  });

  it('carries no question while in the lobby', () => {
    const { session } = setupGame({ stayInLobby: true });
    const view = toGameStateView(session);
    expect(view.currentQuestion).toBeNull();
    expect(view.round).toBeNull();
    expect(view.roundEndsAt).toBeNull();
  });
});
