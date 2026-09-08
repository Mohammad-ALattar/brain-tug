import { useEffect, type RefObject } from 'react';
import { clampRope, ropeTension, streakTierIndex, type TeamId } from '@mtow/shared';
import { useGameStore, type GameStore } from '../../store/gameStore';

/** How far, in px, the rope assembly travels from centre to a full win. */
export const ARENA_TRAVEL_PX = 300;

/** How long a team stays visibly braced after landing a pull. */
const LEAN_MS = 900;

/**
 * The complete set of motion values the arena's CSS reads. Everything visual
 * that changes during play is one of these, which is what makes the animation
 * layer auditable: if it is not in this list, it is not animated.
 */
type MotionVars = {
  '--rope-pos': string;
  '--rope-travel': string;
  '--tension': string;
  '--tension-blue': string;
  '--tension-red': string;
  '--streak-blue': string;
  '--streak-red': string;
};

/**
 * Drives every arena animation from `ropePosition` and the team streaks, by
 * writing CSS custom properties onto one root element.
 *
 * This subscribes to the store imperatively rather than with a hook on purpose.
 * A `useRopePosition()` subscription would rerender the whole arena subtree on
 * every answer; here the component tree renders once and the browser animates
 * the rest on the compositor. Rope motion stays deterministic: the same
 * `ropePosition` always produces the same frame, with no physics or spring
 * state that could drift between the display and the server.
 */
export function useArenaMotion(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    /** Timers clearing the braced pose, one per team. */
    const leanTimers: Partial<Record<TeamId, ReturnType<typeof setTimeout>>> = {};
    let lastPullKey: number | null = null;

    const write = (vars: MotionVars): void => {
      for (const [name, value] of Object.entries(vars)) {
        // Guard the write: setting an unchanged custom property still
        // invalidates style on some engines.
        if (root.style.getPropertyValue(name) !== value) {
          root.style.setProperty(name, value);
        }
      }
    };

    const brace = (teamId: TeamId): void => {
      const name = `--lean-${teamId}`;
      root.style.setProperty(name, '1');
      clearTimeout(leanTimers[teamId]);
      leanTimers[teamId] = setTimeout(() => root.style.setProperty(name, '0'), LEAN_MS);
    };

    const apply = (store: GameStore): void => {
      const rope = clampRope(store.state?.ropePosition ?? 0);
      const rules = store.state?.rules ?? null;
      const tension = rules ? ropeTension(rules, rope) : 0;

      write({
        '--rope-pos': rope.toFixed(4),
        '--rope-travel': `${ARENA_TRAVEL_PX}px`,
        '--tension': tension.toFixed(3),
        // Split by side so the glow can sit on a single element per team and
        // never needs a JS-built gradient string.
        '--tension-blue': rope < 0 ? tension.toFixed(3) : '0',
        '--tension-red': rope > 0 ? tension.toFixed(3) : '0',
        '--streak-blue': rules
          ? String(streakTierIndex(rules, store.state?.teams.blue.streak ?? 0))
          : '0',
        '--streak-red': rules
          ? String(streakTierIndex(rules, store.state?.teams.red.streak ?? 0))
          : '0',
      });

      // A new pull braces the team that earned it. Keyed on the pull's
      // monotonic key so a repeat of the same pull does not retrigger.
      const pull = store.lastPull;
      if (pull && pull.key !== lastPullKey) {
        lastPullKey = pull.key;
        brace(pull.teamId);
      }
    };

    apply(useGameStore.getState());
    const unsubscribe = useGameStore.subscribe(apply);

    return () => {
      unsubscribe();
      for (const timer of Object.values(leanTimers)) clearTimeout(timer);
    };
  }, [ref]);
}
