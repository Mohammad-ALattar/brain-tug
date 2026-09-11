import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HostToken, RoomCode } from '@braintug/shared';
import { formatRoomCode } from '@braintug/shared';

export type RoomCodeDisplayProps = {
  roomCode: RoomCode;
  hostToken: HostToken;
};

export function RoomCodeDisplay({ roomCode, hostToken }: RoomCodeDisplayProps) {
  const { t } = useTranslation('host');
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const joinUrl = `${origin}/play/${roomCode}`;
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

  const hostLabel = origin.replace(/^https?:\/\//, '');

  return (
    <section className="bt-panel px-5 py-5 text-center">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {t('roomCode.joinAt', { host: hostLabel })}
      </p>

      <p className="tabular mt-2 font-display text-[56px] font-extrabold leading-none tracking-[0.08em] text-ink">
        {formatRoomCode(roomCode)}
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="bt-focus rounded-chip border-2 border-paper-line bg-paper-card px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-ink transition hover:border-ink/30"
        >
          {copied ? t('roomCode.linkCopied') : t('roomCode.copyLink')}
        </button>
        <a
          href={arenaUrl}
          target="_blank"
          rel="noreferrer"
          className="bt-focus rounded-chip border-2 border-blueteam-600 bg-blueteam-600 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-blueteam-700"
        >
          {t('roomCode.openArena')}
        </a>
      </div>

      <p aria-live="polite" className="sr-only">
        {copied ? t('roomCode.copiedAnnouncement') : ''}
      </p>
    </section>
  );
}
