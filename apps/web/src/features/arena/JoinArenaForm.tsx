import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { normaliseRoomCode } from '@braintug/shared';

/** Shown when the display is opened without a room code in the URL. */
export function JoinArenaForm({ error }: { error: string | null }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const normalised = normaliseRoomCode(code);
    if (normalised.length >= 3) navigate(`/arena/${normalised}`);
  };

  return (
    <div className="grid h-full place-items-center bg-ink p-8">
      <form onSubmit={submit} className="w-full max-w-md text-center">
        <h1 className="font-display text-3xl font-extrabold text-white">Classroom display</h1>
        <p className="mt-2 text-white/60">
          Enter the room code shown on the teacher&rsquo;s dashboard.
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABC-123"
          autoFocus
          aria-label="Room code"
          className="tabular bt-focus mt-6 w-full rounded-card border-2 border-white/20 bg-white/10 px-4 py-4 text-center font-display text-3xl font-extrabold uppercase tracking-[0.2em] text-white placeholder:text-white/30"
        />

        {error && <p className="mt-3 text-sm font-bold text-redteam-300">{error}</p>}

        <button
          type="submit"
          className="bt-focus mt-4 w-full rounded-chip bg-blueteam-600 py-3.5 font-display text-lg font-extrabold uppercase tracking-wide text-white hover:bg-blueteam-500"
        >
          Open display
        </button>
      </form>
    </div>
  );
}
