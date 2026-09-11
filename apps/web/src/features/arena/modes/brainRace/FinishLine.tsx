import { useTranslation } from 'react-i18next';

/** Chequered finish column at the right edge of the track. */
export function FinishLine() {
  const { t } = useTranslation('game');

  return (
    <div
      className="pointer-events-none absolute inset-y-2 right-2 z-20 flex w-8 flex-col items-center"
      aria-hidden
    >
      <span className="mb-1 rotate-90 text-[9px] font-extrabold uppercase tracking-[0.22em] text-ink/70">
        {t('arena.race.finish')}
      </span>
      <div className="min-h-0 flex-1 w-full overflow-hidden rounded-sm border-2 border-ink/25 shadow-panel">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: 'repeating-conic-gradient(#111a2e 0% 25%, #ffffff 0% 50%)',
            backgroundSize: '12px 12px',
          }}
        />
      </div>
    </div>
  );
}
