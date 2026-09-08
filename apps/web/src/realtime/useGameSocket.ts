import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from './socket';
import { syncClock } from './clockOffset';

/**
 * Binds the socket to the store exactly once per tab.
 *
 * Every handler writes through a narrow store action rather than replacing the
 * whole state, so a keystroke mirror or a pull only wakes the components that
 * subscribe to those slices.
 */
export function useGameSocket(): void {
  useEffect(() => {
    const socket = getSocket();
    const store = useGameStore.getState();

    const onConnect = (): void => {
      store.setConnection('connected');
      void syncClock();
    };
    const onDisconnect = (): void => useGameStore.getState().setConnection('reconnecting');
    const onConnectError = (): void => useGameStore.getState().setConnection('reconnecting');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    socket.on('game_state_updated', ({ state }) => {
      useGameStore.getState().setState(state);
    });

    socket.on('question_started', () => {
      // The accompanying state snapshot carries the new questions; this event
      // exists so the arena can trigger its round-start animation.
      useGameStore.getState().setMyOutcome(null);
    });

    socket.on('pull_applied', (payload) => {
      useGameStore.getState().applyPull(payload);
    });

    socket.on('draft_updated', ({ teamId, draft }) => {
      useGameStore.getState().applyDraft(teamId, draft.value);
    });

    socket.on('round_resolved', ({ index, reason }) => {
      useGameStore.getState().applyResolution(index, reason);
    });

    socket.on('answer_result', ({ playerId, outcome }) => {
      const state = useGameStore.getState();
      // Outcomes are private, but guard anyway so a stray event cannot mislead.
      if (state.me?.playerId === playerId) state.setMyOutcome(outcome);
    });

    socket.on('player_joined', ({ player }) => {
      useGameStore.getState().applyPlayerJoined(player);
    });

    socket.on('player_left', ({ playerId }) => {
      useGameStore.getState().applyPlayerConnection(playerId, false);
    });

    socket.on('player_reconnected', ({ playerId }) => {
      useGameStore.getState().applyPlayerConnection(playerId, true);
    });

    socket.on('game_finished', ({ result, state }) => {
      useGameStore.getState().setResult(result, state);
    });

    socket.on('game_error', ({ message }) => {
      useGameStore.getState().setError(message);
    });

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('game_state_updated');
      socket.off('question_started');
      socket.off('pull_applied');
      socket.off('draft_updated');
      socket.off('round_resolved');
      socket.off('answer_result');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('player_reconnected');
      socket.off('game_finished');
      socket.off('game_error');
    };
  }, []);
}
