import { useState, type ReactNode } from 'react';
import type { HostToken } from '@mtow/shared';
import { Chip } from '../../components/Chip';
import { request } from '../../realtime/socket';
import { useGameStore } from '../../store/gameStore';
import { usePlayers, useStatus } from '../../store/selectors';

export type TeacherControlsProps = {
  hostToken: HostToken;
};

type HostCommand = 'start_game' | 'pause_game' | 'resume_game' | 'skip_question' | 'end_game';

/**
 * The teacher's live control panel.
 *
 * Every button is a server command carrying the host token; nothing here mutates
 * local state optimistically, so what the teacher sees is always what the game
 * actually did. Failures surface in the store's error slot rather than silently.
 */
export function TeacherControls({ hostToken }: TeacherControlsProps) {
  const status = useStatus();
  const players = usePlayers();
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const act = (command: HostCommand): void => {
    void request(command, { hostToken }).catch((error: Error) => {
      useGameStore.getState().setError(error.message);
    });
  };

  const live = status === 'active' || status === 'paused';
  const bothTeamsSeated =
    players.some((p) => p.teamId === 'blue') && players.some((p) => p.teamId === 'red');

  return (
    <section className="mtow-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
          Controls
        </h2>
        <StatusChip />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {status === 'lobby' ? (
          <>
            <Action tone="primary" disabled={!bothTeamsSeated} onClick={() => act('start_game')}>
              Start match
            </Action>
            {!bothTeamsSeated ? (
              <p className="text-center text-xs font-semibold text-ink-faint">
                Both teams need at least one player.
              </p>
            ) : null}
          </>
        ) : null}

        {status === 'countdown' ? (
          <p className="py-3 text-center text-sm font-bold text-ink-muted">
            Counting the class in&hellip;
          </p>
        ) : null}

        {live ? (
          <div className="grid grid-cols-2 gap-2">
            <Action
              tone="primary"
              onClick={() => act(status === 'paused' ? 'resume_game' : 'pause_game')}
            >
              {status === 'paused' ? 'Resume' : 'Pause'}
            </Action>
            <Action onClick={() => act('skip_question')}>Skip question</Action>
          </div>
        ) : null}

        {status !== 'finished' ? (
          confirmingEnd ? (
            <div className="rounded-card border-2 border-redteam-200 bg-redteam-50 p-2.5">
              <p className="text-center text-xs font-bold text-redteam-900">
                End the match now and show the results?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Action
                  tone="danger"
                  onClick={() => {
                    setConfirmingEnd(false);
                    act('end_game');
                  }}
                >
                  Yes, end it
                </Action>
                <Action onClick={() => setConfirmingEnd(false)}>Keep playing</Action>
              </div>
            </div>
          ) : (
            // Confirmed rather than immediate: ending is irreversible and this
            // button sits next to Pause on a tablet.
            <Action tone="quiet" onClick={() => setConfirmingEnd(true)}>
              End match
            </Action>
          )
        ) : null}
      </div>
    </section>
  );
}

function StatusChip() {
  const status = useStatus();
  const tone = status === 'active' ? 'good' : status === 'paused' ? 'warn' : 'neutral';
  const label =
    status === 'lobby'
      ? 'In lobby'
      : status === 'countdown'
        ? 'Starting'
        : status === 'active'
          ? 'Live'
          : status === 'paused'
            ? 'Paused'
            : 'Finished';
  return <Chip tone={tone}>{label}</Chip>;
}

function Action({
  children,
  onClick,
  tone = 'default',
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger' | 'quiet';
  disabled?: boolean;
}) {
  const tones = {
    default: 'border-paper-line bg-paper-sunk text-ink hover:bg-paper-line',
    primary: 'border-blueteam-700 bg-blueteam-600 text-white hover:bg-blueteam-700',
    danger: 'border-redteam-700 bg-redteam-600 text-white hover:bg-redteam-700',
    quiet: 'border-paper-line bg-paper-card text-ink-muted hover:text-redteam-700',
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mtow-focus h-12 rounded-card border-2 text-sm font-extrabold uppercase tracking-wide transition active:translate-y-px disabled:opacity-30 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
