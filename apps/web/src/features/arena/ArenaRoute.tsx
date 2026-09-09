import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { HostToken, WatchArenaAck } from '@braintug/shared';
import { normaliseRoomCode } from '@braintug/shared';
import { useGameSocket } from '../../realtime/useGameSocket';
import { request } from '../../realtime/socket';
import { useGameStore } from '../../store/gameStore';
import { useConnection } from '../../store/selectors';
import { readHostToken } from '../host/hostSession';
import { GameArena } from './GameArena';
import { JoinArenaForm } from './JoinArenaForm';

export function Component() {
  useGameSocket();

  const { roomCode: routeRoomCode } = useParams<{ roomCode?: string }>();
  const [searchParams] = useSearchParams();
  const connection = useConnection();

  const [attached, setAttached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<HostToken | null>(null);

  const roomCode = routeRoomCode ? normaliseRoomCode(routeRoomCode) : null;
  /**
   * Read out as a plain string rather than depending on the `URLSearchParams`
   * object: router hooks hand back a fresh instance on every render, so an
   * effect keyed on the object itself reruns forever once it sets any state.
   */
  const hostParam = searchParams.get('host');

  useEffect(() => {
    if (!roomCode || connection !== 'connected') return;

    // A display opened from the host dashboard carries the token, which upgrades
    // it to a controllable arena. A display opened by URL alone stays read-only.
    const token = (hostParam as HostToken | null) ?? readHostToken(roomCode) ?? null;

    let cancelled = false;
    void request<WatchArenaAck>('watch_arena', {
      roomCode,
      ...(token ? { hostToken: token } : {}),
    })
      .then((ack) => {
        if (cancelled) return;
        // A display opened or refreshed after the final round still shows the
        // victory screen rather than a frozen board.
        if (ack.result) useGameStore.getState().setResult(ack.result, ack.state);
        else useGameStore.getState().setState(ack.state);
        setHostToken(ack.isHost ? token : null);
        setAttached(true);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [roomCode, connection, hostParam]);

  if (!roomCode || (error && !attached)) {
    return <JoinArenaForm error={error} />;
  }

  if (!attached) {
    return (
      <div className="grid h-full place-items-center bg-ink">
        <p className="font-display text-xl font-bold text-white/70">
          Connecting the classroom display&hellip;
        </p>
      </div>
    );
  }

  return <GameArena hostToken={hostToken} />;
}
