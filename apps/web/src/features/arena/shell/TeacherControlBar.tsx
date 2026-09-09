import { formatRoomCode, type HostToken } from '@braintug/shared';
import { useConnection, usePlayers, useRoomCode, useStatus } from '../../../store/selectors';
import { request } from '../../../realtime/socket';

export type TeacherControlBarProps = {
  /**
   * Present only when this display was opened with host credentials. Without it
   * the bar renders as a read-only status strip, because a classroom TV left on
   * a desk must not be able to end the game.
   */
  hostToken: HostToken | null;
  audioEnabled: boolean;
  onToggleAudio: () => void;
};

const CONNECTION_LABEL: Record<string, string> = {
  connected: 'Classroom sync active',
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  disconnected: 'Disconnected',
};

/** The bottom strip from the reference: room code, sync status and controls. */
export function TeacherControlBar({
  hostToken,
  audioEnabled,
  onToggleAudio,
}: TeacherControlBarProps) {
  const roomCode = useRoomCode();
  const status = useStatus();
  const connection = useConnection();
  const players = usePlayers();
  const connected = players.filter((p) => p.connected).length;

  const act = (event: 'start_game' | 'pause_game' | 'resume_game' | 'skip_question' | 'end_game') => {
    if (!hostToken) return;
    void request(event, { hostToken }).catch(() => {
      // Ack failures already surface through `game_error`; nothing to do here.
    });
  };

  const canControl = hostToken !== null;
  const live = status === 'active' || status === 'paused';

  return (
    <footer className="bt-panel flex h-[72px] items-center gap-3 px-4">
      <div className="flex items-center gap-2.5">
        <div className="rounded-card bg-ink px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">room</p>
          <p className="tabular font-display text-lg font-extrabold leading-none text-white">
            {roomCode ? formatRoomCode(roomCode) : '------'}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-ink">
            <span
              className={`h-2 w-2 rounded-full ${
                connection === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {CONNECTION_LABEL[connection] ?? connection}
          </p>
          <p className="text-[11px] font-semibold text-ink-muted">
            {connected} {connected === 1 ? 'device' : 'devices'} connected
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {canControl && status === 'lobby' && (
          <ControlButton onClick={() => act('start_game')} tone="primary">
            Start match
          </ControlButton>
        )}

        {canControl && live && (
          <>
            <ControlButton
              onClick={() => act(status === 'paused' ? 'resume_game' : 'pause_game')}
            >
              {status === 'paused' ? 'Resume match' : 'Pause match'}
            </ControlButton>
            <ControlButton onClick={() => act('skip_question')}>Skip question</ControlButton>
          </>
        )}

        <ControlButton onClick={onToggleAudio}>
          Audio {audioEnabled ? 'on' : 'off'}
        </ControlButton>

        {canControl && status !== 'finished' && (
          <ControlButton onClick={() => act('end_game')} tone="danger">
            End game
          </ControlButton>
        )}

        {!canControl && (
          <p className="rounded-chip border border-paper-line bg-paper-sunk px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
            Display only
          </p>
        )}
      </div>
    </footer>
  );
}

function ControlButton({
  children,
  onClick,
  tone = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger';
}) {
  const tones = {
    default: 'bg-paper-sunk text-ink hover:bg-paper-line border-paper-line',
    primary: 'bg-blueteam-600 text-white hover:bg-blueteam-700 border-blueteam-700',
    danger: 'bg-redteam-600 text-white hover:bg-redteam-700 border-redteam-700',
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`bt-focus rounded-chip border px-3.5 py-2 text-[12px] font-extrabold uppercase tracking-wide transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
