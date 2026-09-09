import { useCallback, useEffect, useRef } from 'react';
import type { QuestionId } from '@braintug/shared';
import { notify } from '../../realtime/socket';

/**
 * Interval between draft messages. Fast enough that the classroom mirror feels
 * live, slow enough that thirty students hammering a keypad cannot flood the
 * server: this caps the whole class at roughly 30 / 0.09s messages rather than
 * one per keystroke.
 */
const THROTTLE_MS = 90;

/**
 * Relays in-progress typing to the classroom display, throttled.
 *
 * Drafts are cosmetic, so they are sent fire-and-forget with no ack and are
 * simply dropped while offline. The trailing edge always fires, which is what
 * guarantees the TV ends up showing what the student actually typed rather than
 * a value from mid-throttle.
 */
export function useDraftEmitter(questionId: QuestionId | null): (value: string) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const lastSent = useRef<string | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    pending.current = null;
  }, []);

  // A new question invalidates any queued draft: it belongs to the old round.
  useEffect(() => {
    clear();
    lastSent.current = null;
  }, [questionId, clear]);

  useEffect(() => clear, [clear]);

  return useCallback(
    (value: string) => {
      if (!questionId || value === lastSent.current) return;

      const send = (next: string): void => {
        lastSent.current = next;
        notify('answer_draft', { questionId, value: next });
      };

      if (timer.current === null) {
        send(value);
        timer.current = setTimeout(() => {
          timer.current = null;
          const queued = pending.current;
          pending.current = null;
          if (queued !== null && queued !== lastSent.current) send(queued);
        }, THROTTLE_MS);
        return;
      }

      pending.current = value;
    },
    [questionId],
  );
}
