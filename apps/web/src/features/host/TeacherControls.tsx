import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { HostToken } from '@braintug/shared';
import { Chip } from '../../components/Chip';
import { request } from '../../realtime/socket';
import { useGameStore } from '../../store/gameStore';
import { usePlayers, useStatus } from '../../store/selectors';

export type TeacherControlsProps = {
  hostToken: HostToken;
};

type HostCommand = 'start_game' | 'pause_game' | 'resume_game' | 'skip_question' | 'end_game';

export function TeacherControls({ hostToken }: TeacherControlsProps) {
  const { t } = useTranslation(['host', 'game']);
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
    <section className="bt-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
          {t('host:controls.title')}
        </h2>
        <StatusChip />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {status === 'lobby' ? (
          <>
            <Action tone="primary" disabled={!bothTeamsSeated} onClick={() => act('start_game')}>
              {t('host:controls.startMatch')}
            </Action>
            {!bothTeamsSeated ? (
              <p className="text-center text-xs font-semibold text-ink-faint">
                {t('host:controls.needBothTeams')}
              </p>
            ) : null}
          </>
        ) : null}

        {status === 'countdown' ? (
          <p className="py-3 text-center text-sm font-bold text-ink-muted">
            {t('host:controls.countingIn')}
          </p>
        ) : null}

        {live ? (
          <div className="grid grid-cols-2 gap-2">
            <Action
              tone="primary"
              onClick={() => act(status === 'paused' ? 'resume_game' : 'pause_game')}
            >
              {status === 'paused' ? t('host:controls.resume') : t('host:controls.pause')}
            </Action>
            <Action onClick={() => act('skip_question')}>{t('host:controls.skipQuestion')}</Action>
          </div>
        ) : null}

        {status !== 'finished' ? (
          confirmingEnd ? (
            <div className="rounded-card border-2 border-redteam-200 bg-redteam-50 p-2.5">
              <p className="text-center text-xs font-bold text-redteam-900">
                {t('host:controls.endConfirm')}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Action
                  tone="danger"
                  onClick={() => {
                    setConfirmingEnd(false);
                    act('end_game');
                  }}
                >
                  {t('host:controls.endYes')}
                </Action>
                <Action onClick={() => setConfirmingEnd(false)}>
                  {t('host:controls.keepPlaying')}
                </Action>
              </div>
            </div>
          ) : (
            <Action tone="quiet" onClick={() => setConfirmingEnd(true)}>
              {t('host:controls.endMatch')}
            </Action>
          )
        ) : null}
      </div>
    </section>
  );
}

function StatusChip() {
  const { t } = useTranslation('game');
  const status = useStatus();
  const tone = status === 'active' ? 'good' : status === 'paused' ? 'warn' : 'neutral';
  const label = t(`status.${status}`);
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
      className={`bt-focus h-12 rounded-card border-2 text-sm font-extrabold uppercase tracking-wide transition active:translate-y-px disabled:opacity-30 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
