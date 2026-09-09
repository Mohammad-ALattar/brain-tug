import type { ReactNode } from 'react';
import { DEFAULT_TRACK_METRES } from '@braintug/shared';



const TRACKS = [

  { value: 500, label: 'Sprint', hint: '500m' },

  { value: DEFAULT_TRACK_METRES, label: 'Standard', hint: '1000m' },

  { value: 2000, label: 'Marathon', hint: '2000m' },

] as const;



const FINISHERS_MAX = 40;



export type BrainRaceSettingsProps = {

  trackMetres: number;

  onTrackChange: (trackMetres: number) => void;

  finishersRequiredPerTeam: number | undefined;

  onFinishersChange: (finishersRequiredPerTeam: number | undefined) => void;

};



export function BrainRaceSettings({

  trackMetres,

  onTrackChange,

  finishersRequiredPerTeam,

  onFinishersChange,

}: BrainRaceSettingsProps) {

  const autoFinishers = finishersRequiredPerTeam === undefined;



  return (

    <div className="flex flex-col gap-6">

      <fieldset>

        <legend className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">

          Track length

        </legend>

        <div role="radiogroup" aria-label="Track length" className="mt-2 flex flex-wrap gap-2">

          {TRACKS.map((option) => {

            const selected = option.value === trackMetres;

            return (

              <button

                key={option.value}

                type="button"

                role="radio"

                aria-checked={selected}

                onClick={() => onTrackChange(option.value)}

                className={[

                  'bt-focus flex-1 rounded-card border-2 px-3 py-2.5 text-sm font-extrabold transition',

                  selected

                    ? 'border-ink bg-ink text-white'

                    : 'border-paper-line bg-paper-card text-ink-muted hover:border-ink/30',

                ].join(' ')}

              >

                {option.label}

                <span

                  className={`block text-[10px] font-semibold ${selected ? 'text-white/70' : 'text-ink-faint'}`}

                >

                  {option.hint}

                </span>

              </button>

            );

          })}

        </div>

      </fieldset>



      <fieldset>

        <legend className="flex w-full items-baseline justify-between">

          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">

            Finishers to win

          </span>

          <span className="text-[11px] font-semibold text-ink-faint">Per team</span>

        </legend>

        <p className="mt-1 text-xs font-semibold text-ink-faint">

          Auto uses half of the largest team when the race starts.

        </p>

        <div className="mt-2 flex flex-wrap gap-2">

          <button

            type="button"

            aria-pressed={autoFinishers}

            onClick={() => onFinishersChange(undefined)}

            className={[

              'bt-focus rounded-card border-2 px-3 py-2.5 text-sm font-extrabold transition',

              autoFinishers

                ? 'border-ink bg-ink text-white'

                : 'border-paper-line bg-paper-card text-ink-muted hover:border-ink/30',

            ].join(' ')}

          >

            Auto

          </button>

        </div>

        {!autoFinishers ? (

          <div className="mt-3 flex items-center gap-2">

            <FinishersStepButton

              label="Fewer finishers required"

              onClick={() =>

                onFinishersChange(Math.max(1, (finishersRequiredPerTeam ?? 1) - 1))

              }

            >

              &minus;

            </FinishersStepButton>

            <output className="tabular flex-1 rounded-card border-2 border-paper-line bg-paper-card py-2.5 text-center font-display text-lg font-extrabold text-ink">

              {finishersRequiredPerTeam}{' '}

              <span className="text-xs font-bold text-ink-faint">finishers</span>

            </output>

            <FinishersStepButton

              label="More finishers required"

              onClick={() =>

                onFinishersChange(

                  Math.min(FINISHERS_MAX, (finishersRequiredPerTeam ?? 1) + 1),

                )

              }

            >

              +

            </FinishersStepButton>

          </div>

        ) : null}

        {!autoFinishers ? (

          <button

            type="button"

            onClick={() => onFinishersChange(undefined)}

            className="bt-focus mt-2 text-xs font-bold text-ink-muted underline"

          >

            Reset to auto

          </button>

        ) : (

          <button

            type="button"

            onClick={() => onFinishersChange(1)}

            className="bt-focus mt-2 text-xs font-bold text-ink-muted underline"

          >

            Set manually

          </button>

        )}

      </fieldset>

    </div>

  );

}



function FinishersStepButton({

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


