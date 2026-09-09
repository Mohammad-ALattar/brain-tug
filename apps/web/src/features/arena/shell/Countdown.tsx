import { useEffect, useRef } from 'react';
import { playSfx } from '../../../audio/sfx';
import { serverNow } from '../../../realtime/clockOffset';
import { useCountdownEndsAt, useGameMode, useStatus } from '../../../store/selectors';
import { MODE_COPY } from '../modeCopy';

/**
 * Full-screen "get ready" overlay between the host pressing start and the first
 * question.
 *
 * Like the game timer, the digit is written straight to a ref on an animation
 * frame rather than held in React state, so counting the class in does not
 * rerender the arena behind the overlay. The pop animation is restarted by
 * re-triggering it on the element, which is also why the digit does not need a
 * React key.
 */
export function Countdown() {
  const endsAt = useCountdownEndsAt();
  const status = useStatus();
  const mode = useGameMode();

  const digitRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const digit = digitRef.current;
    if (!digit || status !== 'countdown' || endsAt === null) return;

    let shown: number | null = null;
    let frame = 0;

    const loop = (): void => {
      const seconds = Math.max(0, Math.ceil((endsAt - serverNow()) / 1000));
      if (seconds !== shown) {
        shown = seconds;
        digit.textContent = seconds > 0 ? String(seconds) : 'Go!';
        // Restarting the animation requires clearing it and forcing a reflow;
        // reading `offsetWidth` is the standard way to do that.
        digit.style.animation = 'none';
        void digit.offsetWidth;
        digit.style.animation = 'countdownPop 0.35s ease-out';
        playSfx(seconds > 0 ? 'tick' : 'go');
      }
      frame = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(frame);
  }, [endsAt, status]);

  if (status !== 'countdown') return null;

  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center bg-ink/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <p className="font-display text-2xl font-extrabold uppercase tracking-[0.3em] text-white/70">
          Get ready
        </p>
        <p
          ref={digitRef}
          className="tabular mt-4 font-display text-[180px] font-extrabold leading-none text-white"
        />
        <p className="mt-4 text-lg font-bold text-white/70">{MODE_COPY[mode].countdownCue}</p>
      </div>
    </div>
  );
}
