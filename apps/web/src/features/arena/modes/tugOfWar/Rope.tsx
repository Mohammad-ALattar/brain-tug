import { memo } from 'react';

/**
 * The rope itself. Purely presentational: it is positioned by its parent through
 * a CSS transform, so this component never re-renders as the rope moves.
 */
export const Rope = memo(function Rope({ width = 300 }: { width?: number }) {
  return (
    <div className="relative flex items-center" style={{ width }} aria-hidden>
      <div className="h-[14px] w-full rounded-full bg-rope shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]">
        {/* Twine hatching, so the rope reads as rope at projector distance. */}
        <div
          className="h-full w-full rounded-full opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(105deg, rgba(255,255,255,0.55) 0 3px, rgba(0,0,0,0) 3px 11px)',
          }}
        />
      </div>
      {/* Centre marker knot: the flag that must cross a goal line. */}
      <div className="absolute left-1/2 top-1/2 h-7 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[4px] border-2 border-amber-700 bg-timer shadow-sm" />
    </div>
  );
});
