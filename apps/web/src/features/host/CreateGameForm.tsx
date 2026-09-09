import { useId, useState, type ReactNode } from 'react';
import type {
  CreateGamePayload,
  Difficulty,
  GameModeId,
  OperationChoice,
  Subject,
} from '@braintug/shared';
import {
  DEFAULT_TRACK_METRES,
  DIFFICULTIES,
  MAX_SECONDS_PER_QUESTION,
  MAX_TOTAL_QUESTIONS,
  MIN_SECONDS_PER_QUESTION,
  MIN_TOTAL_QUESTIONS,
  OPERATION_CHOICES,
  OPERATION_LABEL,
  isGeneratedSubject,
} from '@braintug/shared';
import { ModePicker } from './ModePicker';
import { SubjectPicker } from './SubjectPicker';
import { BrainRaceSettings } from './modeSettings/BrainRaceSettings';
import { TugOfWarSettings } from './modeSettings/TugOfWarSettings';

export type CreateGameFormProps = {
  error: string | null;
  busy: boolean;
  onCreate: (settings: CreateGamePayload) => void;
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/**
 * The teacher's setup screen.
 *
 * Every field is bounded by the same constants the server validates against, so
 * the form cannot offer a value the server would reject. The server still
 * revalidates: this is a convenience, not the guard.
 */
export function CreateGameForm({ error, busy, onCreate }: CreateGameFormProps) {
  const [mode, setMode] = useState<GameModeId>('tug_of_war');
  const [subject, setSubject] = useState<Subject>('math');
  const [operation, setOperation] = useState<OperationChoice>('mixed');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(20);
  const [winThreshold, setWinThreshold] = useState<number>(1);
  const [trackMetres, setTrackMetres] = useState(DEFAULT_TRACK_METRES);
  const [finishersRequiredPerTeam, setFinishersRequiredPerTeam] = useState<number | undefined>(
    undefined,
  );
  const [blueName, setBlueName] = useState('');
  const [redName, setRedName] = useState('');

  const blueId = useId();
  const redId = useId();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-ink">New match</h1>
        <p className="mt-1 text-sm font-semibold text-ink-muted">
          Set it up here, then put the room code on the board.
        </p>
      </header>

      <form
        className="mt-7 flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          onCreate({
            mode,
            subject,
            operation,
            difficulty,
            totalQuestions,
            secondsPerQuestion,
            winThreshold: mode === 'tug_of_war' ? winThreshold : undefined,
            trackMetres: mode === 'brain_race' ? trackMetres : undefined,
            finishersRequiredPerTeam:
              mode === 'brain_race' ? finishersRequiredPerTeam : undefined,
            teamNames: {
              ...(blueName.trim() ? { blue: blueName.trim() } : {}),
              ...(redName.trim() ? { red: redName.trim() } : {}),
            },
          });
        }}
      >
        <ModePicker value={mode} onChange={setMode} />
        <SubjectPicker value={subject} onChange={setSubject} />

        {isGeneratedSubject(subject) ? (
          <Field label="Operation">
            <Segmented
              label="Operation"
              options={OPERATION_CHOICES.map((choice) => ({
                value: choice,
                label: OPERATION_LABEL[choice],
              }))}
              value={operation}
              onChange={setOperation}
            />
          </Field>
        ) : null}

        <Field label="Difficulty">
          <Segmented
            label="Difficulty"
            options={DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABEL[value] }))}
            value={difficulty}
            onChange={setDifficulty}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Questions" hint={`${MIN_TOTAL_QUESTIONS}\u2013${MAX_TOTAL_QUESTIONS}`}>
            <Stepper
              value={totalQuestions}
              min={MIN_TOTAL_QUESTIONS}
              max={MAX_TOTAL_QUESTIONS}
              step={5}
              onChange={setTotalQuestions}
              suffix="questions"
            />
          </Field>

          <Field
            label="Time per question"
            hint={`${MIN_SECONDS_PER_QUESTION}\u2013${MAX_SECONDS_PER_QUESTION}s`}
          >
            <Stepper
              value={secondsPerQuestion}
              min={MIN_SECONDS_PER_QUESTION}
              max={MAX_SECONDS_PER_QUESTION}
              step={5}
              onChange={setSecondsPerQuestion}
              suffix="seconds"
            />
          </Field>
        </div>

        {mode === 'tug_of_war' ? (
          <TugOfWarSettings winThreshold={winThreshold} onChange={setWinThreshold} />
        ) : (
          <BrainRaceSettings
            trackMetres={trackMetres}
            onTrackChange={setTrackMetres}
            finishersRequiredPerTeam={finishersRequiredPerTeam}
            onFinishersChange={setFinishersRequiredPerTeam}
          />
        )}

        <Field label="Team names" hint="Optional">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={blueId} className="text-xs font-bold text-blueteam-700">
                Blue team
              </label>
              <input
                id={blueId}
                value={blueName}
                onChange={(event) => setBlueName(event.target.value)}
                maxLength={24}
                placeholder="Blue Tigers"
                className="bt-focus mt-1 h-12 w-full rounded-card border-2 border-blueteam-200 bg-paper-card px-3 font-bold text-ink placeholder:text-ink-faint/60"
              />
            </div>
            <div>
              <label htmlFor={redId} className="text-xs font-bold text-redteam-700">
                Red team
              </label>
              <input
                id={redId}
                value={redName}
                onChange={(event) => setRedName(event.target.value)}
                maxLength={24}
                placeholder="Red Dragons"
                className="bt-focus mt-1 h-12 w-full rounded-card border-2 border-redteam-200 bg-paper-card px-3 font-bold text-ink placeholder:text-ink-faint/60"
              />
            </div>
          </div>
        </Field>

        {error ? (
          <p
            role="alert"
            className="rounded-card border-2 border-redteam-300 bg-redteam-50 px-4 py-3 text-sm font-bold text-redteam-900"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="bt-focus h-14 rounded-card bg-ink font-display text-lg font-extrabold text-white shadow-key transition active:translate-y-px disabled:opacity-30"
        >
          {busy ? 'Creating\u2026' : 'Create match'}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
          {label}
        </span>
        {hint ? <span className="text-[11px] font-semibold text-ink-faint">{hint}</span> : null}
      </legend>
      <div className="mt-2">{children}</div>
    </fieldset>
  );
}

