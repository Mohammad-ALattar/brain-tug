import { create } from 'zustand';
import type {
  AnswerOutcome,
  GameResult,
  GameStateView,
  ModeState,
  PlayerId,
  PublicPlayer,
  RoundResolution,
  TeamId,
} from '@braintug/shared';

/** A gain worth animating, e.g. the floating `+40m` badge. */
export type ProgressFlash = {
  key: number;
  teamId: TeamId;
  playerId: PlayerId;
  gain: number;
  streak: number;
  /** Team score after this answer, copied from the server event. */
  score: number;
};

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type GameStore = {
  state: GameStateView | null;
  result: GameResult | null;
  connection: ConnectionStatus;
  error: string | null;

  /** In-progress typing per team, for the classroom mirror. */
  drafts: Record<TeamId, string>;
  /** Most recent gain, consumed by the arena to fire a one-shot animation. */
  lastProgress: ProgressFlash | null;
  lastResolution: {
    index: number;
    reason: RoundResolution;
    revealed: Record<TeamId, string> | null;
  } | null;

  /** This client's own identity, when it is a student. */
  me: { playerId: PlayerId; teamId: TeamId } | null;
  /** The outcome of this client's last submission. */
  myOutcome: AnswerOutcome | null;

  setState: (state: GameStateView) => void;
  setConnection: (status: ConnectionStatus) => void;
  setError: (message: string | null) => void;
  setMe: (me: { playerId: PlayerId; teamId: TeamId } | null) => void;
  setMyOutcome: (outcome: AnswerOutcome | null) => void;
  applyProgress: (event: {
    teamId: TeamId;
    playerId: PlayerId;
    gain: number;
    streak: number;
    score: number;
    modeState: ModeState;
  }) => void;
  applyDraft: (teamId: TeamId, value: string) => void;
  applyPlayerJoined: (player: PublicPlayer) => void;
  applyPlayerConnection: (playerId: PlayerId, connected: boolean) => void;
  applyResolution: (
    index: number,
    reason: RoundResolution,
    revealed: Record<TeamId, string>,
  ) => void;
  setResult: (result: GameResult, state: GameStateView) => void;
  reset: () => void;
};

const emptyDrafts: Record<TeamId, string> = { blue: '', red: '' };

let progressKey = 0;

export const useGameStore = create<GameStore>((set) => ({
  state: null,
  result: null,
  connection: 'connecting',
  error: null,
  drafts: emptyDrafts,
  lastProgress: null,
  lastResolution: null,
  me: null,
  myOutcome: null,

  setState: (state) =>
    set((prev) => ({
      state,
      drafts:
        prev.state?.currentQuestionIndex === state.currentQuestionIndex ? prev.drafts : emptyDrafts,
      myOutcome:
        prev.state?.currentQuestionIndex === state.currentQuestionIndex ? prev.myOutcome : null,
      lastProgress:
        prev.state?.currentQuestionIndex === state.currentQuestionIndex ? prev.lastProgress : null,
    })),

  setConnection: (connection) => set({ connection }),
  setError: (error) => set({ error }),
  setMe: (me) => set({ me }),
  setMyOutcome: (myOutcome) => set({ myOutcome }),

  /**
   * Applies a gain without waiting for a full state snapshot. The server sends
   * the authoritative mode state and score in the event itself, so the header
   * and arena stay correct while costing one small message per answer.
   */
  applyProgress: (event) =>
    set((prev) => {
      progressKey += 1;
      const flash: ProgressFlash = {
        key: progressKey,
        teamId: event.teamId,
        playerId: event.playerId,
        gain: event.gain,
        streak: event.streak,
        score: event.score,
      };
      if (!prev.state) return { lastProgress: flash };

      const isRace = prev.state.config.mode === 'brain_race';
      const players = prev.state.players.map((player) =>
        player.id === event.playerId && isRace ? { ...player, streak: event.streak } : player,
      );

      return {
        lastProgress: flash,
        drafts: { ...prev.drafts, [event.teamId]: '' },
        state: {
          ...prev.state,
          players,
          modeState: event.modeState,
          teams: isRace
            ? {
                ...prev.state.teams,
                [event.teamId]: {
                  ...prev.state.teams[event.teamId],
                  score: event.score,
                },
              }
            : {
                ...prev.state.teams,
                [event.teamId]: {
                  ...prev.state.teams[event.teamId],
                  score: event.score,
                  streak: event.streak,
                },
              },
        },
      };
    }),

  applyDraft: (teamId, value) =>
    set((prev) => ({ drafts: { ...prev.drafts, [teamId]: value } })),

  applyPlayerJoined: (player) =>
    set((prev) => {
      if (!prev.state) return {};
      if (prev.state.players.some((p) => p.id === player.id)) return {};
      return { state: { ...prev.state, players: [...prev.state.players, player] } };
    }),

  applyPlayerConnection: (playerId, connected) =>
    set((prev) => {
      if (!prev.state) return {};
      return {
        state: {
          ...prev.state,
          players: prev.state.players.map((p) => (p.id === playerId ? { ...p, connected } : p)),
        },
      };
    }),

  applyResolution: (index, reason, revealed) =>
    set({ lastResolution: { index, reason, revealed } }),

  setResult: (result, state) => set({ result, state }),

  reset: () =>
    set({
      state: null,
      result: null,
      error: null,
      drafts: emptyDrafts,
      lastProgress: null,
      lastResolution: null,
      me: null,
      myOutcome: null,
    }),
}));
