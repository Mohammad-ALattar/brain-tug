import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../../audio/sfx';
import { serverNow } from '../../../realtime/clockOffset';
import { useModeCopy } from '../../../i18n/useModeCopy';
import { useCountdownEndsAt, useGameMode, useStatus } from '../../../store/selectors';

export function Countdown() {
  const { t } = useTranslation('game');
  const endsAt = useCountdownEndsAt();
  const status = useStatus();
  const mode = useGameMode();
  const copy = useModeCopy(mode);

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
        digit.textContent = seconds > 0 ? String(seconds) : t('countdown.go');
        digit.style.animation = 'none';
        void digit.offsetWidth;
        digit.style.animation = 'countdownPop 0.35s ease-out';
        playSfx(seconds > 0 ? 'tick' : 'go');
      }
      frame = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(frame);
  }, [endsAt, status, t]);

  if (status !== 'countdown') return null;

  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center bg-ink/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <p className="font-display text-2xl font-extrabold uppercase tracking-[0.3em] text-white/70">
          {t('countdown.getReady')}
        </p>
        <p
          ref={digitRef}
          className="tabular mt-4 font-display text-[180px] font-extrabold leading-none text-white"
        />
        <p className="mt-4 text-lg font-bold text-white/70">{copy.countdownCue}</p>
      </div>
    </div>
  );
}
