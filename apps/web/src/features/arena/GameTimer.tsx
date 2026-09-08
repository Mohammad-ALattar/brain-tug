import { useEffect, useRef } from 'react';
import { usePausedRemaining, useRoundEndsAt, useSecondsPerQuestion, useStatus } from '../../store/selectors';
import { serverNow } from '../../realtime/clockOffset';

export type GameTimerProps = {
  size?: number;
};

/**
 * The circular countdown from the reference header.
 *
 * Owns its own animation frame loop and writes the seconds and the ring sweep
 * straight to DOM refs. Nothing about the passage of time enters React state, so
 * a running clock never rerenders the arena.
 */
export function GameTimer({ size = 62 }: GameTimerProps) {
  const endsAt = useRoundEndsAt();
  const pausedRemaining = usePausedRemaining();
  const status = useStatus();
  const totalSeconds = useSecondsPerQuestion();

  const labelRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);

  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const label = labelRef.current;
    const ring = ringRef.current;
    if (!label || !ring) return;

    const totalMs = totalSeconds * 1000;

    const paint = (remainingMs: number): void => {
      const clamped = Math.max(0, remainingMs);
      const seconds = Math.ceil(clamped / 1000);
      const next = String(seconds);
      // Guard the write so we do not dirty the DOM 60 times a second.
      if (label.textContent !== next) label.textContent = next;

      const fraction = totalMs > 0 ? Math.min(1, clamped / totalMs) : 0;
      ring.style.strokeDashoffset = String(circumference * (1 - fraction));
      ring.style.stroke =
        clamped <= 5000 ? 'var(--timer-danger, #ef3344)' : 'var(--timer-normal, #f7c93e)';
    };

    if (status === 'paused') {
      paint(pausedRemaining ?? 0);
      return;
    }
    if (endsAt === null) {
      paint(totalMs);
      return;
    }

    let frame = 0;
    const loop = (): void => {
      paint(endsAt - serverNow());
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [endsAt, pausedRemaining, status, totalSeconds, circumference]);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="timer"
      aria-label="Time remaining this question"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="#fffdf5"
          stroke="#e8e2cc"
          strokeWidth={6}
        />
        <circle
          ref={ringRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f7c93e"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={0}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span ref={labelRef} className="tabular font-display text-xl font-extrabold text-ink">
          {totalSeconds}
        </span>
      </span>
    </div>
  );
}
