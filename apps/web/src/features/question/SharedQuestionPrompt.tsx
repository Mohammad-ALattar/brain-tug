import type { PublicQuestion } from '@braintug/shared';
import { isNumericPrompt } from '@braintug/shared';

export type SharedQuestionPromptProps = {
  question: PublicQuestion | null;
  /** Shown when no question is on the wire yet. */
  empty?: string;
  size?: 'phone' | 'board';
  /** Colour of the `?` on a numeric prompt. */
  accentClassName?: string;
};

/**
 * How a question is read to the class. Input controls stay in the student pad
 * or the mode’s mirrored surface; this only prints the prompt.
 */
export function SharedQuestionPrompt({
  question,
  empty = 'Waiting\u2026',
  size = 'board',
  accentClassName = 'text-ink',
}: SharedQuestionPromptProps) {
  const numeric = isNumericPrompt(question);
  const sizeClass =
    size === 'phone'
      ? numeric
        ? 'tabular text-[46px] leading-none sm:text-[56px]'
        : 'text-[28px] sm:text-[32px]'
      : numeric
        ? 'tabular text-[44px] leading-none'
        : 'text-[28px]';

  return (
    <p className={`font-display font-extrabold leading-tight text-ink ${sizeClass}`} aria-live="polite">
      {question ? (
        numeric ? (
          <>
            {question.prompt} <span className="text-ink-faint">=</span>{' '}
            <span className={accentClassName}>?</span>
          </>
        ) : (
          question.prompt
        )
      ) : (
        <span className="text-2xl text-ink-faint">{empty}</span>
      )}
    </p>
  );
}
