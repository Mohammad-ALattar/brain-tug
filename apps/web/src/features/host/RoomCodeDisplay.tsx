import { useState } from 'react';
import type { HostToken, RoomCode } from '@mtow/shared';
import { formatRoomCode } from '@mtow/shared';

export type RoomCodeDisplayProps = {
  roomCode: RoomCode;
  hostToken: HostToken;
};

/**
 * The join instructions, sized to be legible from the back of a classroom in
 * case the teacher mirrors this screen instead of opening the arena display.
 */
export function RoomCodeDisplay({ roomCode, hostToken }: RoomCodeDisplayProps) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const joinUrl = `${origin}/play/${roomCode}`;
  // The arena link carries the host token so the classroom display doubles as a
  // control surface. It is never rendered as visible text.
  const arenaUrl = `${origin}/arena/${roomCode}?host=${hostToken}`;

  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused; the URL is on screen to read out.
    }
  };

  return (
    <section className="mtow-panel px-5 py-5 text-center">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        Students join at {origin.replace(/^https?:\/\//, '')}/play
      </p>

      <p className="tabular mt-2 font-display text-[56px] font-extrabold leading-none tracking-[0.08em] text-ink">
        {formatRoomCode(roomCode)}
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="mtow-focus rounded-chip border-2 border-paper-line bg-paper-card px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-ink transition hover:border-ink/30"
        >
          {copied ? 'Link copied' : 'Copy join link'}
        </button>
        <a
          href={arenaUrl}
          target="_blank"
          rel="noreferrer"
          className="mtow-focus rounded-chip border-2 border-blueteam-600 bg-blueteam-600 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-blueteam-700"
        >
          Open classroom display
        </a>
      </div>

      <p aria-live="polite" className="sr-only">
        {copied ? 'Join link copied to the clipboard.' : ''}
      </p>
    </section>
  );
}