/** Radio-group semantics without radio styling, so a choice is one tap. */
function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={[
              'bt-focus flex-1 rounded-card border-2 px-3 py-2.5 text-sm font-extrabold transition',
              selected
                ? 'border-ink bg-ink text-white'
                : 'border-paper-line bg-paper-card text-ink-muted hover:border-ink/30',
            ].join(' ')}
          >
            {option.label}
            {option.hint ? (
              <span
                className={`block text-[10px] font-semibold ${selected ? 'text-white/70' : 'text-ink-faint'}`}
              >
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (next: number) => void;
}) {
  const clamp = (next: number): number => Math.min(max, Math.max(min, next));

  return (
    <div className="flex items-center gap-2">
      <StepButton label={`Fewer ${suffix}`} onClick={() => onChange(clamp(value - step))}>
        &minus;
      </StepButton>
      <output className="tabular flex-1 rounded-card border-2 border-paper-line bg-paper-card py-2.5 text-center font-display text-lg font-extrabold text-ink">
        {value} <span className="text-xs font-bold text-ink-faint">{suffix}</span>
      </output>
      <StepButton label={`More ${suffix}`} onClick={() => onChange(clamp(value + step))}>
        +
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="bt-focus grid h-11 w-11 shrink-0 place-items-center rounded-card border-2 border-paper-line bg-paper-card text-xl font-extrabold text-ink transition hover:border-ink/30 active:translate-y-px"
    >
      {children}
    </button>
  );
}
