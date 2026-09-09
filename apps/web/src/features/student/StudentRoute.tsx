import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { JoinGameAck, RoomCode } from '@braintug/shared';
import { formatRoomCode, normaliseRoomCode } from '@braintug/shared';
import { request } from '../../realtime/socket';
import { useGameSocket } from '../../realtime/useGameSocket';
import { useGameStore } from '../../store/gameStore';
import { useConnection } from '../../store/selectors';
import {
  clearPlayerToken,
  readPlayerName,
  readPlayerToken,
  storePlayerName,
  storePlayerToken,
} from './playerSession';
import { StudentController } from './StudentController';
import { StudentJoinForm, type JoinRequest } from './StudentJoinForm';

/**
 * The student controller route.
 *
 * Owns the seat lifecycle only: joining, reclaiming a seat after a drop, and
 * handing a confirmed identity to `<StudentController />`. Keeping this split
 * means the controller never has to render a half-joined state.
 */
export function Component() {
  useGameSocket();

  const { roomCode: routeRoomCode } = useParams<{ roomCode?: string }>();
  const navigate = useNavigate();
  const connection = useConnection();

  const [seat, setSeat] = useState<{ roomCode: RoomCode; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const urlRoomCode = routeRoomCode ? normaliseRoomCode(routeRoomCode) : null;
  /** The room we hold a seat in, or the one from the URL we are trying to join. */
  const targetRoom = seat?.roomCode ?? urlRoomCode;

  /**
   * True once a seat has been claimed for the current `connected` window, by
   * either path. Without it, a fresh form join would immediately trigger the
   * reconnect effect below and spend a needless round trip reclaiming the seat
   * it had just been given.
   */
  const claimed = useRef(false);
  /**
   * Held in state rather than a mount-time ref so that leaving a finished match
   * and joining the next one keeps the name. A ref captured on first load is
   * empty for a student who has never played, and stays empty for the rest of
   * the session no matter how many times they join.
   */
  const [rememberedName, setRememberedName] = useState(readPlayerName);

  const adopt = useCallback((ack: JoinGameAck, name: string) => {
    claimed.current = true;
    storePlayerToken(ack.roomCode, ack.playerToken);
    storePlayerName(name);
    setRememberedName(name);
    const store = useGameStore.getState();
    // A match that finished while this phone was away still has a result to
    // show, and it arrives on the ack rather than as a `game_finished` event.
    if (ack.result) store.setResult(ack.result, ack.state);
    else store.setState(ack.state);
    store.setMe({ playerId: ack.playerId, teamId: ack.teamId });
    setSeat({ roomCode: ack.roomCode, name });
    setError(null);
  }, []);

  /**
   * Reclaims the seat whenever the socket comes back.
   *
   * A Socket.IO reconnect arrives as a brand-new socket with no room membership,
   * so the client has to re-present its token; the server matches it to the
   * existing player and the student keeps their score and their team.
   */
  useEffect(() => {
    if (connection !== 'connected' || !targetRoom) {
      claimed.current = false;
      return;
    }
    if (claimed.current) return;

    const token = readPlayerToken(targetRoom);
    if (!token) return;

    claimed.current = true;
    let cancelled = false;

    void request<JoinGameAck>('rejoin_game', { roomCode: targetRoom, playerToken: token })
      .then((ack) => {
        if (!cancelled) adopt(ack, seat?.name ?? rememberedName);
      })
      .catch(() => {
        if (cancelled) return;
        // The token is for a finished or forgotten game. Drop it and fall back
        // to the join form rather than leaving the student stuck on a spinner.
        clearPlayerToken(targetRoom);
        useGameStore.getState().reset();
        setSeat(null);
      });

    return () => {
      cancelled = true;
    };
  }, [connection, targetRoom, adopt, seat?.name, rememberedName]);

  const join = useCallback(
    (payload: JoinRequest) => {
      setBusy(true);
      setError(null);
      void request<JoinGameAck>('join_game', payload)
        .then((ack) => adopt(ack, payload.name))
        .catch((err: Error) => setError(err.message))
        .finally(() => setBusy(false));
    },
    [adopt],
  );

  /**
   * Releases the seat so the student can enter a different room code.
   *
   * The token has to go, or the reconnect effect would immediately reclaim the
   * seat we just left. Navigating away from `/play/:roomCode` matters too: the
   * teacher's next match has a different code, and leaving the finished one in
   * the URL would prefill the form with the wrong answer.
   */
  const leave = useCallback(() => {
    if (targetRoom) clearPlayerToken(targetRoom);
    claimed.current = false;
    useGameStore.getState().reset();
    setSeat(null);
    setError(null);
    if (urlRoomCode) navigate('/play', { replace: true });
  }, [targetRoom, urlRoomCode, navigate]);

  if (seat) {
    return <SeatedController name={seat.name} onLeave={leave} />;
  }

  return (
    <StudentJoinForm
      initialRoomCode={urlRoomCode ? formatRoomCode(urlRoomCode) : ''}
      initialName={rememberedName}
      error={error ?? (connection === 'disconnected' ? 'No connection to the server.' : null)}
      busy={busy || connection === 'connecting'}
      onJoin={join}
    />
  );
}

/**
 * Reads the team from the store rather than closing over the join ack, so a
 * host moving a student between teams mid-lobby is reflected immediately.
 */
function SeatedController({ name, onLeave }: { name: string; onLeave: () => void }) {
  const teamId = useGameStore((s) => s.me?.teamId ?? null);
  if (!teamId) return null;
  return <StudentController teamId={teamId} playerName={name} onLeave={onLeave} />;
}
