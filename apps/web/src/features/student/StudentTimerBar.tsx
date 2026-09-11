import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  usePausedRemaining,
  useRoundEndsAt,
  useSecondsPerQuestion,
  useStatus,
} from '../../store/selectors';
import { serverNow } from '../../realtime/clockOffset';

/**
 * A linear countdown, chosen over the arena's ring because it reads at a glance
 * on a narrow screen and costs one style write per frame.
 *
 * Like `<GameTimer />`, the passing of time never enters React state: the bar and
 * the seconds label are written straight to refs, so a running clock cannot
 * rerender the keypad underneath it.
 */
export function StudentTimerBar() {
  const { t } = useTranslation('student');
  const endsAt = useRoundEndsAt();
  const pausedRemaining = usePausedRemaining();
  const status = useStatus();
  const totalSeconds = useSecondsPerQuestion();

  const barRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const label = labelRef.current;
    if (!bar || !label) return;

    const totalMs = totalSeconds * 1000;

    const paint = (remainingMs: number): void => {
      const clamped = Math.max(0, remainingMs);
      const seconds = Math.ceil(clamped / 1000);
      const next = `${seconds}s`;
      if (label.textContent !== next) label.textContent = next;

      const fraction = totalMs > 0 ? Math.min(1, clamped / totalMs) : 0;
      bar.style.transform = `scaleX(${fraction})`;
      bar.style.backgroundColor = clamped <= 5000 ? '#ef3344' : '#f7c93e';
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
  }, [endsAt, pausedRemaining, status, totalSeconds]);

  return (
    <div className="flex items-center gap-3" role="timer" aria-label={t('timer.ariaLabel')}>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-sunk">
        <div
          ref={barRef}
          className="h-full w-full origin-left rounded-full"
          style={{ transform: 'scaleX(1)', backgroundColor: '#f7c93e' }}
        />
      </div>
      <span ref={labelRef} className="tabular w-9 text-end text-sm font-extrabold text-ink-muted">
        {totalSeconds}s
      </span>
    </div>
  );
}
