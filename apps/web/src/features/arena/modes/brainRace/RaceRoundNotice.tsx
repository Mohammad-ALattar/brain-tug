import { useQuestionIndex, useStatus, useLastResolution } from '../../../../store/selectors';
import { roundResolutionLabel } from './raceFeedback';

/** Brief classroom copy while the server prepares the next question. */
export function RaceRoundNotice() {
  const resolution = useLastResolution();
  const questionIndex = useQuestionIndex();
  const status = useStatus();

  if (!resolution || resolution.index !== questionIndex) return null;
  if (status === 'finished' || status === 'lobby') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 rounded-card border border-paper-line bg-paper-sunk px-4 py-3 text-center"
    >
      <p className="font-display text-lg font-extrabold text-ink">
        {roundResolutionLabel(resolution.reason)}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-ink-muted">Next question coming</p>
    </div>
  );
}
