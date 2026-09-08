import { create } from 'zustand';
import type {
  AnswerOutcome,
  GameResult,
  GameStateView,
  PlayerId,
  PublicPlayer,
  RoundResolution,
  TeamId,
} from '@mtow/shared';

/** A pull worth animating, e.g. the floating `+1.2m RED` badge. */
export type PullFlash = {
  key: number;
  teamId: TeamId;
  playerId: PlayerId;
  pull: number;
  streak: number;
};

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type GameStore = {
  state: GameStateView | null;
  result: GameResult | null;
  connection: ConnectionStatus;
  error: string | null;

  /** In-progress typing per team, for the classroom mirror. */
  drafts: Record<TeamId, string>;
  /** Most recent pull, consumed by the arena to fire a one-shot animation. */
  lastPull: PullFlash | null;
  lastResolution: { index: number; reason: RoundResolution } | null;

  /** This client's own identity, when it is a student. */
  me: { playerId: PlayerId; teamId: TeamId } | null;
  /** The outcome of this client's last submission. */
  myOutcome: AnswerOutcome | null;

  setState: (state: GameStateView) => void;
  setConnection: (status: ConnectionStatus) => void;
  setError: (message: string | null) => void;
  setMe: (me: { playerId: PlayerId; teamId: TeamId } | null) => void;
  setMyOutcome: (outcome: AnswerOutcome | null) => void;
  applyPull: (pull: Omit<PullFlash, 'key'> & { ropePosition: number; score: number }) => void;
  applyDraft: (teamId: TeamId, value: string) => void;
  applyPlayerJoined: (player: PublicPlayer) => void;
  applyPlayerConnection: (playerId: PlayerId, connected: boolean) => void;
  applyResolution: (index: number, reason: RoundResolution) => void;
  setResult: (result: GameResult, state: GameStateView) => void;
  reset: () => void;
};

const emptyDrafts: Record<TeamId, string> = { blue: '', red: '' };

let pullKey = 0;

export const useGameStore = create<GameStore>((set) => ({
  state: null,
  result: null,
  connection: 'connecting',
  error: null,
  drafts: emptyDrafts,
  lastPull: null,
  lastResolution: null,
  me: null,
  myOutcome: null,

  setState: (state) =>
    set((prev) => ({
      state,
      // A new round clears the mirrored input and the previous outcome.
      drafts:
        prev.state?.currentQuestionIndex === state.currentQuestionIndex ? prev.drafts : emptyDrafts,
      myOutcome:
        prev.state?.currentQuestionIndex === state.currentQuestionIndex ? prev.myOutcome : null,
    })),

  setConnection: (connection) => set({ connection }),
  setError: (error) => set({ error }),
  setMe: (me) => set({ me }),
  setMyOutcome: (myOutcome) => set({ myOutcome }),

  /**
   * Applies a pull without waiting for a full state snapshot. The server sends
   * the authoritative rope position and score in the event itself, so the
   * header and rope stay correct while costing one small message per answer.
   */
  applyPull: (pull) =>
    set((prev) => {
      pullKey += 1;
      const flash: PullFlash = {
        key: pullKey,
        teamId: pull.teamId,
        playerId: pull.playerId,
        pull: pull.pull,
        streak: pull.streak,
      };
      if (!prev.state) return { lastPull: flash };

      return {
        lastPull: flash,
        drafts: { ...prev.drafts, [pull.teamId]: '' },
        state: {
          ...prev.state,
          ropePosition: pull.ropePosition,
          teams: {
            ...prev.state.teams,
            [pull.teamId]: {
              ...prev.state.teams[pull.teamId],
              score: pull.score,
              streak: pull.streak,
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

  applyResolution: (index, reason) => set({ lastResolution: { index, reason } }),

  setResult: (result, state) => set({ result, state }),

  reset: () =>
    set({
      state: null,
      result: null,
      error: null,
      drafts: emptyDrafts,
      lastPull: null,
      lastResolution: null,
      me: null,
      myOutcome: null,
    }),
}));
