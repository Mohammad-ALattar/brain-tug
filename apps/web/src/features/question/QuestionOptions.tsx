import type { PublicQuestion } from '@braintug/shared';

export type QuestionOptionsProps = {
  question: PublicQuestion;
  columns?: 1 | 2;
};

/** Read-only choices for the classroom display. Never interactive. */
export function QuestionOptions({ question, columns = 1 }: QuestionOptionsProps) {
  if (question.type === 'multiple_choice') {
    return (
      <ol className={`mt-4 grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {question.options.map((option) => (
          <li
            key={option.id}
            className="flex items-center gap-2 rounded-card border border-paper-line bg-paper-sunk px-3 py-2"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-extrabold text-white">
              {option.id.toUpperCase()}
            </span>
            <span className="font-bold leading-tight text-ink">{option.text}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (question.type === 'true_false') {
    return (
      <p className="mt-4 text-center text-sm font-extrabold uppercase tracking-wide text-ink-muted">
        True or false
      </p>
    );
  }

  return null;
}
