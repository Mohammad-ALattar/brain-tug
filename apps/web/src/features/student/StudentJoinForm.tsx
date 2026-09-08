import { useId, useState } from 'react';
import type { TeamId } from '@mtow/shared';
import { TEAM_THEME } from '../../design/teamTheme';

export type JoinRequest = {
  roomCode: string;
  name: string;
  /** Omitted lets the server balance the teams, which is the default. */
  teamId?: TeamId;
};

export type StudentJoinFormProps = {
  initialRoomCode?: string;
  initialName?: string;
  error: string | null;
  busy: boolean;
  onJoin: (request: JoinRequest) => void;
};

/**
 * Join by room code.
 *
 * Mobile-first and deliberately two fields long: this is the screen thirty
 * children fill in at once at the start of a lesson, so anything optional is
 * either prefilled or left to the server.
 */
export function StudentJoinForm({
  initialRoomCode = '',
  initialName = '',
  error,
  busy,
  onJoin,
}: StudentJoinFormProps) {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [name, setName] = useState(initialName);
  const [teamId, setTeamId] = useState<TeamId | 'auto'>('auto');

  const codeId = useId();
  const nameId = useId();
  const ready = roomCode.trim().length >= 3 && name.trim().length >= 1;

  return (
    <main className="flex min-h-full flex-col justify-center bg-paper px-5 py-8">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-center font-display text-3xl font-extrabold text-ink">
          Math Tug of War
        </h1>
        <p className="mt-1 text-center text-sm font-semibold text-ink-muted">
          Enter the code on the board to join your team.
        </p>

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready || busy) return;
            onJoin({
              roomCode: roomCode.trim(),
              name: name.trim(),
              ...(teamId === 'auto' ? {} : { teamId }),
            });
          }}
        >
          <div>
            <label
              htmlFor={codeId}
              className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint"
            >
              Room code
            </label>
            <input
              id={codeId}
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              // The code alphabet is letters and digits, so `characters` gets the
              // right phone keyboard without the autocorrect that `text` invites.
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={12}
              placeholder="ABC-123"
              className="mtow-focus tabular mt-1.5 h-16 w-full rounded-card border-2 border-paper-line bg-paper-card text-center font-display text-3xl font-extrabold uppercase tracking-[0.15em] text-ink placeholder:text-ink-faint/50"
            />
          </div>

          <div>
            <label
              htmlFor={nameId}
              className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint"
            >
              Your name
            </label>
            <input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="given-name"
              maxLength={20}
              placeholder="e.g. Sam"
              className="mtow-focus mt-1.5 h-14 w-full rounded-card border-2 border-paper-line bg-paper-card px-4 font-display text-xl font-bold text-ink placeholder:text-ink-faint/50"
            />
          </div>

          <fieldset>
            <legend className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
              Team
            </legend>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(['auto', 'blue', 'red'] as const).map((option) => {
                const selected = teamId === option;
                const label =
                  option === 'auto' ? 'Auto' : option === 'blue' ? 'Blue' : 'Red';
                const selectedClass =
                  option === 'auto'
                    ? 'border-ink bg-ink text-white'
                    : `${TEAM_THEME[option].solid} border-transparent text-white`;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTeamId(option)}
                    className={[
                      'mtow-focus h-12 touch-manipulation rounded-card border-2 text-sm font-extrabold transition',
                      selected
                        ? selectedClass
                        : 'border-paper-line bg-paper-card text-ink-muted',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs font-semibold text-ink-faint">
              Auto puts you on the smaller team.
            </p>
          </fieldset>

          {error ? (
            <p role="alert" className="rounded-card border-2 border-redteam-300 bg-redteam-50 px-4 py-3 text-center text-sm font-bold text-redteam-900">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!ready || busy}
            className="mtow-focus h-16 touch-manipulation rounded-card bg-ink font-display text-xl font-extrabold text-white shadow-key transition active:translate-y-px disabled:opacity-30"
          >
            {busy ? 'Joining\u2026' : 'Join the game'}
          </button>
        </form>
      </div>
    </main>
  );
}
