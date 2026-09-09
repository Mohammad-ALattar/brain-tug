import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CreateGameAck,
  CreateGamePayload,
  HostAttachAck,
  HostToken,
  RoomCode,
} from '@braintug/shared';
import { request } from '../../realtime/socket';
import { useGameSocket } from '../../realtime/useGameSocket';
import { useGameStore } from '../../store/gameStore';
import { useConnection, useGameError, useResult, useStatus } from '../../store/selectors';
import { Chip } from '../../components/Chip';
import { CreateGameForm } from './CreateGameForm';
import { GameResults } from './GameResults';
import { HostLiveBoard } from './HostLiveBoard';
import { LobbyRoster } from './LobbyRoster';
import { RoomCodeDisplay } from './RoomCodeDisplay';
import { TeacherControls } from './TeacherControls';
import {
  clearCurrentRoom,
  clearHostToken,
  readCurrentRoom,
  readHostToken,
  storeCurrentRoom,
  storeHostToken,
} from './hostSession';

type Session = { roomCode: RoomCode; hostToken: HostToken };

/**
 * The teacher dashboard.
 *
 * Owns the match lifecycle from this tab's point of view: creating a game,
 * reattaching to one after a dropped socket, and tearing down to set up another.
 * The panels below are all driven by the store, so none of them know about any
 * of this.
 */
export function Component() {
  useGameSocket();

  const connection = useConnection();
  const status = useStatus();
  const result = useResult();
  const storeError = useGameError();

  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** True once this tab has attached for the current `connected` window. */
  const attached = useRef(false);

  /**
   * Reattaches after a reconnect. A Socket.IO reconnect is a new socket with no
   * identity, so the token has to be presented again or every host command
   * would be refused as "not connected to a game".
   */
  useEffect(() => {
    if (connection !== 'connected') {
      attached.current = false;
      return;
    }
    if (attached.current) return;

    const roomCode = session?.roomCode ?? readCurrentRoom();
    if (!roomCode) return;

    const hostToken = session?.hostToken ?? readHostToken(roomCode);
    if (!hostToken) return;

    attached.current = true;
    let cancelled = false;

    void request<HostAttachAck>('rejoin_host', { roomCode, hostToken })
      .then((ack) => {
        if (cancelled) return;
        // Reloading the dashboard after a match must not lose the post-match
        // review; it is the screen the teacher talks the class through.
        if (ack.result) useGameStore.getState().setResult(ack.result, ack.state);
        else useGameStore.getState().setState(ack.state);
        setSession({ roomCode: ack.roomCode, hostToken });
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        // The game was reaped or the token is stale. Drop it and offer setup
        // rather than stranding the teacher on a dead dashboard.
        clearHostToken(roomCode);
        clearCurrentRoom();
        useGameStore.getState().reset();
        setSession(null);
      });

    return () => {
      cancelled = true;
    };
  }, [connection, session?.roomCode, session?.hostToken]);

  const create = useCallback((settings: CreateGamePayload) => {
    setBusy(true);
    setError(null);
    void request<CreateGameAck>('create_game', settings)
      .then((ack) => {
        attached.current = true;
        storeHostToken(ack.roomCode, ack.hostToken);
        storeCurrentRoom(ack.roomCode);
        useGameStore.getState().setState(ack.state);
        setSession({ roomCode: ack.roomCode, hostToken: ack.hostToken });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setBusy(false));
  }, []);

  const startOver = useCallback(() => {
    if (session) clearHostToken(session.roomCode);
    clearCurrentRoom();
    attached.current = false;
    useGameStore.getState().reset();
    setSession(null);
  }, [session]);

  if (!session) {
    return (
      <CreateGameForm
        error={error}
        busy={busy || connection === 'connecting'}
        onCreate={create}
      />
    );
  }

  if (status === 'finished' && result) {
    return <GameResults result={result} onNewMatch={startOver} />;
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">Match in progress</h1>
        {connection !== 'connected' ? <Chip tone="warn">Reconnecting</Chip> : null}
      </header>

      <div className="mt-4 flex flex-col gap-4">
        <RoomCodeDisplay roomCode={session.roomCode} hostToken={session.hostToken} />

        {status === 'lobby' ? null : <HostLiveBoard />}

        <TeacherControls hostToken={session.hostToken} />

        <LobbyRoster hostToken={session.hostToken} />

        {storeError ? (
          <p
            role="alert"
            className="rounded-card border-2 border-redteam-300 bg-redteam-50 px-4 py-3 text-sm font-bold text-redteam-900"
          >
            {storeError}
          </p>
        ) : null}
      </div>
    </main>
  );
}
